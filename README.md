# Football Live — Real-time Scores & Fixtures

A modern, dark-first web app for live football scores, fixtures, standings, and team profiles. Built with Next.js 16, Express.js, MongoDB, and football-data.org API.

## Features

- **Live Scores** — Real-time match updates, refreshing every 15 seconds during live matches
- **Fixtures & Schedule** — Browse matches by date and league, with filtering
- **Standings** — League tables with promotion/relegation zones highlighted
- **Club Profiles** — Team rosters, upcoming fixtures, venue details
- **Team Search** — Fast autocomplete search across all leagues and clubs
- **Dark/Light Mode** — Seamless theme toggle
- **Mobile-First** — Fully responsive design optimized for all devices
- **Zero Auth** — No sign-ups required, instant access

## Tech Stack

**Backend:**
- Node.js 20+
- Express.js 4.17
- MongoDB 6+
- Mongoose 6.2
- football-data.org API (data source)

**Frontend:**
- Next.js 16 (App Router, TypeScript)
- Tailwind CSS 4
- React Query (@tanstack/react-query)
- next-themes (dark mode)
- Lucide React (icons)

## Quick Start

### Prerequisites
- Node.js 20+
- MongoDB (local or Atlas)
- football-data.org API key (free tier: https://www.football-data.org/client/register)

### Setup Backend

```bash
cd backend
cp .env.example .env
# Edit .env: MONGODB_URL, PORT=3050, FOOTBALL_DATA_API_KEY
npm install
npm run fetcher:seed  # Seed initial data from football-data.org
npm start            # Starts on http://localhost:3050
```

Verify: Open http://localhost:3050/api-docs (Swagger UI)

### Setup Frontend

```bash
cd frontend
cp .env.local.example .env.local
# .env.local should have: NEXT_PUBLIC_API_URL=http://localhost:3050
npm install
npm run dev           # Starts on http://localhost:3000
```

Open http://localhost:3000 in browser.

### Data Fetcher

To keep data live:

```bash
cd backend
npm run fetcher:live  # Polls today's matches every 5 minutes
```

Or for one-time seed:
```bash
npm run fetcher:seed
```

## Project Structure

```
football-live/
├── backend/
│   ├── controllers/      # Express route handlers
│   ├── models/           # Mongoose schemas
│   ├── services/         # Business logic (serialize, render)
│   ├── database/         # MongoDB connection
│   ├── scripts/fetcher/  # Data fetcher from football-data.org
│   ├── config/           # Environment config
│   ├── index.js          # Express app entry
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── app/          # Next.js pages (fixtures, match, standings, club)
│   │   ├── components/   # React components (layout, match, league, ui)
│   │   ├── hooks/        # Custom hooks (useFixtures, useMatch, useSearch)
│   │   ├── lib/          # Utilities (api.ts, utils.ts)
│   │   ├── types/        # TypeScript types (football.ts)
│   │   └── app/globals.css
│   ├── package.json
│   └── tailwind.config.ts
└── README.md
```

## API Endpoints

All endpoints under `/get/soccer` prefix:

| Endpoint | Description |
|---|---|
| `GET /get/soccer/leagues` | All active leagues |
| `GET /get/soccer/leagues/search?q=QUERY` | Search leagues |
| `GET /get/soccer/scoreboard?dates=YYYYMMDD` | Cross-league matches for a date |
| `GET /get/soccer/:league/scoreboard?dates=YYYYMMDD` | Single league scoreboard |
| `GET /get/soccer/:league/fixtures` | Paginated fixtures for a league |
| `GET /get/soccer/:league/clubs` | All clubs in a league |
| `GET /get/soccer/clubs/search?q=QUERY` | Search clubs across leagues |
| `GET /get/soccer/:league/standings` | League table |
| `GET /get/soccer/:league/events/:eventId` | Match summary |
| `GET /get/soccer/:league/events/:eventId/plays` | Match event timeline |
| `GET /get/soccer/meta` | Service info and coverage stats |

Full API docs: http://localhost:3050/api-docs (Swagger UI)

## Environment Variables

### Backend (.env)
```
NODE_ENV=development
PORT=3050
MONGODB_URL=mongodb://localhost:27017/soccer
API_URL=http://localhost:3050
FOOTBALL_DATA_API_KEY=your_key_here
CORS_ORIGINS=*
LOG_LEVEL=debug
ENABLE_SWAGGER=true
```

### Frontend (.env.local)
```
NEXT_PUBLIC_API_URL=http://localhost:3050
```

## Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed deployment guides covering Render, Vercel, MongoDB Atlas, and Docker.

## Development

### Running Tests

```bash
cd backend && npm run test:soccer
cd frontend && npm run build  # Type-checks + build
```

### Build for Production

```bash
# Backend (no build step — Node.js runs directly)
cd backend && npm start

# Frontend
cd frontend && npm run build && npm start
```

## Features Roadmap

- [ ] User accounts & login (Auth0 / Supabase)
- [ ] Favorite teams / match notifications
- [ ] Player statistics & profiles
- [ ] Head-to-head history
- [ ] Live commentary integration
- [ ] Mobile app (React Native)
- [ ] WebSocket real-time updates (replace polling)

## License

MIT

## Data Source

Live football data provided by [football-data.org](https://www.football-data.org)

## Support

For issues or feature requests, open a GitHub issue.
