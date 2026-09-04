/**
 * FixtureDetail — contract returned by GET /api/fixture/:apfId
 * (normalized from API-Football `GET /fixtures?id=`).
 */

export type FixtureState = 'pre' | 'in' | 'post' | 'unknown';

export type FixtureEventType = 'Goal' | 'Card' | 'subst' | 'Var';

export interface FixtureScorePair {
  home: number | null;
  away: number | null;
}

export interface FixtureLeague {
  id: number | null;
  name: string | null;
  logo: string | null;
  country: string | null;
  season: number | null;
  round: string | null;
}

export interface FixtureVenue {
  name: string | null;
  city: string | null;
}

export interface FixtureStatus {
  short: string | null;
  long: string | null;
  elapsed: number | null;
  state: FixtureState;
}

export interface FixtureTeam {
  id: number | null;
  name: string | null;
  logo: string | null;
  winner: boolean | null;
}

export interface FixtureEvent {
  minute: number;
  extra: number | null;
  teamId: number | null;
  teamName: string;
  player: string | null;
  assist: string | null;
  type: FixtureEventType;
  detail: string;
  comments: string | null;
}

export interface FixtureLineupPlayer {
  id: number | null;
  name: string;
  number: number | null;
  pos: string | null;
  grid: string | null;
}

export interface FixtureLineupSubstitute {
  id: number | null;
  name: string;
  number: number | null;
  pos: string | null;
}

export interface FixtureLineup {
  teamId: number | null;
  teamName: string;
  teamLogo: string | null;
  formation: string | null;
  coach: string | null;
  startXI: FixtureLineupPlayer[];
  substitutes: FixtureLineupSubstitute[];
}

export interface FixtureStatItem {
  type: string;
  value: number | string | null;
}

export interface FixtureTeamStatistics {
  teamId: number | null;
  teamName: string;
  stats: FixtureStatItem[];
}

export interface FixtureDetail {
  id: number;
  league: FixtureLeague;
  date: string;
  venue: FixtureVenue | null;
  referee: string | null;
  status: FixtureStatus;
  home: FixtureTeam;
  away: FixtureTeam;
  goals: FixtureScorePair;
  score: {
    halftime: FixtureScorePair;
    fulltime: FixtureScorePair;
    extratime: FixtureScorePair;
    penalty: FixtureScorePair;
  };
  events: FixtureEvent[];
  lineups: FixtureLineup[];
  statistics: FixtureTeamStatistics[];
}

export interface FixtureDetailResponse {
  meta: {
    source: string;
    ttl: number;
    generatedAt: string;
  };
  fixture: FixtureDetail;
}
