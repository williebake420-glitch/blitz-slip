import { useMemo, useState } from "react";
import type { PropsResponse } from "@/lib/types";
import { PropRow } from "@/components/PropRow";
import { formatUpdatedAgo } from "@/lib/odds";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

export function PropsBrowser({
  data,
  isLoading,
  fixtureId,
  gameLabel,
}: {
  data: PropsResponse | undefined;
  isLoading: boolean;
  fixtureId: string;
  gameLabel: string;
}) {
  const categories = useMemo(() => Object.keys(data?.categories ?? {}), [data]);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const active = activeCategory ?? categories[0] ?? null;

  const rows = useMemo(() => {
    if (!active || !data) return [];
    const list = data.categories[active] ?? [];
    if (!query.trim()) return list;
    const q = query.trim().toLowerCase();
    return list.filter((r) => r.player.toLowerCase().includes(q));
  }, [active, data, query]);

  const groupedRows = useMemo(() => {
    const groups: { marketName: string; rows: typeof rows }[] = [];
    for (const row of rows) {
      const last = groups[groups.length - 1];
      if (last && last.marketName === row.marketName) {
        last.rows.push(row);
      } else {
        groups.push({ marketName: row.marketName, rows: [row] });
      }
    }
    return groups;
  }, [rows]);

  if (isLoading) {
    return <div className="py-10 text-center text-sm text-muted-foreground">Loading player props…</div>;
  }

  if (categories.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
        Player props aren't posted for this game yet. Sportsbooks typically release full prop boards a few days
        before kickoff — check back closer to game day.
      </div>
    );
  }

  return (
    <div>
      <div className="mb-3 flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            data-testid={`button-category-${cat.toLowerCase().replace(/\s+/g, "-")}`}
            className={cn(
              "shrink-0 rounded-md border px-3 py-1.5 text-sm transition-colors",
              active === cat
                ? "border-primary bg-primary text-primary-foreground font-semibold"
                : "border-border bg-card hover:border-primary/40"
            )}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="mb-3 relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filter by player name…"
          className="pl-8"
          data-testid="input-player-search"
        />
      </div>

      <div className="rounded-lg border border-card-border bg-card px-4">
        {rows.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No players match your search.</p>
        ) : (
          groupedRows.map((group) => (
            <div key={group.marketName}>
              <p className="sticky top-0 -mx-4 border-b border-border/60 bg-card px-4 py-2 text-xs font-semibold uppercase tracking-wide text-primary">
                {group.marketName}
              </p>
              {group.rows.map((row, i) => (
                <PropRow
                  key={`${row.market}-${row.player}-${row.points}-${i}`}
                  row={row}
                  fixtureId={fixtureId}
                  gameLabel={gameLabel}
                />
              ))}
            </div>
          ))
        )}
      </div>
      <p className="mt-2 text-[11px] text-muted-foreground">
        Best price shown per selection across DraftKings, FanDuel, BetMGM · updated {formatUpdatedAgo(data?.freshest ?? null)}
      </p>
    </div>
  );
}
