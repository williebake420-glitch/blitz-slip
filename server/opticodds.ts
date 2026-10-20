import { spawn } from "node:child_process";

// ---- Low level connector call ----

// Two ways to reach OpticOdds:
//  1. Outside Perplexity (Polsia, Vercel, any Node host): set OPTICODDS_API_KEY
//     and the app calls the OpticOdds REST API directly.
//  2. Inside Perplexity Computer: no key needed; it uses the built-in connector.
const OPTICODDS_API_KEY = process.env.OPTICODDS_API_KEY;
const OPTICODDS_BASE_URL = process.env.OPTICODDS_BASE_URL || "https://api.opticodds.com/api/v3";

async function callDirect(path: string, params?: Record<string, any>, method: "GET" | "POST" = "GET", json_body?: any): Promise<any> {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params ?? {})) {
    if (v == null) continue;
    if (Array.isArray(v)) v.forEach((item) => qs.append(k, String(item)));
    else qs.append(k, String(v));
  }
  const url = `${OPTICODDS_BASE_URL}${path}${qs.toString() ? `?${qs}` : ""}`;
  const res = await fetch(url, {
    method,
    headers: {
      "X-Api-Key": OPTICODDS_API_KEY as string,
      ...(json_body ? { "Content-Type": "application/json" } : {}),
    },
    body: json_body ? JSON.stringify(json_body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`OpticOdds ${res.status}: ${text.slice(0, 300)}`);
  // Match the connector's response shape so the rest of the code is unchanged.
  return { result: { data: JSON.parse(text) } };
}

function callConnector(path: string, params?: Record<string, any>, method: "GET" | "POST" = "GET", json_body?: any): Promise<any> {
  if (OPTICODDS_API_KEY) return callDirect(path, params, method, json_body);
  return new Promise((resolve, reject) => {
    const payload: any = { path, method };
    if (params) payload.params = params;
    if (json_body) payload.json_body = json_body;
    const proc = spawn("pplx", ["connector", "call", "opticodds", "opticodds", "--input", JSON.stringify(payload)]);
    let stdout = "";
    let stderr = "";
    proc.stdout.on("data", (d) => (stdout += d));
    proc.stderr.on("data", (d) => (stderr += d));
    proc.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(stderr || `pplx connector exited with code ${code}`));
        return;
      }
      try {
        resolve(JSON.parse(stdout));
      } catch (e) {
        reject(e);
      }
    });
  });
}

// ---- Simple in-memory TTL cache ----

const cache = new Map<string, { at: number; data: any }>();

async function cached<T>(key: string, ttlMs: number, fn: () => Promise<T>): Promise<T> {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < ttlMs) return hit.data as T;
  const data = await fn();
  cache.set(key, { at: Date.now(), data });
  return data;
}

// ---- Market catalog ----

export const PROP_CATEGORIES: Record<string, { id: string; name: string }[]> = {
  Passing: [
    { id: "player_passing_yards", name: "Passing Yards" },
    { id: "player_passing_touchdowns", name: "Passing TDs" },
    { id: "player_passing_completions", name: "Completions" },
    { id: "player_passing_attempts", name: "Attempts" },
    { id: "player_interceptions", name: "Interceptions Thrown" },
    { id: "player_passing_first_downs", name: "Passing First Downs" },
    { id: "player_longest_passing_completion", name: "Longest Completion" },
  ],
  Rushing: [
    { id: "player_rushing_yards", name: "Rushing Yards" },
    { id: "player_rushing_attempts", name: "Rushing Attempts" },
    { id: "player_rushing_touchdowns", name: "Rushing TDs" },
    { id: "player_longest_rush", name: "Longest Rush" },
  ],
  Receiving: [
    { id: "player_receiving_yards", name: "Receiving Yards" },
    { id: "player_receptions", name: "Receptions" },
    { id: "player_receiving_touchdowns", name: "Receiving TDs" },
    { id: "player_receiving_targets", name: "Targets" },
    { id: "player_longest_reception", name: "Longest Reception" },
  ],
  "Combo Yardage": [
    { id: "player_passing_+_rushing_yards", name: "Pass + Rush Yards" },
    { id: "player_rushing_+_receiving_yards", name: "Rush + Rec Yards" },
  ],
  Touchdowns: [
    { id: "player_touchdowns", name: "Total TDs" },
    { id: "anytime_touchdown_scorer", name: "Anytime TD Scorer" },
    { id: "first_touchdown_scorer", name: "First TD Scorer" },
    { id: "last_touchdown_scorer", name: "Last TD Scorer" },
  ],
  Defense: [
    { id: "player_tackles", name: "Tackles" },
    { id: "player_tackles_+_assists", name: "Tackles + Assists" },
    { id: "player_sacks", name: "Sacks" },
    { id: "player_defensive_interceptions", name: "Interceptions (Defense)" },
    { id: "player_deflections", name: "Pass Deflections" },
  ],
  Kicking: [
    { id: "player_field_goals_made", name: "Field Goals Made" },
    { id: "player_kicking_points", name: "Kicking Points" },
    { id: "player_extra_points_made", name: "Extra Points Made" },
  ],
  "Fantasy Score": [
    { id: "player_fantasy_score_all_", name: "Fantasy Score" },
    { id: "player_fantasy_score_draftkings_", name: "Fantasy Score (DraftKings)" },
    { id: "player_fantasy_score_prizepicks_", name: "Fantasy Score (PrizePicks)" },
    { id: "player_fantasy_score_underdog_", name: "Fantasy Score (Underdog)" },
  ],
};

