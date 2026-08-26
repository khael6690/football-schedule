export interface MockLeague {
  slug: string;
  name: string;
  country: string;
  logo: string;
}

export interface MockPlayer {
  id: string;
  name: string;
  number: number;
  position: "Goalkeeper" | "Defender" | "Midfielder" | "Forward";
  nationality: string;
}

export interface MockFixture {
  id: string;
  home: string;
  away: string;
  homeLogo: string;
  awayLogo: string;
  homeScore?: number;
  awayScore?: number;
  time: string;
  date: string;
  league: string;
  status: "LIVE" | "UPCOMING" | "FINISHED";
  minute?: string;
}

export interface MockClub {
  id: string;
  leagueSlug: string;
  name: string;
  shortName: string;
  logo: string;
  coach: string;
  venue: string;
  city: string;
  capacity?: string;
  founded?: number;
  rank?: number;
  points?: number;
  squad: MockPlayer[];
  recentFixtures: MockFixture[];
  upcomingFixtures: MockFixture[];
}

export const MOCK_LEAGUES: MockLeague[] = [
  {
    slug: "eng.1",
    name: "Premier League",
    country: "England",
    logo: "https://a.espncdn.com/i/leaguelogos/soccer/500/23.png",
  },
  {
    slug: "esp.1",
    name: "La Liga",
    country: "Spain",
    logo: "https://a.espncdn.com/i/leaguelogos/soccer/500/15.png",
  },
  {
    slug: "ger.1",
    name: "Bundesliga",
    country: "Germany",
    logo: "https://a.espncdn.com/i/leaguelogos/soccer/500/10.png",
  },
  {
    slug: "ita.1",
    name: "Serie A",
    country: "Italy",
    logo: "https://a.espncdn.com/i/leaguelogos/soccer/500/12.png",
  },
  {
    slug: "fra.1",
    name: "Ligue 1",
    country: "France",
    logo: "https://a.espncdn.com/i/leaguelogos/soccer/500/9.png",
  },
  {
    slug: "eu.1",
    name: "Champions League",
    country: "Europe",
    logo: "https://a.espncdn.com/i/leaguelogos/soccer/500/2.png",
  },
];

export const MOCK_TODAYS_MATCHES: MockFixture[] = [
  {
    id: "m1",
    home: "Manchester City",
    away: "Liverpool",
    homeLogo: "https://a.espncdn.com/i/teamlogos/soccer/500/382.png",
    awayLogo: "https://a.espncdn.com/i/teamlogos/soccer/500/364.png",
    time: "17:30",
    date: "2026-08-26",
    league: "Premier League",
    status: "UPCOMING",
  },
  {
    id: "m2",
    home: "AC Milan",
    away: "Inter Milan",
    homeLogo: "https://a.espncdn.com/i/teamlogos/soccer/500/103.png",
    awayLogo: "https://a.espncdn.com/i/teamlogos/soccer/500/110.png",
    time: "20:45",
    date: "2026-08-26",
    league: "Serie A",
    status: "UPCOMING",
  },
  {
    id: "m3",
    home: "Borussia Dortmund",
    away: "RB Leipzig",
    homeLogo: "https://a.espncdn.com/i/teamlogos/soccer/500/124.png",
    awayLogo: "https://a.espncdn.com/i/teamlogos/soccer/500/11420.png",
    time: "18:30",
    date: "2026-08-26",
    league: "Bundesliga",
    status: "UPCOMING",
  },
  {
    id: "m4",
    home: "Atletico Madrid",
    away: "Sevilla",
    homeLogo: "https://a.espncdn.com/i/teamlogos/soccer/500/1068.png",
    awayLogo: "https://a.espncdn.com/i/teamlogos/soccer/500/243.png",
    time: "21:00",
    date: "2026-08-26",
    league: "La Liga",
    status: "UPCOMING",
  },
  {
    id: "m5",
    home: "Arsenal",
    away: "Chelsea",
    homeLogo: "https://a.espncdn.com/i/teamlogos/soccer/500/359.png",
    awayLogo: "https://a.espncdn.com/i/teamlogos/soccer/500/363.png",
    homeScore: 2,
    awayScore: 1,
    time: "LIVE",
    date: "2026-08-26",
    league: "Premier League",
    status: "LIVE",
    minute: "78'",
  },
  {
    id: "m6",
    home: "Real Madrid",
    away: "Barcelona",
    homeLogo: "https://a.espncdn.com/i/teamlogos/soccer/500/86.png",
    awayLogo: "https://a.espncdn.com/i/teamlogos/soccer/500/83.png",
    homeScore: 3,
    awayScore: 2,
    time: "FT",
    date: "2026-08-26",
    league: "La Liga",
    status: "FINISHED",
  },
];

