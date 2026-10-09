import { Link } from "wouter";
import type { ScheduleGame } from "@/lib/types";
import { formatGameTime } from "@/lib/odds";
import { Badge } from "@/components/ui/badge";
import { ChevronRight } from "lucide-react";

function TeamRow({ abbr, name, record, logo, align }: { abbr?: string; name: string; record?: string; logo?: string; align: "left" }) {
  return (
    <div className="flex items-center gap-2.5">
      {logo ? (
        <img src={logo} alt="" className="h-7 w-7 object-contain shrink-0" loading="lazy" />
      ) : (
        <div className="h-7 w-7 rounded-full bg-secondary shrink-0" />
      )}
      <div className="flex flex-col leading-tight min-w-0">
        <span className="text-sm font-semibold truncate">{name}</span>
        {record && <span className="text-xs text-muted-foreground font-mono">{record}</span>}
      </div>
    </div>
  );
}

export function GameCard({ game }: { game: ScheduleGame }) {
  const isFinal = game.status === "completed";
  const isLive = game.status === "live" || game.status === "half";

  return (
    <Link
      href={`/game/${game.id}`}
      data-testid={`link-game-${game.id}`}
      className="group flex items-center justify-between gap-4 rounded-lg border border-card-border bg-card px-4 py-3.5 transition-colors hover:border-primary/50"
    >
      <div className="flex flex-1 flex-col gap-2 min-w-0">
        <TeamRow abbr={game.awayAbbr} name={game.awayTeam} record={game.awayRecord} logo={game.awayLogo} align="left" />
        <TeamRow abbr={game.homeAbbr} name={game.homeTeam} record={game.homeRecord} logo={game.homeLogo} align="left" />
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1.5 text-right">
        {isLive ? (
          <Badge className="bg-destructive text-destructive-foreground border-none">Live</Badge>
        ) : isFinal ? (
          <Badge variant="secondary">Final</Badge>
        ) : (
          <span className="text-sm font-medium font-mono">{formatGameTime(game.startDate)}</span>
        )}
        {game.broadcast && !isFinal && (
          <span className="text-xs text-muted-foreground">{game.broadcast}</span>
        )}
        <span className="flex items-center gap-0.5 text-xs text-primary opacity-0 transition-opacity group-hover:opacity-100">
          Props <ChevronRight className="h-3.5 w-3.5" />
        </span>
      </div>
    </Link>
  );
}