export const ALL_PROP_MARKET_IDS = Object.values(PROP_CATEGORIES).flat().map((m) => m.id);

import scheduleFallback from "./schedule_full.json";

// Live schedule with a static fallback: OpticOdds keeps team records and game
// statuses current on /fixtures, so refresh the slate from there (1h TTL) and
// fall back to the bundled snapshot if the connector is unavailable.
export async function getSchedule(): Promise<any[]> {
  return cached("schedule", 3600_000, async () => {
    try {
      const pages: any[] = [];
      for (let page = 1; page <= 10; page++) {
        const resp = await callConnector("/fixtures", {
          sport: "football",
          league: "nfl",
          season_year: "2026",
          page,
        });
        const result = resp.result ?? resp;
        const data = result.data?.data ?? result.data ?? [];
        if (!Array.isArray(data) || data.length === 0) break;
        pages.push(...data);
      }
      const seen = new Map<string, any>();
      for (const g of pages) seen.set(g.id, g);
      let games = Array.from(seen.values()).filter((g: any) => g.season_type === "Regular Season");
      if (games.length < 200) throw new Error("schedule fetch incomplete");
      // OpticOdds leaves some late-season Saturday games at season_week 0; infer
      // their week from nearby games so every slate tab stays populated.
      const withTime = games
        .map((g: any) => ({ g, t: new Date(g.start_date).getTime() }))
        .sort((a, b) => a.t - b.t);
      for (const { g } of withTime) {
        if (Number(g.season_week) === 0) {
          const gt = new Date(g.start_date).getTime();
          const counts = new Map<number, number>();
          for (const n of withTime) {
            if (Math.abs(n.t - gt) <= 4 * 86400_000 && Number(n.g.season_week) > 0) {
              const w = Number(n.g.season_week);
              counts.set(w, (counts.get(w) ?? 0) + 1);
            }
          }
          let best = 0;
          let bestCount = 0;
          for (const [w, c] of Array.from(counts.entries())) {
            if (c > bestCount) {
              best = w;
              bestCount = c;
            }
          }
          if (best > 0) g.season_week = String(best);
        }
      }
      games = games.filter((g: any) => Number(g.season_week) > 0);
      for (const g of games) g.computed_week = Number(g.season_week);
      return games;
    } catch {
      return JSON.parse(JSON.stringify(scheduleFallback)) as any[];
    }
  });
}

const MAIN_MARKETS = [
  { id: "moneyline", name: "Moneyline" },
  { id: "point_spread", name: "Point Spread" },
  { id: "total_points", name: "Total Points" },
];

const BOOKS = ["DraftKings", "FanDuel", "BetMGM"];

// ---- Odds fetch + shaping ----

export interface OddsRow {
  id: string;
  sportsbook: string;
  market: string;
  market_id: string;
  name: string;
  price: number;
  points: number | null;
  selection: string;
  normalized_selection: string | null;
  selection_line: string | null;
  player_id: string | null;
  grouping_key: string;
  is_main: boolean | null;
  timestamp: number;
}