export const MOCK_CLUBS: Record<string, MockClub> = {
  "81": {
    id: "81",
    leagueSlug: "esp.1",
    name: "FC Barcelona",
    shortName: "Barcelona",
    logo: "https://a.espncdn.com/i/teamlogos/soccer/500/83.png",
    coach: "Hansi Flick",
    venue: "Spotify Camp Nou",
    city: "Barcelona",
    capacity: "99,354",
    founded: 1899,
    rank: 1,
    points: 62,
    squad: [
      { id: "p1", name: "Marc-André ter Stegen", number: 1, position: "Goalkeeper", nationality: "Germany" },
      { id: "p2", name: "Iñaki Peña", number: 13, position: "Goalkeeper", nationality: "Spain" },
      { id: "p3", name: "Pau Cubarsí", number: 2, position: "Defender", nationality: "Spain" },
      { id: "p4", name: "Alejandro Balde", number: 3, position: "Defender", nationality: "Spain" },
      { id: "p5", name: "Ronald Araújo", number: 4, position: "Defender", nationality: "Uruguay" },
      { id: "p6", name: "Iñigo Martínez", number: 5, position: "Defender", nationality: "Spain" },
      { id: "p7", name: "Jules Koundé", number: 23, position: "Defender", nationality: "France" },
      { id: "p8", name: "Gavi", number: 6, position: "Midfielder", nationality: "Spain" },
      { id: "p9", name: "Pedri", number: 8, position: "Midfielder", nationality: "Spain" },
      { id: "p10", name: "Frenkie de Jong", number: 21, position: "Midfielder", nationality: "Netherlands" },
      { id: "p11", name: "Marc Casadó", number: 17, position: "Midfielder", nationality: "Spain" },
      { id: "p12", name: "Dani Olmo", number: 20, position: "Midfielder", nationality: "Spain" },
      { id: "p13", name: "Robert Lewandowski", number: 9, position: "Forward", nationality: "Poland" },
      { id: "p14", name: "Lamine Yamal", number: 19, position: "Forward", nationality: "Spain" },
      { id: "p15", name: "Raphinha", number: 11, position: "Forward", nationality: "Brazil" },
      { id: "p16", name: "Ferran Torres", number: 7, position: "Forward", nationality: "Spain" },
    ],
    recentFixtures: [
      { id: "f1", home: "Barcelona", away: "Valencia", homeLogo: "https://a.espncdn.com/i/teamlogos/soccer/500/83.png", awayLogo: "https://a.espncdn.com/i/teamlogos/soccer/500/94.png", homeScore: 3, awayScore: 1, time: "FT", date: "2026-08-20", league: "La Liga", status: "FINISHED" },
      { id: "f2", home: "Real Betis", away: "Barcelona", homeLogo: "https://a.espncdn.com/i/teamlogos/soccer/500/244.png", awayLogo: "https://a.espncdn.com/i/teamlogos/soccer/500/83.png", homeScore: 1, awayScore: 2, time: "FT", date: "2026-08-15", league: "La Liga", status: "FINISHED" },
    ],
    upcomingFixtures: [
      { id: "f3", home: "Barcelona", away: "Atletico Madrid", homeLogo: "https://a.espncdn.com/i/teamlogos/soccer/500/83.png", awayLogo: "https://a.espncdn.com/i/teamlogos/soccer/500/1068.png", time: "21:00", date: "2026-08-30", league: "La Liga", status: "UPCOMING" },
      { id: "f4", home: "Sevilla", away: "Barcelona", homeLogo: "https://a.espncdn.com/i/teamlogos/soccer/500/243.png", awayLogo: "https://a.espncdn.com/i/teamlogos/soccer/500/83.png", time: "19:00", date: "2026-09-04", league: "La Liga", status: "UPCOMING" },
    ],
  },
  "57": {
    id: "57",
    leagueSlug: "eng.1",
    name: "Arsenal FC",
    shortName: "Arsenal",
    logo: "https://a.espncdn.com/i/teamlogos/soccer/500/359.png",
    coach: "Mikel Arteta",
    venue: "Emirates Stadium",
    city: "London",
    capacity: "60,704",
    founded: 1886,
    rank: 2,
    points: 58,
    squad: [
      { id: "ap1", name: "David Raya", number: 22, position: "Goalkeeper", nationality: "Spain" },
      { id: "ap2", name: "Neto", number: 32, position: "Goalkeeper", nationality: "Brazil" },
      { id: "ap3", name: "William Saliba", number: 2, position: "Defender", nationality: "France" },
      { id: "ap4", name: "Gabriel Magalhães", number: 6, position: "Defender", nationality: "Brazil" },
      { id: "ap5", name: "Ben White", number: 4, position: "Defender", nationality: "England" },
      { id: "ap6", name: "Riccardo Calafiori", number: 33, position: "Defender", nationality: "Italy" },
      { id: "ap7", name: "Jurriën Timber", number: 12, position: "Defender", nationality: "Netherlands" },
      { id: "ap8", name: "Martin Ødegaard", number: 8, position: "Midfielder", nationality: "Norway" },
      { id: "ap9", name: "Declan Rice", number: 41, position: "Midfielder", nationality: "England" },
      { id: "ap10", name: "Mikel Merino", number: 23, position: "Midfielder", nationality: "Spain" },
      { id: "ap11", name: "Thomas Partey", number: 5, position: "Midfielder", nationality: "Ghana" },
      { id: "ap12", name: "Bukayo Saka", number: 7, position: "Forward", nationality: "England" },
      { id: "ap13", name: "Gabriel Martinelli", number: 11, position: "Forward", nationality: "Brazil" },
      { id: "ap14", name: "Kai Havertz", number: 29, position: "Forward", nationality: "Germany" },
      { id: "ap15", name: "Gabriel Jesus", number: 9, position: "Forward", nationality: "Brazil" },
      { id: "ap16", name: "Leandro Trossard", number: 19, position: "Forward", nationality: "Belgium" },
    ],
    recentFixtures: [
      { id: "af1", home: "Arsenal", away: "Chelsea", homeLogo: "https://a.espncdn.com/i/teamlogos/soccer/500/359.png", awayLogo: "https://a.espncdn.com/i/teamlogos/soccer/500/363.png", homeScore: 2, awayScore: 1, time: "LIVE 78'", date: "2026-08-26", league: "Premier League", status: "LIVE" },
      { id: "af2", home: "Aston Villa", away: "Arsenal", homeLogo: "https://a.espncdn.com/i/teamlogos/soccer/500/362.png", awayLogo: "https://a.espncdn.com/i/teamlogos/soccer/500/359.png", homeScore: 0, awayScore: 2, time: "FT", date: "2026-08-22", league: "Premier League", status: "FINISHED" },
    ],
    upcomingFixtures: [
      { id: "af3", home: "Arsenal", away: "Tottenham", homeLogo: "https://a.espncdn.com/i/teamlogos/soccer/500/359.png", awayLogo: "https://a.espncdn.com/i/teamlogos/soccer/500/367.png", time: "16:30", date: "2026-09-01", league: "Premier League", status: "UPCOMING" },
      { id: "af4", home: "Manchester City", away: "Arsenal", homeLogo: "https://a.espncdn.com/i/teamlogos/soccer/500/382.png", awayLogo: "https://a.espncdn.com/i/teamlogos/soccer/500/359.png", time: "17:30", date: "2026-09-07", league: "Premier League", status: "UPCOMING" },
    ],
  },
};
