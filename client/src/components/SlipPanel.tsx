import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useSlip } from "@/hooks/use-slip";
import { formatAmerican, formatPayout, impliedProbability } from "@/lib/odds";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Copy, Check, Trash2 } from "lucide-react";
import type { ParlayPriceResponse } from "@/lib/types";

export function SlipPanel({ onClose }: { onClose?: () => void }) {
  const { legs, stake, setStake, removeLeg, clear } = useSlip();
  const [shareId, setShareId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);

  const payloadLegs = useMemo(
    () => legs.map((l) => ({ fixtureId: l.fixtureId, market: l.market, name: l.name, price: l.price, sportsbook: l.sportsbook })),
    [legs]
  );

  const { data: pricing, isFetching } = useQuery<ParlayPriceResponse | null>({
    queryKey: ["parlay-price", JSON.stringify(payloadLegs)],
    queryFn: async () => {
      if (payloadLegs.length === 0) return null;
      const res = await apiRequest("POST", "/api/parlay/price", { legs: payloadLegs });
      return res.json();
    },
    enabled: payloadLegs.length > 0,
  });

  const byGame = useMemo(() => {
    const map = new Map<string, typeof legs>();
    for (const l of legs) {
      if (!map.has(l.fixtureId)) map.set(l.fixtureId, [] as any);
      (map.get(l.fixtureId) as any).push(l);
    }
    return Array.from(map.entries());
  }, [legs]);

  const combinedAmerican = pricing?.combinedAmerican;
  const hasSgp = pricing?.groups.some((g) => g.method === "sgp");
  const hasFallback = pricing?.groups.some((g) => g.method === "naive_fallback");
  const payout = combinedAmerican != null ? formatPayout(stake, combinedAmerican) : null;

  async function handleSaveShare() {
    if (legs.length === 0) return;
    setSaving(true);
    try {
      const res = await apiRequest("POST", "/api/parlays", { legs, stake });
      const json = await res.json();
      setShareId(json.id);
    } finally {
      setSaving(false);
    }
  }

  async function handleCopy() {
    if (!shareId) return;
    const url = `${window.location.origin}${window.location.pathname}#/slip/${shareId}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard may be unavailable; user can select the text manually
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-border px-4 py-3.5">
        <h2 className="text-sm font-semibold uppercase tracking-wide">Your Slip ({legs.length})</h2>
        <div className="flex items-center gap-1">
          {legs.length > 0 && (
            <Button variant="ghost" size="icon" onClick={clear} data-testid="button-clear-slip" title="Clear slip">
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
          {onClose && (
            <Button variant="ghost" size="icon" onClick={onClose} data-testid="button-close-slip">
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3">
        {legs.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-1.5 py-10 text-center text-sm text-muted-foreground">
            <p>No legs added yet.</p>
            <p className="text-xs">Tap any Over/Under or line price to add it here.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {byGame.map(([fixtureId, gameLegs]) => (
              <div key={fixtureId}>
                <p className="mb-1.5 text-xs font-semibold text-muted-foreground font-mono">
                  {gameLegs[0].gameLabel}
                  {gameLegs.length > 1 && <span className="ml-1.5 text-primary">SGP</span>}
                </p>
                <div className="flex flex-col gap-1.5">
                  {gameLegs.map((leg) => (
                    <div
                      key={leg.legId}
                      className="flex items-start justify-between gap-2 rounded-md border border-card-border bg-card px-3 py-2"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{leg.name}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {leg.market} · {leg.sportsbook}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <span className="font-mono text-sm font-semibold">{formatAmerican(leg.price)}</span>
                        <button
                          onClick={() => removeLeg(leg.legId)}
                          data-testid={`button-remove-${leg.legId}`}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {legs.length > 0 && (
        <div className="border-t border-border px-4 py-3.5">
          <div className="mb-3 flex items-center justify-between">
            <label htmlFor="stake" className="text-sm text-muted-foreground">
              Stake
            </label>
            <div className="flex items-center gap-1">
              <span className="text-sm text-muted-foreground">$</span>
              <Input
                id="stake"
                type="number"
                min={1}
                value={stake}
                onChange={(e) => setStake(Number(e.target.value) || 0)}
                className="h-8 w-20 text-right font-mono"
                data-testid="input-stake"
              />
            </div>
          </div>

          <div className="mb-3 rounded-md bg-accent px-3 py-2.5">
            <div className="flex items-center justify-between">
              <span className="text-sm text-accent-foreground">Combined odds</span>
              <span className="font-mono text-lg font-bold text-accent-foreground">
                {isFetching ? "…" : combinedAmerican != null ? formatAmerican(combinedAmerican) : "—"}
              </span>
            </div>
            <div className="mt-1 flex items-center justify-between text-xs text-accent-foreground/80">
              <span>To win</span>
              <span className="font-mono">{payout != null ? `$${(payout - stake).toFixed(2)}` : "—"}</span>
            </div>
            <div className="flex items-center justify-between text-xs text-accent-foreground/80">
              <span>Payout</span>
              <span className="font-mono">{payout != null ? `$${payout.toFixed(2)}` : "—"}</span>
            </div>
            <div className="flex items-center justify-between text-xs text-accent-foreground/80">
              <span>Implied probability</span>
              <span className="font-mono">
                {combinedAmerican != null ? `${(impliedProbability(combinedAmerican) * 100).toFixed(1)}%` : "—"}
              </span>
            </div>
          </div>

          {hasSgp && (
            <p className="mb-2 text-[11px] text-muted-foreground">
              Same-game legs are priced with correlation-adjusted SGP pricing.
            </p>
          )}
          {hasFallback && !hasSgp && (
            <p className="mb-2 text-[11px] text-muted-foreground">
              Same-game correlation pricing wasn't available for one or more legs; combined odds shown are a
              straight multiply estimate.
            </p>
          )}

          {shareId ? (
            <Button variant="outline" className="w-full gap-2" onClick={handleCopy} data-testid="button-copy-link">
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? "Link copied" : "Copy share link"}
            </Button>
          ) : (
            <Button className="w-full" onClick={handleSaveShare} disabled={saving} data-testid="button-save-slip">
              {saving ? "Saving…" : "Save & share slip"}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
