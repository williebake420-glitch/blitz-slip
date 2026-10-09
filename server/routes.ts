import type { Express } from "express";
import { createServer } from 'node:http';
import type { Server } from 'node:http';
import { storage } from "./storage";
import { getGameProps, getGameMainLines, priceParlay, PROP_CATEGORIES } from "./opticodds";
import scheduleData from "./schedule_full.json";
import { randomUUID } from "node:crypto";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // ---- Schedule ----
  app.get("/api/weeks", (_req, res) => {
    const weeks = Array.from(new Set((scheduleData as any[]).map((g) => g.computed_week))).sort((a, b) => a - b);
    res.json({ weeks });
  });

  app.get("/api/current-week", (_req, res) => {
    const games = [...(scheduleData as any[])].sort((a, b) => a.start_date.localeCompare(b.start_date));
    const now = Date.now();
    const upcoming = games.find((g) => new Date(g.start_date).getTime() >= now - 4 * 60 * 60 * 1000);
    const week = upcoming ? upcoming.computed_week : games[games.length - 1]?.computed_week ?? 1;
    res.json({ week });
  });

  app.get("/api/schedule", (req, res) => {
    const week = req.query.week ? Number(req.query.week) : undefined;
    let games = scheduleData as any[];
    if (week != null) games = games.filter((g) => g.computed_week === week);
    games = [...games].sort((a, b) => a.start_date.localeCompare(b.start_date));
    const shaped = games.map((g) => ({
      id: g.id,
      startDate: g.start_date,
      status: g.status,
      week: g.computed_week,
      homeTeam: g.home_team_display,
      awayTeam: g.away_team_display,
      homeAbbr: g.home_competitors?.[0]?.abbreviation,
      awayAbbr: g.away_competitors?.[0]?.abbreviation,
      homeLogo: g.home_competitors?.[0]?.logo,
      awayLogo: g.away_competitors?.[0]?.logo,
      homeRecord: g.home_record,
      awayRecord: g.away_record,
      venue: g.venue_name,
      broadcast: g.broadcast,
      hasOdds: g.has_odds,
    }));
    res.json({ games: shaped });
  });

  app.get("/api/games/:id", (req, res) => {
    const game = (scheduleData as any[]).find((g) => g.id === req.params.id);
    if (!game) return res.status(404).json({ error: "not_found" });
    res.json({
      id: game.id,
      startDate: game.start_date,
      week: game.computed_week,
      status: game.status,
      homeTeam: game.home_team_display,
      awayTeam: game.away_team_display,
      homeAbbr: game.home_competitors?.[0]?.abbreviation,
      awayAbbr: game.away_competitors?.[0]?.abbreviation,
      homeLogo: game.home_competitors?.[0]?.logo,
      awayLogo: game.away_competitors?.[0]?.logo,
      homeRecord: game.home_record,
      awayRecord: game.away_record,
      venue: game.venue_name,
      venueLocation: game.venue_location,
      broadcast: game.broadcast,
    });
  });

  app.get("/api/categories", (_req, res) => {
    res.json({
      categories: Object.entries(PROP_CATEGORIES).map(([name, markets]) => ({ name, markets })),
    });
  });

  // ---- Live odds ----
  app.get("/api/games/:id/main-lines", async (req, res) => {
    try {
      const data = await getGameMainLines(req.params.id);
      res.json(data);
    } catch (e: any) {
      res.status(502).json({ error: "odds_unavailable", message: e.message });
    }
  });

  app.get("/api/games/:id/props", async (req, res) => {
    try {
      const data = await getGameProps(req.params.id);
      res.json(data);
    } catch (e: any) {
      res.status(502).json({ error: "odds_unavailable", message: e.message });
    }
  });

  // ---- Parlay pricing ----
  app.post("/api/parlay/price", async (req, res) => {
    try {
      const legs = req.body?.legs;
      if (!Array.isArray(legs) || legs.length === 0) {
        return res.status(400).json({ error: "no_legs" });
      }
      const result = await priceParlay(legs);
      res.json(result);
    } catch (e: any) {
      res.status(502).json({ error: "pricing_failed", message: e.message });
    }
  });

  // ---- Save / share parlay ----
  app.post("/api/parlays", async (req, res) => {
    try {
      const { legs, stake } = req.body ?? {};
      if (!Array.isArray(legs) || legs.length === 0) {
        return res.status(400).json({ error: "no_legs" });
      }
      const id = randomUUID().slice(0, 8);
      const parlay = await storage.createParlay({
        id,
        legsJson: JSON.stringify(legs),
        stake: Number(stake) || 10,
        createdAt: Date.now(),
      });
      res.json({ id: parlay.id });
    } catch (e: any) {
      res.status(500).json({ error: "save_failed", message: e.message });
    }
  });

  app.get("/api/parlays/:id", async (req, res) => {
    const parlay = await storage.getParlay(req.params.id);
    if (!parlay) return res.status(404).json({ error: "not_found" });
    res.json({ id: parlay.id, legs: JSON.parse(parlay.legsJson), stake: parlay.stake, createdAt: parlay.createdAt });
  });

  return httpServer;
}
