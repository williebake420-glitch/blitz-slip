import { useParams, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import type { GameDetail as GameDetailType, PropsResponse, MainLinesResponse } from "@/lib/types";
import { formatGameTime } from "@/lib/odds";
import { MainLines } from "@/components/MainLines";
import { PropsBrowser } from "@/components/PropsBrowser";
import { Skeleton } from "@/components/ui/skeleton";
import { useEffect } from "react";
import { useSlip } from "@/hooks/use-slip";

function collectPrices(node: any, out: Map<string, number>) {
  if (!node || typeof node !== "object") return;
  if (Array.isArray(node)) { node.forEach((n) => collectPrices(n, out)); return; }
  if (typeof node.price === "number") {
    if (typeof node.oddsId === "string") out.set(node.oddsId, node.price);
    if (typeof node.id === "string") out.set(node.id, node.price);
  }
  for (const v of Object.values(node)) collectPrices(v, out);
}

export default function GameDetail() {
  const { id } = useParams<{ id: string }>();

  const { data: game, isLoading: gameLoading } = useQuery<GameDetailType>({
    queryKey: ["/api/games/" + id],
  });
  const { data: mainLines } = useQuery<MainLinesResponse>({
    queryKey: ["/api/games/" + id + "/main-lines"],
    enabled: !!id,
  });
  const { data: props, isLoading: propsLoading } = useQuery<PropsResponse>({
    queryKey: ["/api/games/" + id + "/props"],
    enabled: !!id,
  });

  const { syncPrices } = useSlip();
  useEffect(() => {
    const m = new Map<string, number>();
    collectPrices(mainLines, m);
    collectPrices(props, m);
    if (m.size) syncPrices(m);
  }, [mainLines, props, syncPrices]);

  const gameLabel = game ? `${game.awayAbbr ?? game.awayTeam} @ ${game.homeAbbr ?? game.homeTeam}` : "";

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
      <Link href="/" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to schedule
      </Link>

      {gameLoading || !game ? (
        <Skeleton className="mb-6 h-24 w-full rounded-lg" />
      ) : (
        <div className="mb-6 flex flex-col gap-3 rounded-lg border border-card-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              {game.awayLogo && <img src={game.awayLogo} alt="" className="h-10 w-10 object-contain" />}
              <span className="text-lg font-semibold">{game.awayTeam}</span>
            </div>
            <span className="text-muted-foreground">@</span>
            <div className="flex items-center gap-2">
              {game.homeLogo && <img src={game.homeLogo} alt="" className="h-10 w-10 object-contain" />}
              <span className="text-lg font-semibold">{game.homeTeam}</span>
            </div>
          </div>
          <div className="text-sm text-muted-foreground sm:text-right">
            <p className="font-mono">{formatGameTime(game.startDate)}</p>
            <p>{game.venue}</p>
          </div>
        </div>
      )}

      <section className="mb-8">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Game Lines
        </h2>
        <MainLines
          data={mainLines}
          fixtureId={id!}
          gameLabel={gameLabel}
          homeAbbr={game?.homeAbbr}
          awayAbbr={game?.awayAbbr}
        />
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Player Props
        </h2>
        <PropsBrowser data={props} isLoading={propsLoading} fixtureId={id!} gameLabel={gameLabel} />
      </section>
    </div>
  );
}