async function fetchOdds(fixtureId: string, marketIds: string[]): Promise<{ odds: OddsRow[]; freshest: number | null }> {
  // OpticOdds allows max 5 sportsbooks per call; batch markets in one call (no documented market count cap).
  const resp = await callConnector("/fixtures/odds", {
    fixture_id: fixtureId,
    sportsbook: BOOKS,
    market: marketIds,
  });
  const result = resp.result ?? resp;
  const data = result.data?.data ?? result.data ?? [];
  const fixture = Array.isArray(data) ? data[0] : data;
  // Keep every line OpticOdds returns, main and alternate, so callers that
  // want the full point-value range (e.g. a line-adjustment slider) have it.
  // `bestPricePerSelection` still collapses this down to one main line per
  // side by default; `getGameProps` additionally keeps the full ladder.
  const odds: OddsRow[] = fixture?.odds ?? [];
  let freshest: number | null = null;
  for (const o of odds) {
    if (o.timestamp && (!freshest || o.timestamp > freshest)) freshest = o.timestamp;
  }
  return { odds, freshest };
}

// Collapse raw odds rows (already filtered to is_main) into one row per
// player/team + market + side (over/under/flat). Different books sometimes
// carry a slightly different "main" number for the same player/team (e.g.
// DraftKings Jordan Love passing yards 226.5 vs FanDuel 229.5) — pick the
// point value most books agree on, then take the best price among the
// book(s) quoting that exact number, per side. This yields exactly one row
// (or one over + one under row) per player/team per market.
// With only a few sportsbooks, it's common for every book to quote a
// different "main" number (no true majority) — that's a tie across all
// distinct values. Break ties deterministically by taking the median of the
// tied point values, giving a single consistent consensus line instead of
// showing every disagreeing book as a separate row. Shared by
// bestPricePerSelection (main-line collapse) and buildLadder (alt-line
// slider default position).
function consensusPointKey(rows: OddsRow[]): string {
  const pointCounts = new Map<string, number>();
  for (const r of rows) {
    const k = String(r.points);
    pointCounts.set(k, (pointCounts.get(k) ?? 0) + 1);
  }
  let maxCount = 0;
  for (const c of Array.from(pointCounts.values())) maxCount = Math.max(maxCount, c);
  const tiedKeys = Array.from(pointCounts.entries())
    .filter(([, c]) => c === maxCount)
    .map(([k]) => k);
  if (tiedKeys.length === 1) return tiedKeys[0];
  const numeric = tiedKeys.filter((k) => k !== "null").map(Number).sort((a, b) => a - b);
  return numeric.length > 0 ? String(numeric[Math.floor((numeric.length - 1) / 2)]) : tiedKeys[0];
}

// Picks, per side (over/under/flat), the best cross-book price among `rows`.
function bestPricePerSide(rows: OddsRow[]): { over: OddsRow | null; under: OddsRow | null; flat: OddsRow | null } {
  const bySide = new Map<string, OddsRow[]>();
  for (const r of rows) {
    const sideKey = r.selection_line ?? "";
    if (!bySide.has(sideKey)) bySide.set(sideKey, []);
    bySide.get(sideKey)!.push(r);
  }
  const result: { over: OddsRow | null; under: OddsRow | null; flat: OddsRow | null } = { over: null, under: null, flat: null };
  for (const [sideKey, sideRows] of Array.from(bySide.entries())) {
    // higher American price = better payout for the bettor on both + and - (closer to 0 or larger positive)
    sideRows.sort((a: OddsRow, b: OddsRow) => americanToDecimal(b.price) - americanToDecimal(a.price));
    const best = sideRows[0];
    if (sideKey === "over") result.over = best;
    else if (sideKey === "under") result.under = best;
    else result.flat = best;
  }
  return result;
}

