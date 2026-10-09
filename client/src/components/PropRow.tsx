import { useMemo, useState } from "react";
import type { PropRow as PropRowType } from "@/lib/types";
import { formatAmerican } from "@/lib/odds";
import { useSlip } from "@/hooks/use-slip";
import { cn } from "@/lib/utils";
import type { SlipLeg } from "@/lib/types";
import { Slider } from "@/components/ui/slider";

function PriceButton({
  label,
  info,
  disabled,
  active,
  onClick,
}: {
  label: string;
  info: { price: number; sportsbook: string } | null;
  disabled?: boolean;
  active: boolean;
  onClick: () => void;
}) {
  if (!info) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center rounded-md border border-dashed border-border py-2 text-xs text-muted-foreground">
        —
      </div>
    );
  }
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      data-testid={`button-prop-${label.toLowerCase()}`}
      className={cn(
        "flex flex-1 flex-col items-center justify-center gap-0.5 rounded-md border py-2 transition-colors",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-secondary/60 hover:border-primary/50"
      )}
    >
      <span className="text-[10px] font-medium uppercase tracking-wide opacity-80">{label}</span>
      <span className="font-mono text-sm font-semibold">{formatAmerican(info.price)}</span>
      <span className="text-[9px] opacity-70">{info.sportsbook}</span>
    </button>
  );
}

export function PropRow({
  row,
  fixtureId,
  gameLabel,
}: {
  row: PropRowType;
  fixtureId: string;
  gameLabel: string;
}) {
  const { toggleLeg, hasLeg } = useSlip();

  // Alt lines: every distinct point value OpticOdds offers, sorted ascending.
  // Only meaningful for over/under markets with more than one point value —
  // flat markets (anytime TD scorer, etc.) and single-line props skip the slider.
  const ladder = row.lines && row.lines.length > 1 ? row.lines.filter((l) => l.points != null) : [];
  const hasSlider = ladder.length > 1 && !row.flat;

  const mainIndex = useMemo(() => {
    if (!hasSlider) return 0;
    const idx = ladder.findIndex((l) => l.points === row.points);
    return idx >= 0 ? idx : 0;
  }, [ladder, hasSlider, row.points]);

  const [index, setIndex] = useState(mainIndex);
  const clampedIndex = Math.min(index, Math.max(0, ladder.length - 1));
  const selected = hasSlider ? ladder[clampedIndex] : row;
  const isMainLine = hasSlider && ladder[clampedIndex]?.points === row.points;

  function legFor(kind: "over" | "under" | "flat"): SlipLeg | null {
    const info = kind === "over" ? selected.over : kind === "under" ? selected.under : row.flat;
    if (!info) return null;
    const label =
      kind === "flat"
        ? row.player
        : `${row.player} ${kind === "over" ? "Over" : "Under"} ${selected.points}`;
    return {
      legId: info.oddsId,
      fixtureId,
      gameLabel,
      market: row.marketName,
      name: label,
      playerOrSelection: row.player,
      price: info.price,
      sportsbook: info.sportsbook,
    };
  }

  const overLeg = legFor("over");
  const underLeg = legFor("under");
  const flatLeg = legFor("flat");

  return (
    <div className="flex flex-col gap-1.5 border-b border-border/60 py-2.5 last:border-none">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{row.player}</p>
          {selected.points != null && (
            <p className="text-xs text-muted-foreground font-mono">
              Line {selected.points}
              {hasSlider && !isMainLine && (
                <span className="ml-1.5 rounded bg-secondary px-1 py-0.5 text-[9px] uppercase tracking-wide text-muted-foreground/80">
                  alt
                </span>
              )}
            </p>
          )}
        </div>
        <div className="flex w-[168px] shrink-0 gap-1.5 sm:w-[240px] sm:gap-2">
          {row.flat ? (
            <PriceButton
              label="Pick"
              info={flatLeg ? { price: flatLeg.price, sportsbook: flatLeg.sportsbook } : null}
              active={!!flatLeg && hasLeg(flatLeg.legId)}
              onClick={() => flatLeg && toggleLeg(flatLeg)}
            />
          ) : (
            <>
              <PriceButton
                label="Over"
                info={overLeg ? { price: overLeg.price, sportsbook: overLeg.sportsbook } : null}
                active={!!overLeg && hasLeg(overLeg.legId)}
                onClick={() => overLeg && toggleLeg(overLeg)}
              />
              <PriceButton
                label="Under"
                info={underLeg ? { price: underLeg.price, sportsbook: underLeg.sportsbook } : null}
                active={!!underLeg && hasLeg(underLeg.legId)}
                onClick={() => underLeg && toggleLeg(underLeg)}
              />
            </>
          )}
        </div>
      </div>
      {hasSlider && (
        <div className="flex items-center gap-2.5 pl-0.5 pr-1">
          <span className="w-9 shrink-0 text-right font-mono text-[10px] text-muted-foreground">
            {ladder[0].points}
          </span>
          <Slider
            min={0}
            max={ladder.length - 1}
            step={1}
            value={[clampedIndex]}
            onValueChange={(v) => setIndex(v[0])}
            className="flex-1"
            data-testid={`slider-prop-${row.market}-${row.player.replace(/\s+/g, "-").toLowerCase()}`}
          />
          <span className="w-9 shrink-0 font-mono text-[10px] text-muted-foreground">
            {ladder[ladder.length - 1].points}
          </span>
        </div>
      )}
    </div>
  );
}
