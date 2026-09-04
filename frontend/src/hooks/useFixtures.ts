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

          // Helper to normalize team names for resilient matching
          const cleanTeam = (name: string): string => {
            return String(name || '')
              .toLowerCase()
              .normalize('NFKD')
              .replace(/[\u0300-\u036f]/g, '')
              .replace(/[^a-z0-9]/g, ' ')
              .replace(/\b(fc|cf|afc|bc|ac|sc|club|de|del|la)\b/g, '')
              .replace(/\s+/g, ' ')
              .trim();
          };

          // Mutate the events to inject live/finished scores
          groups.forEach((group) => {
            group.events = group.events.map((ev) => {
              let hit: EnrichItem | undefined = liveMatchesMap.get(String(ev.id));

              // Fallback fuzzy match by team names if ID mapping is missing
              if (!hit && ev.competitions && ev.competitions[0]) {
                const homeComp = ev.competitions[0].competitors.find((c: any) => c.homeAway === 'home');
                const awayComp = ev.competitions[0].competitors.find((c: any) => c.homeAway === 'away');
                const evHomeRaw = (homeComp?.team?.name || homeComp?.team?.displayName || '').toLowerCase();
                const evAwayRaw = (awayComp?.team?.name || awayComp?.team?.displayName || '').toLowerCase();
                const evHomeClean = cleanTeam(evHomeRaw);
                const evAwayClean = cleanTeam(evAwayRaw);

                if (evHomeRaw && evAwayRaw) {
                  hit = enrichSource.find(({ m }) => {
                    const mHomeRaw = (m.home?.name || '').toLowerCase();
                    const mAwayRaw = (m.away?.name || '').toLowerCase();
                    const mHomeClean = cleanTeam(mHomeRaw);
                    const mAwayClean = cleanTeam(mAwayRaw);

                    const homeMatches =
                      mHomeRaw.includes(evHomeRaw) ||
                      evHomeRaw.includes(mHomeRaw) ||
                      (Boolean(evHomeClean && mHomeClean) && (mHomeClean.includes(evHomeClean) || evHomeClean.includes(mHomeClean)));

                    const awayMatches =
                      mAwayRaw.includes(evAwayRaw) ||
                      evAwayRaw.includes(mAwayRaw) ||
                      (Boolean(evAwayClean && mAwayClean) && (mAwayClean.includes(evAwayClean) || evAwayClean.includes(mAwayClean)));

                    return homeMatches && awayMatches;
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

        // Fallback: if scoreboard returned no leagues/events for this date, synthesize groups from byDateRes
        if ((groups.length === 0 || groups.every(g => g.events.length === 0)) && byDateRes?.fixtures && byDateRes.fixtures.length > 0) {
          const leagueMap: Record<string, string> = {
            'Premier League': 'eng.1',
            'Primera Division': 'esp.1',
            'La Liga': 'esp.1',
            'Bundesliga': 'ger.1',
            'Serie A': 'ita.1',
            'Ligue 1': 'fra.1',
            'UEFA Champions League': 'uefa.cl',
          };

          const groupedByLeague = new Map<string, { leagueName: string; leagueLogo?: string; events: any[] }>();

          for (const f of byDateRes.fixtures) {
            const lName = f.league?.name || 'Other';
            const slug = f.league?.slug || leagueMap[lName] || lName.toLowerCase().replace(/[^a-z0-9]/g, '.');

            if (league && league !== 'all' && slug !== league) {
              continue;
            }

            if (!groupedByLeague.has(slug)) {
              groupedByLeague.set(slug, {
                leagueName: lName,
                leagueLogo: f.league?.logo || undefined,
                events: [],
              });
            }

            const apfRaw = f.providers?.apiFootball ?? String(f.id ?? '').replace(/^apf-/, '');
            const apfNum = Number(apfRaw);
            const isFinished = f.status?.state === 'post';
            const isLive = f.status?.state === 'in';

            const ev: any = {
              id: f.id,
              date: f.kickoff,
              name: `${f.home?.name || 'Home'} vs ${f.away?.name || 'Away'}`,
              competitions: [
                {
                  id: f.id,
                  date: f.kickoff,
                  competitors: [
                    {
                      id: String(f.home?.id || 'home'),
                      homeAway: 'home',
                      score: f.score?.home != null ? String(f.score.home) : null,
                      winner: (f.home as { winner?: boolean })?.winner ?? ((f.score?.home ?? 0) > (f.score?.away ?? 0)),
                      team: {
                        id: String(f.home?.id || 'home'),
                        name: f.home?.name || 'Home',
                        displayName: f.home?.name || 'Home',
                        shortDisplayName: f.home?.name || 'Home',
                        logo: f.home?.logo || '',
                      },
                    },
                    {
                      id: String(f.away?.id || 'away'),
                      homeAway: 'away',
                      score: f.score?.away != null ? String(f.score.away) : null,
                      winner: (f.away as { winner?: boolean })?.winner ?? ((f.score?.away ?? 0) > (f.score?.home ?? 0)),
                      team: {
                        id: String(f.away?.id || 'away'),
                        name: f.away?.name || 'Away',
                        displayName: f.away?.name || 'Away',
                        shortDisplayName: f.away?.name || 'Away',
                        logo: f.away?.logo || '',
                      },
                    },
                  ],
                },
              ],
              status: {
                clock: f.status?.elapsed ? f.status.elapsed * 60 : 0,
                displayClock: isFinished ? 'FT' : f.status?.elapsed ? `${f.status.elapsed}'` : '',
                type: {
                  name: isFinished ? 'FINAL' : isLive ? 'STATUS_IN_PROGRESS' : 'SCHEDULED',
                  state: f.status?.state || 'unknown',
                  completed: isFinished,
                  description: f.status?.long || '',
                  detail: f.status?.long || '',
                  shortDetail: f.status?.short || (isFinished ? 'FT' : ''),
                },
              },
              apfId: Number.isFinite(apfNum) && apfNum > 0 ? apfNum : undefined,
            };

            groupedByLeague.get(slug)!.events.push(ev);
          }

          groups = Array.from(groupedByLeague.entries()).map(([slug, data]) => ({
            leagueSlug: slug,
            leagueName: data.leagueName,
            leagueLogo: data.leagueLogo,
            events: data.events,
          }));
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
