'use client';

import { useQuery } from '@tanstack/react-query';
import { isToday } from 'date-fns';
import { fetchAPI, fetchLiveMatches } from '@/lib/api';
import { toScoreboardDateParam } from '@/lib/date';
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

export function useFixtures(date: Date, league?: string) {
  const dateParam = toScoreboardDateParam(date);
  const todayActive = isToday(date);

  const { data, isLoading, error } = useQuery<FixtureGroup[]>({
    queryKey: ['fixtures', dateParam, league ?? 'all'],
    refetchInterval: todayActive ? 15000 : false,
    retry: 1,
    queryFn: async (): Promise<FixtureGroup[]> => {
      try {
        let scoreboardRes;
        let liveRes = null;

        // Fetch live matches concurrently if we're looking at today
        const fetchLive = todayActive ? fetchLiveMatches().catch(() => null) : Promise.resolve(null);

        if (league && league !== 'all') {
          // League-scoped scoreboard
          const [res, live] = await Promise.all([
            fetchAPI<ApiLeagueScoreboardResponse>(`/get/soccer/${league}/scoreboard?dates=${dateParam}&tz_offset=7`),
            fetchLive
          ]);
          scoreboardRes = res;
          liveRes = live;
        } else {
          // Cross-league scoreboard
          const [res, live] = await Promise.all([
            fetchAPI<ApiScoreboardResponse>(`/get/soccer/scoreboard?dates=${dateParam}&tz_offset=7`),
            fetchLive
          ]);
          scoreboardRes = res;
          liveRes = live;
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

        // Enrich with real-time live & finished data from API-Football
        if (liveRes && liveRes.matches && liveRes.matches.length > 0) {
          const liveMatchesMap = new Map();
          const liveMatchesList = liveRes.matches;

          liveMatchesList.forEach((m: any) => {
            if (m.providers?.footballData) {
              liveMatchesMap.set(String(m.providers.footballData), m);
            }
          });

          // Mutate the events to inject live/finished scores
          groups.forEach((group) => {
            group.events = group.events.map((ev) => {
              let liveMatch = liveMatchesMap.get(String(ev.id));

              // Fallback fuzzy match by team names if ID mapping is missing
              if (!liveMatch && ev.competitions && ev.competitions[0]) {
                const homeComp = ev.competitions[0].competitors.find((c: any) => c.homeAway === 'home');
                const awayComp = ev.competitions[0].competitors.find((c: any) => c.homeAway === 'away');
                const evHomeName = (homeComp?.team?.name || homeComp?.team?.displayName || '').toLowerCase();
                const evAwayName = (awayComp?.team?.name || awayComp?.team?.displayName || '').toLowerCase();

                if (evHomeName && evAwayName) {
                  liveMatch = liveMatchesList.find((m: any) => {
                    const mHome = (m.home?.name || '').toLowerCase();
                    const mAway = (m.away?.name || '').toLowerCase();
                    return (mHome.includes(evHomeName) || evHomeName.includes(mHome)) &&
                           (mAway.includes(evAwayName) || evAwayName.includes(mAway));
                  });
                }
              }

              if (liveMatch && ev.competitions && ev.competitions[0]) {
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
