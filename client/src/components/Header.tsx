import { Link } from "wouter";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Ticket } from "lucide-react";
import { useSlip } from "@/hooks/use-slip";
import { LiveStatus } from "@/components/LiveStatus";

export function Header({ onOpenSlip }: { onOpenSlip: () => void }) {
  const { legs } = useSlip();
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5 shrink-0">
          <Logo className="h-7 w-7 text-primary" />
          <div className="flex flex-col leading-none">
            <span className="text-base font-semibold tracking-tight">Blitz Slip</span>
            <span className="text-[11px] text-muted-foreground font-mono">2026 NFL SEASON</span>
          </div>
        </Link>
        <div className="flex items-center gap-2">
        <LiveStatus />
        <Button
          variant="outline"
          className="gap-2 relative lg:hidden"
          onClick={onOpenSlip}
          data-testid="button-open-slip"
        >
          <Ticket className="h-4 w-4" />
          <span className="hidden sm:inline">Slip</span>
          {legs.length > 0 && (
            <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[11px] font-mono font-semibold text-primary-foreground">
              {legs.length}
            </span>
          )}
        </Button>
        </div>
      </div>
    </header>
  );
}
