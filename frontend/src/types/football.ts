export interface League {
  _id: string;
  slug: string;
  name: string;
  country: string;
  season: string;
  logo?: string;
}

export interface Club {
  _id: string;
  name: string;
  shortName?: string;
  logo?: string;
  venue?: {
    name: string;
    city: string;
    capacity?: number;
  };
  coach?: string;
}

export interface ApiClubDetailResponse {
  club: {
    id: string;
    name: string;
    displayName: string;
    shortDisplayName?: string;
    abbreviation?: string;
    logo?: string;
    location?: string;
    country?: string;
    city?: string;
    foundedYear?: number;
    venue?: { name?: string };
    isActive: boolean;
  };
  roster: unknown[];
  coach: { name: string | null };
  lastSyncedAt: string;
  meta: {
    catalogSource: string;
    rosterAvailable: boolean;
  };
}

export interface Match {
  _id: string;
  league: League;
  homeTeam: Club;
  awayTeam: Club;
  homeScore?: number;
  awayScore?: number;
  status: 'scheduled' | 'live' | 'finished' | 'postponed' | 'cancelled';
  startTime: string;
  minute?: number;
  venue?: string;
}

export interface MatchEvent {
  _id: string;
  matchId: string;
  type: 'goal' | 'yellow_card' | 'red_card' | 'substitution' | 'var';
  minute: number;
  player: string;
  team: string;
  detail?: string;
}

// Serialized shapes returned by the backend API

export interface ApiLeague {
  id: string;
  slug: string;
  name: string;
  abbreviation?: string;
  country: string;
  logo?: string;
  season?: {
    year?: number;
    display_name?: string;
  } | null;
  active?: boolean;
}

export interface ApiClub {
  id: string;
  name: string;
  displayName: string;
  shortDisplayName?: string;
  abbreviation?: string;
  logo?: string;
  color?: string;
}

export interface ApiCompetitor {
  id: string;
  homeAway: 'home' | 'away';
  score: string | null;
  winner: boolean;
  team: ApiClub;
}

export interface ApiMatchStatus {
  clock: number;
  displayClock: string;
  period: number;
  type: {
    name: string;
    state: 'pre' | 'in' | 'post' | 'unknown';
    completed: boolean;
    description: string;
    detail: string;
    shortDetail: string;
  };
}

export interface ApiCompetition {
  id: string;
  date: string;
  status: ApiMatchStatus;
  competitors: ApiCompetitor[];
  venue?: { displayName?: string } | null;
}

export interface ApiScoreboardEvent {
  id: string;
  date: string;
  name: string;
  shortName: string;
  season?: { year?: number; name?: string } | null;
  competitions: ApiCompetition[];
  status: ApiMatchStatus;
  venue?: { displayName?: string } | null;
}

export interface ApiScoreboardLeagueGroup {
  league: ApiLeague;
  events: ApiScoreboardEvent[];
}

export interface ApiScoreboardResponse {
  meta: {
    date: string;
    leagueCount: number;
    matchCount: number;
    generatedAt: string;
  };
  leagues: ApiScoreboardLeagueGroup[];
}

export interface ApiLeagueScoreboardResponse {
  leagues: ApiLeague[];
  events: ApiScoreboardEvent[];
}

export interface Standing {
  position: number;
  team: Club;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
}

// === API Response Wrappers (match actual backend shapes) ===

export interface ApiLeaguesResponse {
  leagues: ApiLeague[];
  meta: {
    count: number;
    availableOnly: boolean;
    kind: string;
    generatedAt: string;
  };
}

export interface ApiStandingStat {
  abbreviation: string;
  displayValue: string;
  name: string;
}

export interface ApiStandingEntry {
  rank: number;
  team: {
    id: string;
    abbreviation: string;
    displayName: string;
    shortDisplayName?: string;
    name: string;
    logo: string;
    isActive: boolean;
  };
  stats: ApiStandingStat[];
  note: unknown;
}

export interface ApiStandingsGroup {
  id: string;
  abbreviation: string;
  name: string;
  lastSyncedAt: string;
  standings: {
    entries: ApiStandingEntry[];
    season: number;
  };
}

export interface ApiStandingsResponse {
  id: string;
  name: string;
  abbreviation: string;
  season: number;
  children: ApiStandingsGroup[];
}
