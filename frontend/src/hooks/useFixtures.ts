'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchAPI, fetchLiveMatches, fetchFinishedMatches, fetchFixturesByDate } from '@/lib/api';
import { toScoreboardDateParam, toIsoDateParam, isWibToday } from '@/lib/date';
import type {
  ApiScoreboardResponse,
  ApiLeagueScoreboardResponse,
  ApiScoreboardEvent,
  ApiScoreboardLeagueGroup,
} from '@/types/football';

export interface FixtureGroup {
  leagueSlug: string;
  leagueName: string;
  leagueLogo?: string;
  isMock?: boolean;
  events: ApiScoreboardEvent[];
}

type EnrichTier = 'live' | 'finished' | 'byDate';
type EnrichItem = { tier: EnrichTier; m: any };

/** Client staleTime mirroring backend /api/fixtures/date TTL policy (WIB days). */
function staleTimeForDate(date: Date): number {
  const d = toScoreboardDateParam(date);
  const t = toScoreboardDateParam(new Date());
  if (d < t) return 60 * 60 * 1000;   // past: 1h
  if (d > t) return 30 * 60 * 1000;   // future: 30m
  return 60 * 1000;                   // today: 60s
}

export function useFixtures(date: Date, league?: string) {
  const dateParam = toScoreboardDateParam(date);
  const isoDate = toIsoDateParam(date);
  const todayActive = isWibToday(date);

  const { data, isLoading, error } = useQuery<FixtureGroup[]>({
    queryKey: ['fixtures', dateParam, league ?? 'all'],
    refetchInterval: todayActive ? 15000 : false,
    staleTime: staleTimeForDate(date),
    retry: 1,
    queryFn: async (): Promise<FixtureGroup[]> => {
      try {
        let scoreboardRes;
        let liveRes = null;
        let finishedRes = null;
        let byDateRes = null;

        // Today: live + finished (real-time) + byDate as last-resort fallback (NS matches).
        // Non-today: byDate only (gives apfId + final scores for past dates).
        const fetchLive = todayActive ? fetchLiveMatches().catch(() => null) : Promise.resolve(null);
        const fetchFinished = todayActive ? fetchFinishedMatches().catch(() => null) : Promise.resolve(null);
        const fetchByDate = fetchFixturesByDate(isoDate).catch(() => null);

        if (league && league !== 'all') {
          // League-scoped scoreboard
          const [res, live, finished, byDate] = await Promise.all([
            fetchAPI<ApiLeagueScoreboardResponse>(`/get/soccer/${league}/scoreboard?dates=${dateParam}&tz_offset=7`),
            fetchLive,
            fetchFinished,
            fetchByDate
          ]);
          scoreboardRes = res;
          liveRes = live;
          finishedRes = finished;
          byDateRes = byDate;
        } else {
          // Cross-league scoreboard
          const [res, live, finished, byDate] = await Promise.all([
            fetchAPI<ApiScoreboardResponse>(`/get/soccer/scoreboard?dates=${dateParam}&tz_offset=7`),
            fetchLive,
            fetchFinished,
            fetchByDate
          ]);
          scoreboardRes = res;
          liveRes = live;
          finishedRes = finished;
          byDateRes = byDate;
        }

        // Process scoreboard data
        let groups: FixtureGroup[] = [];

        if ('leagues' in scoreboardRes && Array.isArray((scoreboardRes as any).leagues) && (scoreboardRes as any).leagues.length > 0) {
          if (league && league !== 'all') {
            const leagueInfo = (scoreboardRes as ApiLeagueScoreboardResponse).leagues?.[0];
            groups = [
              {
                leagueSlug: leagueInfo?.slug ?? league,
                leagueName: leagueInfo?.name ?? league,
                leagueLogo: leagueInfo?.logo,
                events: (scoreboardRes as ApiLeagueScoreboardResponse).events ?? [],
              },
            ];
          } else {
            groups = (scoreboardRes as ApiScoreboardResponse).leagues.map((g: ApiScoreboardLeagueGroup) => ({
              leagueSlug: g.league?.slug ?? '',
              leagueName: g.league?.name ?? '',
              leagueLogo: g.league?.logo,
              events: g.events ?? [],
            }));
          }
        }

        // Enrich with API-Football data. Priority: live > finished > byDate.
        // First hit wins per ESPN event, so byDate never overwrites live/finished.
        const enrichSource: EnrichItem[] = [
          ...(liveRes?.matches ?? []).map((m: any) => ({ tier: 'live' as const, m })),
          ...(finishedRes?.matches ?? []).map((m: any) => ({ tier: 'finished' as const, m })),
          ...(byDateRes?.fixtures ?? []).map((m: any) => ({ tier: 'byDate' as const, m })),
        ];
        if (enrichSource.length > 0) {
          // footballData id -> first (highest-priority) item
          const liveMatchesMap = new Map<string, EnrichItem>();
          enrichSource.forEach((item) => {
            const fd = item.m.providers?.footballData;
            if (fd && !liveMatchesMap.has(String(fd))) {
              liveMatchesMap.set(String(fd), item);
            }
          });

          // Mutate the events to inject live/finished scores
          groups.forEach((group) => {
            group.events = group.events.map((ev) => {
              let hit: EnrichItem | undefined = liveMatchesMap.get(String(ev.id));

              // Fallback fuzzy match by team names if ID mapping is missing
              if (!hit && ev.competitions && ev.competitions[0]) {
                const homeComp = ev.competitions[0].competitors.find((c: any) => c.homeAway === 'home');
                const awayComp = ev.competitions[0].competitors.find((c: any) => c.homeAway === 'away');
                const evHomeName = (homeComp?.team?.name || homeComp?.team?.displayName || '').toLowerCase();
                const evAwayName = (awayComp?.team?.name || awayComp?.team?.displayName || '').toLowerCase();

                if (evHomeName && evAwayName) {
                  hit = enrichSource.find(({ m }) => {
                    const mHome = (m.home?.name || '').toLowerCase();
                    const mAway = (m.away?.name || '').toLowerCase();
                    return (mHome.includes(evHomeName) || evHomeName.includes(mHome)) &&
                           (mAway.includes(evAwayName) || evAwayName.includes(mAway));
                  });
                }
              }

              if (hit && ev.competitions && ev.competitions[0]) {
                const liveMatch = hit.m;

                // Attach API-Football fixture id for detail page lookup (/api/fixture/:apfId)
                const apfRaw = liveMatch.providers?.apiFootball ?? String(liveMatch.id ?? '').replace(/^apf-/, '');
                const apfNum = Number(apfRaw);
                if (Number.isFinite(apfNum) && apfNum > 0) {
                  ev.apfId = apfNum;
                }

                // byDate is schedule-grade data: only use its score/status when the
                // match is final there AND the ESPN event isn't already final with a score.
                if (hit.tier === 'byDate') {
                  const byDateFinal = liveMatch.status?.state === 'post';
                  const evHasFinalScore =
                    ev.status?.type?.state === 'post' &&
                    ev.competitions[0].competitors.every((c: any) => c.score != null);
                  if (!byDateFinal || evHasFinalScore) {
                    return ev;
                  }
                }

                // Update score if liveMatch has non-null score
                if (liveMatch.score?.home !== undefined && liveMatch.score?.home !== null) {
                  ev.competitions[0].competitors.forEach((c) => {
                    if (c.homeAway === 'home') c.score = String(liveMatch.score.home);
                    if (c.homeAway === 'away') c.score = String(liveMatch.score.away);
                  });
                }

                // Update status
                if (ev.status && ev.status.type) {
                  const state = liveMatch.status?.state;
                  if (state === 'post' || state === 'in') {
                    ev.status.type.state = state as any;
                    ev.status.type.shortDetail = liveMatch.status?.short || (state === 'post' ? 'FT' : ev.status.type.shortDetail);
                    ev.status.type.detail = liveMatch.status?.long || ev.status.type.detail;
                    if (liveMatch.status?.elapsed && state === 'in') {
                      ev.status.clock = liveMatch.status.elapsed * 60;
                      ev.status.displayClock = `${liveMatch.status.elapsed}'`;
                    } else if (state === 'post') {
                      ev.status.displayClock = 'FT';
                    }
                  }
                }
              }
              return ev;
            });
          });
        }

        return groups;
      } catch (e) {
        console.warn('Failed to fetch fixtures:', e);
      }

      return [];
    },
  });

  return {
    groups: data ?? [],
    isLoading,
    error: error as Error | null,
  };
}
