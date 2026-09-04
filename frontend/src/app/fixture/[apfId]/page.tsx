'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import { useFixtureDetail } from '@/hooks/useFixtureDetail';
import { formatKickoffTime, formatFullMatchDate } from '@/lib/date';
import { cn } from '@/lib/utils';
import {
  ArrowLeft,
  Calendar,
  MapPin,
  BarChart2,
  Clock,
  Shirt,
  AlertCircle,
  Footprints,
  Users,
} from 'lucide-react';
import type { FixtureDetail } from '@/types/fixtureDetail';

interface PageProps {
  params: Promise<{ apfId: string }>;
}

export default function FixtureDetailPage({ params }: PageProps) {
  const resolvedParams = use(params);
  const apfId = resolvedParams.apfId;
  const { data: fixture, isLoading, isError, error } = useFixtureDetail(apfId);
  const [activeTab, setActiveTab] = useState<'timeline' | 'lineups' | 'stats'>('timeline');

  if (isLoading) {
    return <FixtureDetailSkeleton />;
  }

  if (isError || !fixture) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center flex flex-col items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-400">
          <AlertCircle className="w-7 h-7" />
        </div>
        <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
          Pertandingan tidak ditemukan
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-md">
          {error instanceof Error ? error.message : 'Data pertandingan belum tersedia atau ID tidak valid.'}
        </p>
        <Link
          href="/fixtures"
          className="inline-flex items-center gap-2 px-4 py-2 mt-2 rounded-lg bg-green-600 hover:bg-green-700 text-white font-medium text-sm transition"
        >
          <ArrowLeft className="w-4 h-4" /> Kembali ke Jadwal
        </Link>
      </div>
    );
  }

  const { league, status, home, away, goals, score, events, lineups, statistics } = fixture;
  const isLive = status.state === 'in';
  const isFinished = status.state === 'post';
  const isPre = status.state === 'pre';

  const homeName = home.name || 'Home';
  const awayName = away.name || 'Away';
  const leagueName = league.name || 'Liga';

  const kickoffTime = formatKickoffTime(fixture.date, true);
  const matchDate = formatFullMatchDate(fixture.date);

  return (
    <div className="min-h-screen pb-16">
      {/* Top breadcrumb navigation */}
      <div className="max-w-4xl mx-auto px-4 pt-5 pb-3">
        <Link
          href="/fixtures"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-500 dark:text-zinc-400 hover:text-green-600 dark:hover:text-green-400 transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Semua Jadwal Pertandingan
        </Link>
      </div>

      {/* Main Score & Header Card */}
      <div className="max-w-4xl mx-auto px-4 mb-6">
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 sm:p-6 shadow-xs">
          {/* League & Meta bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 pb-4 mb-4 border-b border-zinc-100 dark:border-zinc-800 text-xs text-zinc-500 dark:text-zinc-400">
            <div className="flex items-center gap-2 min-w-0">
              {league.logo && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={league.logo}
                  alt={leagueName}
                  className="w-5 h-5 object-contain shrink-0"
                />
              )}
              <span className="font-semibold text-zinc-800 dark:text-zinc-200 truncate">
                {leagueName}
              </span>
              {league.round && (
                <span className="hidden sm:inline text-zinc-400 dark:text-zinc-500">
                  • {league.round}
                </span>
              )}
            </div>

            <div className="flex items-center gap-3 shrink-0 text-[11px] sm:text-xs">
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                {matchDate}
              </span>
              {fixture.venue?.name && (
                <span className="hidden sm:flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-zinc-400" />
                  {fixture.venue.name}{fixture.venue.city ? `, ${fixture.venue.city}` : ''}
                </span>
              )}
            </div>
          </div>

          {/* Match Score Board */}
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 sm:gap-6 py-2">
            {/* Home Team */}
            <div className="flex flex-col items-center sm:flex-row sm:justify-end gap-2 sm:gap-4 text-center sm:text-right min-w-0">
              <div className="order-2 sm:order-1 min-w-0 w-full sm:w-auto">
                <p
                  className={cn(
                    'text-sm sm:text-base md:text-lg font-bold truncate leading-tight',
                    home.winner
                      ? 'text-zinc-950 dark:text-zinc-50'
                      : 'text-zinc-800 dark:text-zinc-200'
                  )}
                  title={homeName}
                >
                  {homeName}
                </p>
                {home.winner && (
                  <span className="inline-block mt-0.5 text-[10px] uppercase font-bold tracking-wider text-green-600 dark:text-green-400">
                    Pemenang
                  </span>
                )}
              </div>
              <div className="order-1 sm:order-2 w-12 h-12 sm:w-16 sm:h-16 shrink-0 flex items-center justify-center">
                {home.logo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={home.logo}
                    alt={homeName}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center font-bold text-zinc-600">
                    {homeName.slice(0, 2)}
                  </div>
                )}
              </div>
            </div>

            {/* Score / Center Status */}
            <div className="flex flex-col items-center justify-center px-2 sm:px-4 shrink-0">
              {/* Score Display */}
              {isPre ? (
                <div className="text-xl sm:text-3xl font-mono font-bold text-zinc-400 dark:text-zinc-500">
                  VS
                </div>
              ) : (
                <div className="flex items-center gap-1.5 sm:gap-3 text-3xl sm:text-5xl font-mono font-bold tracking-tight">
                  <span className={home.winner ? 'text-zinc-950 dark:text-zinc-50' : 'text-zinc-800 dark:text-zinc-200'}>
                    {goals.home ?? 0}
                  </span>
                  <span className="text-zinc-300 dark:text-zinc-700">–</span>
                  <span className={away.winner ? 'text-zinc-950 dark:text-zinc-50' : 'text-zinc-800 dark:text-zinc-200'}>
                    {goals.away ?? 0}
                  </span>
                </div>
              )}

              {/* Status Badge */}
              <div className="mt-2">
                {isLive ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-red-600 text-white font-bold text-[11px] tracking-wide animate-pulse">
                    <span className="w-1.5 h-1.5 rounded-full bg-white" />
                    {status.short || 'LIVE'} {status.elapsed ? `${status.elapsed}'` : ''}
                  </span>
                ) : isFinished ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-mono text-xs font-semibold">
                    {status.short === 'AET' ? 'AET' : status.short === 'PEN' ? 'PEN' : 'FT'}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-mono text-xs font-medium">
                    Kickoff: {kickoffTime}
                  </span>
                )}
              </div>

              {/* Extra Scores (HT / ET / Penalty) */}
              {!isPre && (
                <div className="flex items-center gap-2 mt-1.5 text-[11px] font-mono text-zinc-500 dark:text-zinc-400">
                  {score?.halftime?.home !== null && score?.halftime?.home !== undefined && (
                    <span>HT {score.halftime.home}-{score.halftime.away}</span>
                  )}
                  {score?.penalty?.home !== null && score?.penalty?.home !== undefined && (
                    <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                      (Pen: {score.penalty.home}-{score.penalty.away})
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Away Team */}
            <div className="flex flex-col items-center sm:flex-row sm:justify-start gap-2 sm:gap-4 text-center sm:text-left min-w-0">
              <div className="order-1 w-12 h-12 sm:w-16 sm:h-16 shrink-0 flex items-center justify-center">
                {away.logo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={away.logo}
                    alt={awayName}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center font-bold text-zinc-600">
                    {awayName.slice(0, 2)}
                  </div>
                )}
              </div>
              <div className="order-2 min-w-0 w-full sm:w-auto">
                <p
                  className={cn(
                    'text-sm sm:text-base md:text-lg font-bold truncate leading-tight',
                    away.winner
                      ? 'text-zinc-950 dark:text-zinc-50'
                      : 'text-zinc-800 dark:text-zinc-200'
                  )}
                  title={awayName}
                >
                  {awayName}
                </p>
                {away.winner && (
                  <span className="inline-block mt-0.5 text-[10px] uppercase font-bold tracking-wider text-green-600 dark:text-green-400">
                    Pemenang
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Referee info footer */}
          {fixture.referee && (
            <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800 text-center text-xs text-zinc-400">
              Wasit: <span className="text-zinc-600 dark:text-zinc-300 font-medium">{fixture.referee}</span>
            </div>
          )}
        </div>
      </div>

      {/* Tabs Menu */}
      <div className="max-w-4xl mx-auto px-4 mb-4">
        <div className="flex items-center gap-2 border-b border-zinc-200 dark:border-zinc-800">
          <button
            onClick={() => setActiveTab('timeline')}
            className={cn(
              'flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-colors cursor-pointer',
              activeTab === 'timeline'
                ? 'border-green-600 text-green-600 dark:border-green-500 dark:text-green-400'
                : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200'
            )}
          >
            <Clock className="w-4 h-4" />
            Kronologi
          </button>

          <button
            onClick={() => setActiveTab('lineups')}
            className={cn(
              'flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-colors cursor-pointer',
              activeTab === 'lineups'
                ? 'border-green-600 text-green-600 dark:border-green-500 dark:text-green-400'
                : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200'
            )}
          >
            <Users className="w-4 h-4" />
            Susunan Pemain
          </button>

          <button
            onClick={() => setActiveTab('stats')}
            className={cn(
              'flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-colors cursor-pointer',
              activeTab === 'stats'
                ? 'border-green-600 text-green-600 dark:border-green-500 dark:text-green-400'
                : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200'
            )}
          >
            <BarChart2 className="w-4 h-4" />
            Statistik
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <div className="max-w-4xl mx-auto px-4">
        {activeTab === 'timeline' && (
          <TimelineTab
            events={events}
            homeId={home.id}
            awayId={away.id}
            homeName={homeName}
            awayName={awayName}
          />
        )}
        {activeTab === 'lineups' && (
          <LineupsTab
            lineups={lineups}
            homeId={home.id}
            awayId={away.id}
            homeName={homeName}
            awayName={awayName}
          />
        )}
        {activeTab === 'stats' && (
          <StatsTab
            statistics={statistics}
            homeId={home.id}
            awayId={away.id}
            homeName={homeName}
            awayName={awayName}
          />
        )}
      </div>
    </div>
  );
}

/* =========================================================================
   1. TIMELINE TAB
   ========================================================================= */
function TimelineTab({
  events,
  homeId,
  awayId,
  homeName,
  awayName,
}: {
  events: FixtureDetail['events'];
  homeId: number | null;
  awayId: number | null;
  homeName: string;
  awayName: string;
}) {
  if (!events || events.length === 0) {
    return <EmptyTabState message="Belum ada catatan peristiwa pertandingan" />;
  }

  // Sort events chronologically (ascending minute + extra)
  const sorted = [...events].sort((a, b) => {
    const minA = a.minute + (a.extra || 0) * 0.1;
    const minB = b.minute + (b.extra || 0) * 0.1;
    return minA - minB;
  });

  const norm = (s: string) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const normHome = norm(homeName);
  const normAway = norm(awayName);

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 sm:p-6 shadow-xs">
      <div className="space-y-4 relative before:absolute before:inset-0 before:left-1/2 before:-translate-x-1/2 before:w-px before:bg-zinc-200 dark:before:bg-zinc-800">
        {sorted.map((ev, idx) => {
          let isHome = false;
          if (homeId != null && ev.teamId != null) {
            isHome = ev.teamId === homeId;
          } else if (ev.teamName) {
            const evTeamNorm = norm(ev.teamName);
            if (evTeamNorm && (normHome.includes(evTeamNorm) || evTeamNorm.includes(normHome))) {
              isHome = true;
            } else if (evTeamNorm && (normAway.includes(evTeamNorm) || evTeamNorm.includes(normAway))) {
              isHome = false;
            }
          }

          const minuteLabel = `${ev.minute}${ev.extra ? `+${ev.extra}` : ''}'`;

          return (
            <div
              key={`${ev.minute}-${ev.teamId}-${idx}`}
              className={cn(
                'relative flex items-center gap-3 sm:gap-6 text-xs sm:text-sm',
                isHome ? 'justify-start' : 'justify-end'
              )}
            >
              {/* Home Event */}
              {isHome ? (
                <>
                  <div className="flex-1 text-right min-w-0 pr-2">
                    <p className="font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                      {ev.player || 'Pemain'}
                    </p>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
                      {ev.detail || ev.type}
                      {ev.assist ? ` (ast. ${ev.assist})` : ''}
                    </p>
                  </div>
                  {/* Center Minute Icon */}
                  <div className="z-10 flex flex-col items-center justify-center shrink-0">
                    <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300">
                      {minuteLabel}
                    </span>
                  </div>
                  <div className="shrink-0 flex items-center">
                    <EventIcon type={ev.type} detail={ev.detail} />
                  </div>
                  {/* Empty right balance */}
                  <div className="flex-1 hidden sm:block" />
                </>
              ) : (
                <>
                  {/* Empty left balance */}
                  <div className="flex-1 hidden sm:block" />
                  <div className="shrink-0 flex items-center">
                    <EventIcon type={ev.type} detail={ev.detail} />
                  </div>
                  {/* Center Minute Icon */}
                  <div className="z-10 flex flex-col items-center justify-center shrink-0">
                    <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300">
                      {minuteLabel}
                    </span>
                  </div>
                  {/* Away Event */}
                  <div className="flex-1 text-left min-w-0 pl-2">
                    <p className="font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                      {ev.player || 'Pemain'}
                    </p>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
                      {ev.detail || ev.type}
                      {ev.assist ? ` (ast. ${ev.assist})` : ''}
                    </p>
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function EventIcon({ type, detail }: { type: string; detail: string }) {
  const lowerType = type.toLowerCase();
  const lowerDetail = (detail || '').toLowerCase();

  if (lowerType === 'goal') {
    return (
      <span className="w-6 h-6 rounded-full bg-green-100 dark:bg-green-950/60 text-green-600 dark:text-green-400 flex items-center justify-center shadow-xs">
        ⚽
      </span>
    );
  }
  if (lowerType === 'card') {
    if (lowerDetail.includes('red')) {
      return (
        <span className="w-3.5 h-5 rounded-xs bg-red-600 inline-block shadow-xs" title="Kartu Merah" />
      );
    }
    return (
      <span className="w-3.5 h-5 rounded-xs bg-amber-400 inline-block shadow-xs" title="Kartu Kuning" />
    );
  }
  if (lowerType === 'subst') {
    return (
      <span className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center text-xs font-bold shadow-xs">
        ⇄
      </span>
    );
  }
  if (lowerType === 'var') {
    return (
      <span className="px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-[10px] font-bold">
        VAR
      </span>
    );
  }
  return <Footprints className="w-4 h-4 text-zinc-400" />;
}

/* =========================================================================
   2. LINEUPS TAB
   ========================================================================= */
function LineupsTab({
  lineups,
  homeId,
  awayId,
  homeName,
  awayName,
}: {
  lineups: FixtureDetail['lineups'];
  homeId: number | null;
  awayId: number | null;
  homeName: string;
  awayName: string;
}) {
  if (!lineups || lineups.length === 0) {
    return <EmptyTabState message="Susunan pemain belum dirilis untuk laga ini" />;
  }

  const norm = (s: string) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const normHome = norm(homeName);
  const normAway = norm(awayName);

  const homeLineup = homeId != null && lineups.some(l => l.teamId === homeId)
    ? lineups.find((l) => l.teamId === homeId)
    : lineups.find((l) => norm(l.teamName).includes(normHome) || normHome.includes(norm(l.teamName))) || lineups[0];

  const awayLineup = awayId != null && lineups.some(l => l.teamId === awayId)
    ? lineups.find((l) => l.teamId === awayId)
    : lineups.find((l) => norm(l.teamName).includes(normAway) || normAway.includes(norm(l.teamName))) || lineups[1];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {homeLineup && <TeamLineupCard lineup={homeLineup} side="Home" />}
      {awayLineup && <TeamLineupCard lineup={awayLineup} side="Away" />}
    </div>
  );
}

function TeamLineupCard({
  lineup,
  side,
}: {
  lineup: FixtureDetail['lineups'][number];
  side: 'Home' | 'Away';
}) {
  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 sm:p-5 shadow-xs flex flex-col gap-4">
      {/* Header team */}
      <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
        <div className="flex items-center gap-2.5 min-w-0">
          {lineup.teamLogo && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={lineup.teamLogo} alt={lineup.teamName} className="w-6 h-6 object-contain shrink-0" />
          )}
          <div>
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate leading-tight">
              {lineup.teamName}
            </h3>
            <span className="text-[11px] text-zinc-400">{side}</span>
          </div>
        </div>
        {lineup.formation && (
          <span className="px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 font-mono text-xs font-semibold text-zinc-700 dark:text-zinc-300">
            {lineup.formation}
          </span>
        )}
      </div>

      {/* Starting XI */}
      <div>
        <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2 flex items-center gap-1.5">
          <Shirt className="w-3.5 h-3.5" />
          Starting XI
        </h4>
        <div className="space-y-1.5">
          {lineup.startXI?.map((p) => (
            <div
              key={p.id || p.name}
              className="flex items-center justify-between py-1 px-2 rounded hover:bg-zinc-50 dark:hover:bg-zinc-800/50 text-xs"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="font-mono text-zinc-400 w-5 text-right font-medium shrink-0">
                  {p.number ?? '-'}
                </span>
                <span className="font-medium text-zinc-800 dark:text-zinc-200 truncate">
                  {p.name}
                </span>
              </div>
              <span className="text-[10px] font-mono uppercase text-zinc-400 shrink-0">
                {p.pos || ''}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Substitutes */}
      {lineup.substitutes && lineup.substitutes.length > 0 && (
        <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800">
          <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">
            Cadangan
          </h4>
          <div className="space-y-1">
            {lineup.substitutes.map((p) => (
              <div
                key={p.id || p.name}
                className="flex items-center justify-between py-1 px-2 rounded hover:bg-zinc-50 dark:hover:bg-zinc-800/50 text-xs text-zinc-600 dark:text-zinc-400"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="font-mono text-zinc-400 w-5 text-right shrink-0">
                    {p.number ?? '-'}
                  </span>
                  <span className="truncate">{p.name}</span>
                </div>
                <span className="text-[10px] font-mono uppercase text-zinc-400 shrink-0">
                  {p.pos || ''}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Coach */}
      {lineup.coach && (
        <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 text-xs text-zinc-500">
          Pelatih: <span className="font-semibold text-zinc-700 dark:text-zinc-300">{lineup.coach}</span>
        </div>
      )}
    </div>
  );
}

/* =========================================================================
   3. STATS TAB
   ========================================================================= */
function StatsTab({
  statistics,
  homeId,
  awayId,
  homeName,
  awayName,
}: {
  statistics: FixtureDetail['statistics'];
  homeId: number | null;
  awayId: number | null;
  homeName: string;
  awayName: string;
}) {
  if (!statistics || statistics.length === 0) {
    return <EmptyTabState message="Statistik belum tersedia untuk pertandingan ini" />;
  }

  const norm = (s: string) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const normHome = norm(homeName);
  const normAway = norm(awayName);

  const homeStats = homeId != null && statistics.some(s => s.teamId === homeId)
    ? statistics.find((s) => s.teamId === homeId)
    : statistics.find((s) => norm(s.teamName).includes(normHome) || normHome.includes(norm(s.teamName))) || statistics[0];

  const awayStats = awayId != null && statistics.some(s => s.teamId === awayId)
    ? statistics.find((s) => s.teamId === awayId)
    : statistics.find((s) => norm(s.teamName).includes(normAway) || normAway.includes(norm(s.teamName))) || statistics[1];

  const allStatTypes = Array.from(
    new Set([
      ...(homeStats?.stats?.map((s) => s.type) || []),
      ...(awayStats?.stats?.map((s) => s.type) || []),
    ])
  );

  if (allStatTypes.length === 0) {
    return <EmptyTabState message="Statistik belum tersedia untuk pertandingan ini" />;
  }

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 sm:p-6 shadow-xs">
      {/* Legend header */}
      <div className="flex items-center justify-between text-xs font-bold pb-3 border-b border-zinc-100 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 mb-4">
        <span className="truncate max-w-[40%]">{homeName}</span>
        <span className="text-zinc-400 font-normal">Perbandingan</span>
        <span className="truncate max-w-[40%] text-right">{awayName}</span>
      </div>

      <div className="space-y-4">
        {allStatTypes.map((type) => {
          const homeValRaw = homeStats?.stats?.find((s) => s.type === type)?.value ?? null;
          const awayValRaw = awayStats?.stats?.find((s) => s.type === type)?.value ?? null;

          const homeNum = parseStatNumber(homeValRaw);
          const awayNum = parseStatNumber(awayValRaw);
          const total = homeNum + awayNum;
          const homePercent = total > 0 ? (homeNum / total) * 100 : 50;

          return (
            <div key={type} className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-medium">
                <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100">
                  {formatStatDisplay(homeValRaw)}
                </span>
                <span className="text-zinc-500 dark:text-zinc-400 font-semibold">{type}</span>
                <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100">
                  {formatStatDisplay(awayValRaw)}
                </span>
              </div>

              {/* Progress bar comparison */}
              <div className="h-2 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden flex">
                <div
                  className="bg-green-600 dark:bg-green-500 transition-all duration-300"
                  style={{ width: `${homePercent}%` }}
                />
                <div
                  className="bg-zinc-400 dark:bg-zinc-600 transition-all duration-300"
                  style={{ width: `${100 - homePercent}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function parseStatNumber(val: number | string | null | undefined): number {
  if (val === null || val === undefined) return 0;
  if (typeof val === 'number') return val;
  const cleaned = String(val).replace('%', '').trim();
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

function formatStatDisplay(val: number | string | null | undefined): string {
  if (val === null || val === undefined) return '-';
  return String(val);
}

function EmptyTabState({ message }: { message: string }) {
  return (
    <div className="p-12 text-center text-zinc-500 dark:text-zinc-400 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl">
      <p className="text-sm font-medium">{message}</p>
    </div>
  );
}

function FixtureDetailSkeleton() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6 animate-pulse">
      <div className="h-4 w-36 bg-zinc-200 dark:bg-zinc-800 rounded" />
      <div className="h-56 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl" />
      <div className="flex gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-2">
        <div className="h-8 w-24 bg-zinc-200 dark:bg-zinc-800 rounded" />
        <div className="h-8 w-24 bg-zinc-200 dark:bg-zinc-800 rounded" />
        <div className="h-8 w-24 bg-zinc-200 dark:bg-zinc-800 rounded" />
      </div>
      <div className="h-64 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl" />
    </div>
  );
}
