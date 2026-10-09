import { createContext, useCallback, useContext, useMemo, useState, ReactNode } from "react";
import type { SlipLeg } from "@/lib/types";

interface SlipContextValue {
  legs: SlipLeg[];
  stake: number;
  setStake: (v: number) => void;
  addLeg: (leg: SlipLeg) => void;
  removeLeg: (legId: string) => void;
  toggleLeg: (leg: SlipLeg) => void;
  hasLeg: (legId: string) => boolean;
  clear: () => void;
  loadLegs: (legs: SlipLeg[], stake?: number) => void;
  syncPrices: (prices: Map<string, number>) => void;
}

const SlipContext = createContext<SlipContextValue | null>(null);

export function SlipProvider({ children }: { children: ReactNode }) {
  const [legs, setLegs] = useState<SlipLeg[]>([]);
  const [stake, setStake] = useState<number>(10);

  const addLeg = useCallback((leg: SlipLeg) => {
    setLegs((prev) => {
      if (prev.some((l) => l.legId === leg.legId)) return prev;
      return [...prev, leg];
    });
  }, []);

  const removeLeg = useCallback((legId: string) => {
    setLegs((prev) => prev.filter((l) => l.legId !== legId));
  }, []);

  const toggleLeg = useCallback((leg: SlipLeg) => {
    setLegs((prev) => {
      if (prev.some((l) => l.legId === leg.legId)) {
        return prev.filter((l) => l.legId !== leg.legId);
      }
      return [...prev, leg];
    });
  }, []);

  const hasLegSet = useMemo(() => new Set(legs.map((l) => l.legId)), [legs]);
  const hasLeg = useCallback((legId: string) => hasLegSet.has(legId), [hasLegSet]);

  const clear = useCallback(() => setLegs([]), []);

  const loadLegs = useCallback((newLegs: SlipLeg[], newStake?: number) => {
    setLegs(newLegs);
    if (newStake != null) setStake(newStake);
  }, []);

  // Keep slip legs in step with the latest odds when a game's data refreshes.
  const syncPrices = useCallback((prices: Map<string, number>) => {
    setLegs((prev) => {
      let changed = false;
      const next = prev.map((l) => {
        const p = prices.get(l.legId);
        if (p != null && p !== l.price) { changed = true; return { ...l, price: p }; }
        return l;
      });
      return changed ? next : prev;
    });
  }, []);

  const value = useMemo(
    () => ({ legs, stake, setStake, addLeg, removeLeg, toggleLeg, hasLeg, clear, loadLegs, syncPrices }),
    [legs, stake, addLeg, removeLeg, toggleLeg, hasLeg, clear, loadLegs, syncPrices]
  );

  return <SlipContext.Provider value={value}>{children}</SlipContext.Provider>;
}

export function useSlip() {
  const ctx = useContext(SlipContext);
  if (!ctx) throw new Error("useSlip must be used within SlipProvider");
  return ctx;
}
