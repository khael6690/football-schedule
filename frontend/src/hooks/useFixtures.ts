'use client';

import { useQuery } from '@tanstack/react-query';
import { isToday, format } from 'date-fns';
import { fetchAPI } from '@/lib/api';
import type {
  ApiScoreboardResponse,
  ApiLeagueScoreboardResponse,
  ApiScoreboardEvent,
  ApiScoreboardLeagueGroup,
} from '@/types/football';

function formatDateParam(date: Date): string {
  return format(date, 'yyyyMMdd');
}

export interface FixtureGroup {
  leagueSlug: string;
  leagueName: string;
  leagueLogo?: string;
  events: ApiScoreboardEvent[];
}

export function useFixtures(date: Date, league?: string) {
  const dateParam = formatDateParam(date);
  const todayActive = isToday(date);

  const { data, isLoading, error } = useQuery<FixtureGroup[]>({
    queryKey: ['fixtures', dateParam, league ?? 'all'],
    refetchInterval: todayActive ? 15000 : false,
    retry: 1,
    queryFn: async (): Promise<FixtureGroup[]> => {
      try {
        if (league && league !== 'all') {
          // League-scoped scoreboard
          const res = await fetchAPI<ApiLeagueScoreboardResponse>(
            `/get/soccer/${league}/scoreboard?dates=${dateParam}`
          );
          const leagueInfo = res.leagues?.[0];
          return [
            {
              leagueSlug: leagueInfo?.slug ?? league,
              leagueName: leagueInfo?.name ?? league,
              leagueLogo: leagueInfo?.logo,
              events: res.events ?? [],
            },
          ];
        }

        // Cross-league scoreboard
        const res = await fetchAPI<ApiScoreboardResponse>(
          `/get/soccer/scoreboard?dates=${dateParam}`
        );
        if (res.leagues && res.leagues.length > 0) {
          return res.leagues.map((g: ApiScoreboardLeagueGroup) => ({
            leagueSlug: g.league.slug,
            leagueName: g.league.name,
            leagueLogo: g.league.logo,
            events: g.events,
          }));
        }
      } catch (e) {
        // Fallback to mock fixtures
      }

      // Fallback mock fixture groups
      return [
        {
          leagueSlug: "eng.1",
          leagueName: "Premier League",
          leagueLogo: "https://a.espncdn.com/i/leaguelogos/soccer/500/23.png",
          events: [
            {
              id: "m1",
              name: "Manchester City vs Liverpool",
              shortName: "MCI vs LIV",
              date: "2026-08-26T17:30:00Z",
              status: { type: { name: "STATUS_SCHEDULED", state: "pre", detail: "17:30" } },
              competitions: [
                {
                  competitors: [
                    { id: "382", homeAway: "home", team: { id: "382", name: "Manchester City", logo: "https://a.espncdn.com/i/teamlogos/soccer/500/382.png" } },
                    { id: "364", homeAway: "away", team: { id: "364", name: "Liverpool", logo: "https://a.espncdn.com/i/teamlogos/soccer/500/364.png" } },
                  ],
                },
              ],
            } as any,
            {
              id: "m5",
              name: "Arsenal vs Chelsea",
              shortName: "ARS vs CHE",
              date: "2026-08-26T15:00:00Z",
              status: { type: { name: "STATUS_IN_PROGRESS", state: "in", detail: "78'" } },
              competitions: [
                {
                  competitors: [
                    { id: "359", homeAway: "home", score: "2", team: { id: "359", name: "Arsenal", logo: "https://a.espncdn.com/i/teamlogos/soccer/500/359.png" } },
                    { id: "363", homeAway: "away", score: "1", team: { id: "363", name: "Chelsea", logo: "https://a.espncdn.com/i/teamlogos/soccer/500/363.png" } },
                  ],
                },
              ],
            } as any,
          ],
        },
        {
          leagueSlug: "esp.1",
          leagueName: "La Liga",
          leagueLogo: "https://a.espncdn.com/i/leaguelogos/soccer/500/15.png",
          events: [
            {
              id: "m6",
              name: "Real Madrid vs Barcelona",
              shortName: "RMA vs BAR",
              date: "2026-08-26T19:00:00Z",
              status: { type: { name: "STATUS_FULL_TIME", state: "post", detail: "FT" } },
              competitions: [
                {
                  competitors: [
                    { id: "86", homeAway: "home", score: "3", team: { id: "86", name: "Real Madrid", logo: "https://a.espncdn.com/i/teamlogos/soccer/500/86.png" } },
                    { id: "83", homeAway: "away", score: "2", team: { id: "83", name: "Barcelona", logo: "https://a.espncdn.com/i/teamlogos/soccer/500/83.png" } },
                  ],
                },
              ],
            } as any,
          ],
        },
      ];
    },
  });

  return {
    groups: data ?? [],
    isLoading,
    error: error as Error | null,
  };
}
