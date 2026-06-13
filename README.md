# World Cup Betting Scoreboard

Read-only FIFA World Cup 2026 prediction scoreboard. Participants submit predictions as Markdown files in an Obsidian vault synced to this repository. The app parses predictions, fetches match results via CI, calculates points, and publishes a live leaderboard to GitHub Pages.

## Quick start

```bash
npm install
npm run scoreboard:data   # Parse vault + generate public/data/*.json
npm run dev               # Local dev server
npm run scoreboard:build  # Production build to dist/
npm test
```

## Vault structure

```
vault/
├── rules/Mästerskapstips 2026.md   # Scoring rules + parser contract
└── participants/*.md               # One file per participant
```

Required participant headings:

- `## Group Stage Predictions`
- `## Predicted Group Standings`
- `## Predicted Group Winners`
- `## Knockout Predictions`

## GitHub Pages

- **Repo name:** `world-cup-betting-scoreboard`
- **URL:** `https://<user>.github.io/world-cup-betting-scoreboard/`
- Deployed automatically by `.github/workflows/scoreboard-build-deploy.yml`

Enable GitHub Pages with source: **GitHub Actions**.

## Secrets (optional live data)

| Secret | Required | Purpose |
|--------|----------|---------|
| `WORLDCUP2026_TOKEN` | No | JWT for [worldcup26.ir](https://worldcup26.ir) if public endpoints start requiring auth. Get one via `POST /auth/authenticate`. |
| `FOOTBALL_DATA_API_KEY` | No | Fallback API ([football-data.org](https://www.football-data.org/)) |
| `API_FOOTBALL_KEY` | No | Fallback API ([api-sports.io](https://www.api-football.com/)) |

Live scores are fetched from **worldcup26.ir** by default (free, no key required today). Paid APIs are optional fallbacks. Manual overrides in `public/data/results.manual.json` always win.

Keys are used only in CI — never exposed to the browser.

## Manual result overrides

Place `public/data/results.manual.json` with the same schema as `results.json`. Manual entries take precedence over API data.

## Obsidian sync

1. Point your Obsidian vault Git plugin at this repo
2. Edit participant `.md` files locally
3. Commit + push → site rebuilds automatically

## Scripts

| Script | Description |
|--------|-------------|
| `npm run scoreboard:data` | Parse vault, score, write `public/data/` |
| `npm run scoreboard:build` | Data pipeline + Vite production build |
| `npm run dev` | Vite dev server |
| `npm test` | Vitest unit tests |

## Architecture

- **Source of truth:** Markdown in `vault/`
- **Scoring:** Config-driven pure functions in `src/engine/`
- **Live data:** GitHub Actions fetches [worldcup26.ir](https://worldcup26.ir) (and optional fallback APIs) → commits JSON → rebuilds site
- **UI:** Vanilla TypeScript SPA with hash router
