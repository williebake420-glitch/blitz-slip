import { useState } from "react";
import { Switch, Route, Router } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import NotFound from "@/pages/not-found";
import Schedule from "@/pages/Schedule";
import GameDetail from "@/pages/GameDetail";
import SharedSlip from "@/pages/SharedSlip";
import { Header } from "@/components/Header";
import { SlipPanel } from "@/components/SlipPanel";
import { SlipProvider } from "@/hooks/use-slip";

function AppRouter() {
  return (
    <Switch>
      <Route path="/" component={Schedule} />
      <Route path="/week/:week" component={Schedule} />
      <Route path="/game/:id" component={GameDetail} />
      <Route path="/slip/:id" component={SharedSlip} />
      <Route component={NotFound} />
    </Switch>
  );
}

function AppShell() {
  const [slipOpen, setSlipOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <Header onOpenSlip={() => setSlipOpen(true)} />
      <div className="mx-auto flex max-w-6xl">
        <main className="min-w-0 flex-1 lg:mr-[360px]">
          <AppRouter />
        </main>
        <aside className="fixed right-0 top-16 hidden h-[calc(100vh-64px)] w-[360px] border-l border-border bg-background lg:block">
          <SlipPanel />
        </aside>
      </div>
      <Sheet open={slipOpen} onOpenChange={setSlipOpen}>
        <SheetContent side="right" className="w-[360px] p-0 lg:hidden">
          <SlipPanel onClose={() => setSlipOpen(false)} />
        </SheetContent>
      </Sheet>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <SlipProvider>
          <Router hook={useHashLocation}>
            <AppShell />
          </Router>
        </SlipProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
