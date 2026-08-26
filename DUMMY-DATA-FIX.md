# Fix Dummy Data — Landing Page

## Problem

Landing page punya 3 section dummy:
1. Hero live ticker (3 match cards) — dummy
2. Hero status badge "38 matches in progress" — dummy
3. Today's Matches (6 cards) — dummy

## Solution Options

### Option A: Replace with Real API Data (Best)

Replace semua dummy dengan real API calls.

**Pros**: Consistent, production-ready
**Cons**: Landing page jadi client component, initial load slower

### Option B: Hide Dummy Sections (Quick Fix)

Hide atau ganti jadi "Coming Soon" placeholder.

**Pros**: Cepat, no API changes needed
**Cons**: Landing page jadi kurang content

### Option C: Keep Dummy, Add Disclaimer

Tampilkan dummy tapi kasih label "Sample Data" atau "Demo Mode".

**Pros**: Tetap visual bagus
**Cons**: Misleading untuk users

---

## Recommended: Option A

### Changes Needed

#### 1. Landing Page Hero Live Ticker

**Current** (`src/app/page.tsx` line 14-18):
```tsx
const liveMatches = [
  { id: 1, league: "Premier League", home: "Arsenal", away: "Chelsea", ... },
  // hardcoded
];
```

**Fix**: Fetch dari API `/get/soccer/scoreboard?dates=TODAY&status=live&limit=3`

Create new endpoint di backend `soccerController.js`:
```js
// GET /get/soccer/scoreboard?dates=YYYYMMDD&status=live&limit=3
// Returns: { matches: [...], meta: { ... } }
```

Di frontend, convert landing ke client component + useQuery:
```tsx
"use client";
import { useQuery } from "@tanstack/react-query";

export default function LandingPage() {
  const { data: liveMatches } = useQuery({
    queryKey: ["live-ticker"],
    queryFn: () => fetchAPI("/get/soccer/scoreboard?dates=...&status=live&limit=3"),
    refetchInterval: 15000,
  });
  
  // render liveMatches dari API
}
```

#### 2. Today's Matches Section

**Current**: `MOCK_TODAYS_MATCHES` dari `mockData.ts`

**Fix**: Same API call, ambil 6 matches hari ini:
```tsx
const { data: todaysMatches } = useQuery({
  queryKey: ["todays-matches"],
  queryFn: () => fetchAPI("/get/soccer/scoreboard?dates=TODAY&limit=6"),
});
```

#### 3. Hero Status Badge

**Current**: `"38 matches in progress"` hardcoded

**Fix**: Hit `/get/soccer/meta` endpoint (already exists):
```tsx
const { data: meta } = useQuery({
  queryKey: ["meta"],
  queryFn: () => fetchAPI("/get/soccer/meta"),
  refetchInterval: 60000,
});

// Render: `{meta.liveMatchCount} matches in progress`
```

#### 4. Top Leagues Section

**Current**: Uses `MOCK_LEAGUES` for logo URLs (ESPN CDN fallback)

**Fix**: Already half-fixed — fetches real leagues from API but uses mock for logos. Remove mock dependency:

```tsx
const { data: leagues } = useQuery({
  queryKey: ["leagues"],
  queryFn: () => fetchAPI<ApiLeaguesResponse>("/get/soccer/leagues").then(r => r.leagues.slice(0, 6)),
});

// Render real league.logo from API (football-data.org URLs)
```

---

## Implementation Steps

### Backend (if needed)

Add query params to existing `/get/soccer/scoreboard` endpoint:
- `?status=live|scheduled|finished`
- `?limit=N`

Already returns correct shape, just need filter + limit logic.

### Frontend

1. Convert `src/app/page.tsx` to client component
2. Add 3 useQuery calls (live ticker, today's matches, meta)
3. Add skeleton loading states for each section
4. Remove `src/lib/mockData.ts` import
5. Handle empty states ("No live matches right now")

### File Changes

- `frontend/src/app/page.tsx` — convert to `"use client"`, add queries
- `frontend/src/lib/mockData.ts` — can delete or keep for future use
- `backend/controllers/soccerController.js` — add `status` & `limit` query params (optional, may already work)

---

## Quick Fix (Option B)

If you want quick hide without API work:

### Hide Live Ticker

```tsx
{/* Temporarily hidden — coming soon */}
{false && (
  <div className="lg:col-span-5">
    {/* live ticker */}
  </div>
)}
```

### Hide Today's Matches

```tsx
{/* <section>Today's Matches</section> */}
```

### Fix Status Badge

```tsx
- <span>38 matches in progress</span>
+ <span>Live matches updating</span>
```

---

## Recommendation

Go with **Option A** for production. It's ~1 hour work (convert page to client, add 3 queries, handle loading). Landing page akan fully real-time.

Kalau mau deploy cepat hari ini, pakai **Option B** (hide dummy sections) dulu, nanti fix weekend pakai Option A.
