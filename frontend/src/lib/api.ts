import type { FixtureDetailResponse } from '@/types/fixtureDetail';

export function getApiBase(): string {
  let url = (process.env.NEXT_PUBLIC_API_URL || "").trim();

  // 1. If NEXT_PUBLIC_API_URL is configured
  if (url !== "") {
    // If user configured http:// on a remote domain (e.g. vercel.app), force https://
    // Vercel strictly rejects http:// with a 308 Permanent Redirect to https://
    if (url.startsWith("http://") && !url.includes("localhost") && !url.includes("127.0.0.1")) {
      url = url.replace("http://", "https://");
    }
    return url.replace(/\/$/, "");
  }

  // 2. Fallback for client-side / local dev
  if (typeof window !== "undefined") {
    return "http://localhost:3050";
  }

  // 3. Fallback for server-side
  return "http://localhost:3050";
}

export async function fetchAPI<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const base = getApiBase();
  const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  const url = `${base}${cleanEndpoint}`;

  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  if (!res.ok) {
    throw new Error(`API error: ${res.status} ${res.statusText}`);
  }

  return res.json();
}

export interface LiveMatchResponse {
  meta: {
    count: number;
    source: string;
    stale: boolean;
    quotaExhausted?: boolean;
    generatedAt: string;
  };
  matches: Array<{
    id: string;
    providers: { apiFootball: string; footballData: string | null };
    league: { id: string; name: string; slug: string; logo?: string; country?: string };
    home: { id: string; name: string; logo?: string; score: number };
    away: { id: string; name: string; logo?: string; score: number };
    score: { home: number; away: number };
    status: { state: string; short: string; long: string; elapsed?: number };
    kickoff: string;
    venue?: { name?: string; city?: string };
    events?: Array<{
      time: number;
      extraTime?: number;
      teamName: string;
      playerName: string;
      type: string;
      detail: string;
    }>;
  }>;
}

export async function fetchLiveMatches(): Promise<LiveMatchResponse> {
  return fetchAPI<LiveMatchResponse>('/api/live');
}

export async function fetchFinishedMatches(): Promise<LiveMatchResponse> {
  return fetchAPI<LiveMatchResponse>('/api/live/finished');
}

export interface FixturesByDateResponse {
  date: string;
  count: number;
  fixtures: LiveMatchResponse['matches'];
  source: 'cache' | 'api' | 'stale';
}

/** API-Football fixtures for a date (YYYY-MM-DD). Same item shape as /api/live. */
export async function fetchFixturesByDate(date: string): Promise<FixturesByDateResponse> {
  return fetchAPI<FixturesByDateResponse>(`/api/fixtures/date/${date}`);
}

/** Full fixture detail (events, lineups, statistics) by API-Football fixture id. */
export async function fetchFixtureDetail(apfId: string | number): Promise<FixtureDetailResponse> {
  const id = String(apfId).replace(/^apf-/, '');
  return fetchAPI<FixtureDetailResponse>(`/api/fixture/${id}`);
}

export async function fetchLeagueLiveMatches(leagueSlug: string): Promise<LiveMatchResponse> {
  return fetchAPI<LiveMatchResponse>(`/api/live/${leagueSlug}`);
}

