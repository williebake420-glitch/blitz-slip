import { useEffect, useState } from "react";
import { useIsFetching, useQueryClient } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

function ago(ms: number) {
  const s = Math.max(0, Math.round(ms / 1000));
  if (s < 10) return "just now";
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  return `${m}m ago`;
}

export function LiveStatus() {
  const qc = useQueryClient();
  const fetching = useIsFetching() > 0;
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const unsub = qc.getQueryCache().subscribe((e) => {
      if (e.type === "updated" && e.action.type === "success") {
        setLastUpdated(Date.now());
      }
    });
    const t = setInterval(() => setNow(Date.now()), 5000);
    return () => { unsub(); clearInterval(t); };
  }, [qc]);

  return (
    <div className="flex items-center gap-2">
      <span className="hidden sm:inline-flex items-center gap-1.5 text-xs text-muted-foreground font-mono" data-testid="text-last-updated">
        <span className={`h-1.5 w-1.5 rounded-full ${fetching ? "bg-amber-500 animate-pulse" : "bg-emerald-500"}`} />
        {fetching ? "Updating…" : lastUpdated ? `Odds ${ago(now - lastUpdated)}` : "Live odds"}
      </span>
      <Button
        variant="ghost"
        size="icon"
        aria-label="Refresh odds"
        title="Refresh odds"
        onClick={() => qc.invalidateQueries()}
        data-testid="button-refresh-odds"
      >
        <RefreshCw className={`h-4 w-4 ${fetching ? "animate-spin" : ""}`} />
      </Button>
    </div>
  );
}
