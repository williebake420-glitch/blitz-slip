import type { MainLinesResponse } from "@/lib/types";
import { formatAmerican, formatUpdatedAgo } from "@/lib/odds";
import { useSlip } from "@/hooks/use-slip";
import { cn } from "@/lib/utils";

const MARKET_ORDER = ["moneyline", "point_spread", "total_points"];
const MARKET_LABEL: Record<string, string> = {
  moneyline: "Moneyline",
  point_spread: "Spread",
  total_points: "Total",
};

export function MainLines({
  data,
  fixtureId,
  gameLabel,
  homeAbbr,
  awayAbbr,
}: {
  data: MainLinesResponse | undefined;
  fixtureId: string;
  gameLabel: string;
  homeAbbr?: string;
  awayAbbr?: string;
}) {
  const { toggleLeg, hasLeg } = useSlip();

  if (!data || data.lines.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border px-4 py-4 text-sm text-muted-foreground">
        Main game lines aren't posted yet for this matchup.
      </div>
    );
  }

  const byMarket = new Map<string, typeof data.lines>();
  for (const line of data.lines) {
    if (!byMarket.has(line.market_id)) byMarket.set(line.market_id, [] as any);
    (byMarket.get(line.market_id) as any).push(line);
  }

  return (
    <div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {MARKET_ORDER.filter((m) => byMarket.has(m)).map((marketId) => {
          const rows = byMarket.get(marketId)!;
          return (
            <div key={marketId} className="rounded-lg border border-card-border bg-card p-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {MARKET_LABEL[marketId] ?? marketId}
              </p>
              <div className="flex flex-col gap-1.5">
                {rows.map((row: any) => {
                  const legId = row.id;
                  const label =
                    marketId === "total_points"
                      ? `${row.selection_line === "over" ? "Over" : "Under"} ${row.points}`
                      : row.points != null
                      ? `${row.selection} ${row.points > 0 ? "+" : ""}${row.points}`
                      : row.selection;
                  const active = hasLeg(legId);
                  return (
                    <button
                      key={legId}
                      onClick={() =>
                        toggleLeg({
                          legId,
                          fixtureId,
                          gameLabel,
                          market: row.market,
                          name: label,
                          playerOrSelection: row.selection,
                          price: row.price,
                          sportsbook: row.sportsbook,
                        })
                      }
                      className={cn(
                        "flex items-center justify-between rounded-md border px-2.5 py-1.5 text-sm transition-colors",
                        active
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-secondary/50 hover:border-primary/50"
                      )}
                    >
                      <span className="truncate">{label}</span>
                      <span className="ml-2 shrink-0 font-mono font-semibold">{formatAmerican(row.price)}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      <p className="mt-2 text-[11px] text-muted-foreground">
        Best price shown per selection across DraftKings, FanDuel, BetMGM · updated {formatUpdatedAgo(data.freshest)}
      </p>
    </div>
  );
}