function bestPricePerSelection(odds: OddsRow[]): OddsRow[] {
  // OpticOdds returns every alternate line alongside the primary one (e.g.
  // every half-point spread, every alt passing-yards total). This function
  // produces a single "main" row per side, so start from main lines only;
  // callers that want the full alt-line ladder use buildLadder instead.
  odds = odds.filter((o) => o.is_main !== false);
  // OpticOdds' own grouping_key can be shared across selections for markets
  // without alt lines (e.g. moneyline, anytime TD scorer all use "default"),
  // so fold in the selection name explicitly to avoid merging different
  // players/teams together. Points and selection_line are intentionally left
  // OUT of this outer key so over/under (and cross-book line variants) of the
  // same player/team + market are resolved together below.
  const bySelection = new Map<string, OddsRow[]>();
  for (const o of odds) {
    const key = `${o.market_id}:${o.normalized_selection ?? o.selection}`;
    if (!bySelection.has(key)) bySelection.set(key, []);
    bySelection.get(key)!.push(o);
  }

  const best: OddsRow[] = [];
  for (const rows of Array.from(bySelection.values())) {
    const chosenKey = consensusPointKey(rows);
    const atModalPoint = rows.filter((r) => String(r.points) === chosenKey);
    const perSide = bestPricePerSide(atModalPoint);
    for (const row of [perSide.over, perSide.under, perSide.flat]) {
      if (row) best.push(row);
    }
  }
  return best;
}

export interface LinePriceInfo {
  price: number;
  sportsbook: string;
  oddsId: string;
  timestamp: number;
}

export interface LineOption {
  points: number | null;
  over: LinePriceInfo | null;
  under: LinePriceInfo | null;
  flat: LinePriceInfo | null;
}

function toPriceInfo(row: OddsRow): LinePriceInfo {
  return { price: row.price, sportsbook: row.sportsbook, oddsId: row.id, timestamp: row.timestamp };
}

// Builds the full ladder of every distinct point value OpticOdds returns for
// one player/team + market (main line + every alternate), each with the best
// cross-book price per side, sorted ascending by points. Also returns the
// consensus "main" point (same logic bestPricePerSelection uses) so the UI
// has a sensible default slider position.
function buildLadder(rows: OddsRow[]): { lines: LineOption[]; mainPoints: number | null } {
  const byPoints = new Map<string, OddsRow[]>();
  for (const r of rows) {
    const k = String(r.points);
    if (!byPoints.has(k)) byPoints.set(k, []);
    byPoints.get(k)!.push(r);
  }
  const lines: LineOption[] = [];
  for (const [k, group] of Array.from(byPoints.entries())) {
    const perSide = bestPricePerSide(group);
    lines.push({
      points: k === "null" ? null : Number(k),
      over: perSide.over ? toPriceInfo(perSide.over) : null,
      under: perSide.under ? toPriceInfo(perSide.under) : null,
      flat: perSide.flat ? toPriceInfo(perSide.flat) : null,
    });
  }
  lines.sort((a, b) => (a.points ?? 0) - (b.points ?? 0));

  const mainRows = rows.filter((r) => r.is_main !== false);
  let mainPoints: number | null;
  if (mainRows.length > 0) {
    const key = consensusPointKey(mainRows);
    mainPoints = key === "null" ? null : Number(key);
  } else {
    const numeric = lines.map((l) => l.points).filter((p): p is number => p != null).sort((a, b) => a - b);
    mainPoints = numeric.length > 0 ? numeric[Math.floor((numeric.length - 1) / 2)] : null;
  }
  return { lines, mainPoints };
}

export function americanToDecimal(price: number): number {
  return price > 0 ? 1 + price / 100 : 1 + 100 / -price;
}

export function decimalToAmerican(dec: number): number {
  if (dec >= 2) return Math.round((dec - 1) * 100);
  return Math.round(-100 / (dec - 1));
}

