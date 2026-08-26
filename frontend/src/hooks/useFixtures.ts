'use client';

import { useQuery } from '@tanstack/react-query';
import { isToday } from 'date-fns';
import { fetchAPI } from '@/lib/api';
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
        if (league && league !== 'all') {
          // League-scoped scoreboard
          const res = await fetchAPI<ApiLeagueScoreboardResponse>(
            `/get/soccer/${league}/scoreboard?dates=${dateParam}&tz_offset=7`
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
          `/get/soccer/scoreboard?dates=${dateParam}&tz_offset=7`
        );
        if (res.leagues && res.leagues.length > 0) {
          return res.leagues.map((g: ApiScoreboardLeagueGroup) => ({
            leagueSlug: g.league.slug,
            leagueName: g.league.name,
            leagueLogo: g.league.logo,
            events: g.events ?? [],
          }));
        }
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
