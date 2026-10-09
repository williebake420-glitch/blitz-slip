# Blitz Slip: handoff for Polsia

## What it is
Blitz Slip is a working NFL parlay builder: an Express backend in TypeScript with a React frontend. See `README.md` for features and structure.

## Getting it running
1. `npm install`
2. Set `OPTICODDS_API_KEY` (get one at https://opticodds.com). This is the only external dependency.
3. Development: `npm run dev`. Production: `npm run build`, then `npm start`. It listens on `$PORT`, default 5000.

No code changes are needed. The app was first built inside Perplexity Computer and used a built-in odds connector. When `OPTICODDS_API_KEY` is set, it calls the OpticOdds REST API directly instead (see `callDirect()` in `server/opticodds.ts`).

## Hosting notes
- It needs a Node host that can run a persistent server, such as Railway, Render or Fly. It is not a static-only site.
- Shared slips are stored in a local SQLite file (`data.db`). On hosts with ephemeral disks, mount a volume or switch storage to Postgres; the Drizzle schema is in `shared/schema.ts`.

## Suggested next work
- Fix the occasional Monday-night game assigned to the following week (`computed_week` in `server/schedule_full.json`)
- Add game status and results so completed games are hidden automatically
- Add user accounts and slip history
