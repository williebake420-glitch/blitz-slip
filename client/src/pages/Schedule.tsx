import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "wouter";
import { WeekSelector } from "@/components/WeekSelector";
import { GameCard } from "@/components/GameCard";
import type { ScheduleGame } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";

export default function Schedule() {
  const params = useParams<{ week?: string }>();
  const [selectedWeek, setSelectedWeek] = useState<number | null>(params.week ? Number(params.week) : null);

  const { data: weeksData } = useQuery<{ weeks: number[] }>({ queryKey: ["/api/weeks"] });
  const { data: currentWeekData } = useQuery<{ week: number }>({ queryKey: ["/api/current-week"] });

  useEffect(() => {
    if (selectedWeek == null && currentWeekData?.week != null) {
      setSelectedWeek(currentWeekData.week);
    }
  }, [currentWeekData, selectedWeek]);

  const week = selectedWeek ?? currentWeekData?.week ?? 1;

  const { data: scheduleData, isLoading } = useQuery<{ games: ScheduleGame[] }>({
    queryKey: ["/api/schedule?week=" + week],
    enabled: !!week,
  });

  const grouped = useMemo(() => {
    const games = scheduleData?.games ?? [];
    const byDay = new Map<string, ScheduleGame[]>();
    for (const g of games) {
      const day = new Date(g.startDate).toLocaleDateString("en-US", {
        weekday: "long",
        month: "short",
        day: "numeric",
      });
      if (!byDay.has(day)) byDay.set(day, []);
      byDay.get(day)!.push(g);
    }
    return Array.from(byDay.entries());
  }, [scheduleData]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight mb-1">Season Schedule</h1>
        <p className="text-sm text-muted-foreground">
          Browse all 18 weeks of the 2026 season. Open a matchup to build a parlay from live player props.
        </p>
      </div>

      <div className="mb-6">
        <WeekSelector
          weeks={weeksData?.weeks ?? []}
          currentWeek={currentWeekData?.week ?? null}
          selectedWeek={week}
          onSelect={setSelectedWeek}
        />
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-[76px] w-full rounded-lg" />
          ))}
        </div>
      ) : grouped.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border py-16 text-center text-muted-foreground">
          No games scheduled for this week.
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {grouped.map(([day, games]) => (
            <div key={day}>
              <h2 className="mb-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {day}
              </h2>
              <div className="flex flex-col gap-2.5">
                {games.map((g) => (
                  <GameCard key={g.id} game={g} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
