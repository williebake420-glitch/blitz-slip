# Blitz Slip

An NFL parlay builder for the 2026 season. It covers every game on the schedule, live odds from DraftKings, FanDuel and BetMGM, all player props with alternate-line sliders, and parlay pricing.

## Features
- 18-week schedule with main lines (moneyline, spread, total)
- Player props for every game, with sliders across alternate lines
- Same-game parlays priced with correlation adjustment through the OpticOdds parlay endpoint
- Cross-game parlays priced by multiplying each game's price
- Shareable saved slips (`/#/slip/:id`)
- Odds refresh every 60 seconds and when the tab regains focus; prices on the slip update automatically

## Setup
Requires Node 20 or later.

```bash
npm install
cp .env.example .env        # add your OPTICODDS_API_KEY
npm run dev                 # http://localhost:5000
```

Production:

```bash
npm run build
OPTICODDS_API_KEY=xxx npm start
```

## Environment variables
| Name | Required | Purpose |
|---|---|---|
| `OPTICODDS_API_KEY` | Yes, outside Perplexity | Odds, props and parlay pricing (https://opticodds.com) |
| `PORT` | No | Server port (default 5000) |
| `OPTICODDS_BASE_URL` | No | Overrides the API base URL (default `https://api.opticodds.com/api/v3`) |

## Structure
- `client/`: React, Vite, Tailwind and shadcn/ui frontend
- `server/routes.ts`: Express API routes (`/api/*`)
- `server/opticodds.ts`: all odds logic, including fetching, best-price selection, alternate-line ladders and parlay pricing
- `server/schedule_full.json`: the full 2026 regular-season schedule
- `server/storage.ts`: SQLite storage for shared slips (`data.db` is created automatically)

## Notes
- The schedule is a static JSON file. Week numbers are computed from kickoff dates; Monday night games can occasionally be assigned to the following week.
- Odds requests are cached in memory for 90 seconds to limit API usage.
- For entertainment and research only. Prices can change before a bet is placed.
