import { cn } from "@/lib/utils";

export function WeekSelector({
  weeks,
  currentWeek,
  selectedWeek,
  onSelect,
}: {
  weeks: number[];
  currentWeek: number | null;
  selectedWeek: number;
  onSelect: (week: number) => void;
}) {
  return (
    <div className="relative">
      <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-none">
        {weeks.map((w) => (
          <button
            key={w}
            onClick={() => onSelect(w)}
            data-testid={`button-week-${w}`}
            className={cn(
              "flex shrink-0 flex-col items-center justify-center rounded-md border px-3.5 py-1.5 text-sm transition-colors min-w-[60px]",
              selectedWeek === w
                ? "border-primary bg-primary text-primary-foreground font-semibold"
                : "border-border bg-card text-foreground hover:border-primary/40"
            )}
          >
            <span>Week {w}</span>
            {currentWeek === w && (
              <span
                className={cn(
                  "text-[10px] font-mono uppercase tracking-wide",
                  selectedWeek === w ? "text-primary-foreground/80" : "text-primary"
                )}
              >
                this week
              </span>
            )}
          </button>
        ))}
      </div>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-background to-transparent"
      />
    </div>
  );
}
