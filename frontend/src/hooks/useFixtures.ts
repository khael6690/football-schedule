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

        // Enrich with real-time live data
        if (liveRes && liveRes.matches && liveRes.matches.length > 0) {
          const liveMatchesMap = new Map();
          liveRes.matches.forEach((m: any) => {
            if (m.providers?.footballData) {
              liveMatchesMap.set(m.providers.footballData, m);
            }
          });

          // Mutate the events to inject live scores
          groups.forEach((group) => {
            group.events = group.events.map((ev) => {
              const liveMatch = liveMatchesMap.get(ev.id);
              if (liveMatch && ev.competitions && ev.competitions[0]) {
                // Update score
                ev.competitions[0].competitors.forEach((c) => {
                  if (c.homeAway === 'home') c.score = String(liveMatch.score.home);
                  if (c.homeAway === 'away') c.score = String(liveMatch.score.away);
                });

                // Update status
                if (ev.status && ev.status.type) {
                  ev.status.type.state = liveMatch.status.state as any;
                  ev.status.type.shortDetail = liveMatch.status.short || ev.status.type.shortDetail;
                  ev.status.type.detail = liveMatch.status.long || ev.status.type.detail;
                  if (liveMatch.status.elapsed) {
                    ev.status.clock = liveMatch.status.elapsed * 60;
                    ev.status.displayClock = `${liveMatch.status.elapsed}'`;
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