export async function getGameProps(fixtureId: string) {
  return cached(`props:${fixtureId}`, 90_000, async () => {
    const { odds, freshest } = await fetchOdds(fixtureId, ALL_PROP_MARKET_IDS);

    const categories: Record<string, any> = {};
    for (const [catName, markets] of Object.entries(PROP_CATEGORIES)) {
      const marketIdSet = new Set(markets.map((m) => m.id));
      const rowsForCat = odds.filter((o) => marketIdSet.has(o.market_id));
      if (rowsForCat.length === 0) continue;

      // Group every row (main + every alt line) by player/team + market so
      // buildLadder can hand back the full point-value range for a slider,
      // not just the single consensus line.
      const groups = new Map<string, { player: string; market: string; marketName: string; rows: OddsRow[] }>();
      for (const row of rowsForCat) {
        const key = `${row.market_id}:${row.normalized_selection ?? row.selection}`;
        if (!groups.has(key)) {
          groups.set(key, { player: row.selection, market: row.market_id, marketName: row.market, rows: [] });
        }
        groups.get(key)!.rows.push(row);
      }

      const rowsOut: any[] = [];
      for (const g of Array.from(groups.values())) {
        const { lines, mainPoints } = buildLadder(g.rows);
        if (lines.length === 0) continue;
        const mainLine = lines.find((l) => l.points === mainPoints) ?? lines[0];
        rowsOut.push({
          player: g.player,
          market: g.market,
          marketName: g.marketName,
          points: mainLine.points,
          over: mainLine.over,
          under: mainLine.under,
          flat: mainLine.flat,
          // Full ladder of alt lines (sorted ascending by points) for the
          // line-adjustment slider. Length 1 (or points === null) means no
          // alt lines exist for this player/market, so the UI hides the slider.
          lines,
        });
      }
      categories[catName] = rowsOut.sort(
        (a, b) => a.marketName.localeCompare(b.marketName) || a.player.localeCompare(b.player)
      );
    }

    return { categories, freshest };
  });
}

export async function getGameMainLines(fixtureId: string) {
  return cached(`main:${fixtureId}`, 90_000, async () => {
    const { odds, freshest } = await fetchOdds(fixtureId, MAIN_MARKETS.map((m) => m.id));
    const best = bestPricePerSelection(odds);
    return { lines: best, freshest };
  });
}

// ---- Parlay pricing ----

export interface ParlayLegInput {
  fixtureId: string;
  market: string; // market display name, e.g. "Player Passing Yards"
  name: string; // selection display name, e.g. "Josh Allen Over 249.5"
  price: number; // American price at time of adding (fallback / display)
  sportsbook: string;
}

export async function priceParlay(legs: ParlayLegInput[]) {
  // Group legs by fixture
  const byFixture = new Map<string, ParlayLegInput[]>();
  for (const leg of legs) {
    if (!byFixture.has(leg.fixtureId)) byFixture.set(leg.fixtureId, []);
    byFixture.get(leg.fixtureId)!.push(leg);
  }

  let combinedDecimal = 1;
  const groupResults: any[] = [];

  for (const [fixtureId, groupLegs] of Array.from(byFixture.entries())) {
    if (groupLegs.length >= 2) {
      // attempt correlation-adjusted SGP pricing via OpticOdds AI consensus
      try {
        const resp = await callConnector(
          "/parlay/odds",
          undefined,
          "POST",
          {
            sportsbooks: ["OpticOdds AI"],
            entries: groupLegs.map((l) => ({ fixture_id: fixtureId, market: l.market, name: l.name, price_american: l.price })),
          }
        );
        const result = resp.result ?? resp;
        const data = result.data?.data ?? result.data ?? result;
        const aiResult = data["OpticOdds AI"];
        if (aiResult && aiResult.price != null && !aiResult.error) {
          const dec = americanToDecimal(aiResult.price);
          combinedDecimal *= dec;
          groupResults.push({ fixtureId, legs: groupLegs, method: "sgp", price: aiResult.price });
          continue;
        }
        throw new Error(aiResult?.error || "SGP pricing unavailable");
      } catch (e) {
        // fallback: naive multiply for this same-game group, flagged as estimate
        let groupDecimal = 1;
        for (const l of groupLegs as ParlayLegInput[]) groupDecimal *= americanToDecimal(l.price);
        combinedDecimal *= groupDecimal;
        groupResults.push({ fixtureId, legs: groupLegs, method: "naive_fallback", price: decimalToAmerican(groupDecimal) });
        continue;
      }
    } else {
      const l = groupLegs[0];
      const dec = americanToDecimal(l.price);
      combinedDecimal *= dec;
      groupResults.push({ fixtureId, legs: groupLegs, method: "single", price: l.price });
    }
  }

  return {
    combinedDecimal,
    combinedAmerican: decimalToAmerican(combinedDecimal),
    groups: groupResults,
  };
}
