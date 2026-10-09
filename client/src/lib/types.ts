export interface ScheduleGame {
  id: string;
  startDate: string;
  status: string;
  week: number;
  homeTeam: string;
  awayTeam: string;
  homeAbbr?: string;
  awayAbbr?: string;
  homeLogo?: string;
  awayLogo?: string;
  homeRecord?: string;
  awayRecord?: string;
  venue?: string;
  broadcast?: string;
  hasOdds?: boolean;
}

export interface GameDetail extends Omit<ScheduleGame, "hasOdds"> {
  venueLocation?: { city?: string; state?: string };
}

export interface PriceInfo {
  price: number;
  sportsbook: string;
  oddsId: string;
  timestamp: number;
}

export interface LineOption {
  points: number | null;
  over: PriceInfo | null;
  under: PriceInfo | null;
  flat: PriceInfo | null;
}

export interface PropRow {
  player: string;
  market: string;
  marketName: string;
  points: number | null;
  over: PriceInfo | null;
  under: PriceInfo | null;
  flat: PriceInfo | null;
  // Every point value OpticOdds offers for this player/market (main line +
  // every alternate), sorted ascending. Powers the line-adjustment slider;
  // length <= 1 means no alt lines exist, so the UI shows plain buttons.
  lines: LineOption[];
}

export interface PropsResponse {
  categories: Record<string, PropRow[]>;
  freshest: number | null;
}

export interface MainLineRow {
  id: string;
  sportsbook: string;
  market: string;
  market_id: string;
  name: string;
  price: number;
  points: number | null;
  selection: string;
  selection_line: string | null;
  timestamp: number;
}

export interface MainLinesResponse {
  lines: MainLineRow[];
  freshest: number | null;
}

export interface SlipLeg {
  legId: string; // unique client-side id (oddsId)
  fixtureId: string;
  gameLabel: string; // "AWAY @ HOME"
  market: string; // display market name, used for SGP pricing
  name: string; // selection display name, e.g. "Josh Allen Over 249.5"
  playerOrSelection: string;
  price: number;
  sportsbook: string;
}

export interface ParlayPriceGroup {
  fixtureId: string;
  legs: SlipLeg[];
  method: "sgp" | "naive_fallback" | "single";
  price: number;
}

export interface ParlayPriceResponse {
  combinedDecimal: number;
  combinedAmerican: number;
  groups: ParlayPriceGroup[];
}
