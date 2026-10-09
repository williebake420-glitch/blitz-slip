import { useEffect, useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useSlip } from "@/hooks/use-slip";
import { Button } from "@/components/ui/button";
import type { SlipLeg } from "@/lib/types";

export default function SharedSlip() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { loadLegs } = useSlip();
  const [loaded, setLoaded] = useState(false);

  const { data, isLoading, error } = useQuery<{ legs: SlipLeg[]; stake: number }>({
    queryKey: ["/api/parlays/" + id],
    enabled: !!id,
  });

  useEffect(() => {
    if (data && !loaded) {
      loadLegs(data.legs, data.stake);
      setLoaded(true);
    }
  }, [data, loaded, loadLegs]);

  if (isLoading) {
    return <div className="mx-auto max-w-6xl px-4 py-16 text-center text-muted-foreground">Loading shared slip…</div>;
  }

  if (error || !data) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-16 text-center text-muted-foreground">
        This slip couldn't be found. It may have expired or the link is incorrect.
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-16 text-center">
      <h1 className="mb-2 text-xl font-semibold">Shared slip loaded</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        {data.legs.length} leg{data.legs.length === 1 ? "" : "s"} loaded into your bet slip. Open the slip to review
        it or keep browsing to add more.
      </p>
      <Button onClick={() => navigate("/")}>Back to schedule</Button>
    </div>
  );
}
