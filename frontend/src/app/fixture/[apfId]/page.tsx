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
      <div className="max-w-4xl mx-auto px-2.5 xs:px-3 sm:px-4 pt-4 sm:pt-5 pb-2.5 sm:pb-3">
        <Link
          href="/fixtures"
          className="inline-flex items-center gap-1.5 text-[11px] xs:text-xs font-semibold text-zinc-500 dark:text-zinc-400 hover:text-green-600 dark:hover:text-green-400 transition"
        >
          <ArrowLeft className="w-3.5 h-3.5 shrink-0" />
          <span>Semua Jadwal Pertandingan</span>
        </Link>
      </div>

      {/* Main Score & Header Card */}
      <div className="max-w-4xl mx-auto px-2.5 xs:px-3 sm:px-4 mb-4 sm:mb-6">
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl sm:rounded-2xl p-3 xs:p-4 sm:p-6 shadow-xs">
          {/* League & Meta bar */}
          <div className="flex items-center justify-between gap-2 pb-3 mb-3 sm:pb-4 sm:mb-4 border-b border-zinc-100 dark:border-zinc-800 text-[11px] sm:text-xs text-zinc-500 dark:text-zinc-400">
            <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
              {league.logo && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={league.logo}
                  alt={leagueName}
                  className="w-4 h-4 sm:w-5 sm:h-5 object-contain shrink-0"
                />
              )}
              <span className="font-semibold text-zinc-800 dark:text-zinc-200 truncate max-w-[130px] xs:max-w-[180px] sm:max-w-none">
                {leagueName}
              </span>
              {league.round && (
                <span className="hidden sm:inline text-zinc-400 dark:text-zinc-500">
                  • {league.round}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 sm:gap-3 shrink-0 text-[10px] xs:text-[11px] sm:text-xs">
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-zinc-400 shrink-0" />
                <span>{matchDate}</span>
              </span>
              {fixture.venue?.name && (
                <span className="hidden md:flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                  <span className="truncate max-w-[180px]">
                    {fixture.venue.name}{fixture.venue.city ? `, ${fixture.venue.city}` : ''}
                  </span>
                </span>
              )}
            </div>
          </div>

          {/* Match Score Board */}
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-1.5 xs:gap-2.5 sm:gap-6 py-1 sm:py-2">
            {/* Home Team */}
            <div className="flex flex-col items-center sm:flex-row sm:justify-end gap-1.5 sm:gap-4 text-center sm:text-right min-w-0">
              <div className="order-2 sm:order-1 min-w-0 w-full sm:w-auto px-0.5">
                <p
                  className={cn(
                    'text-xs xs:text-sm sm:text-base md:text-lg font-bold line-clamp-2 leading-tight',
                    home.winner
                      ? 'text-zinc-950 dark:text-zinc-50'
                      : 'text-zinc-800 dark:text-zinc-200'
                  )}
                  title={homeName}
                >
                  {homeName}
                </p>
                {home.winner && (
                  <span className="inline-block mt-0.5 px-1.5 py-0.5 rounded-full bg-green-50 dark:bg-green-950/60 text-[9px] xs:text-[10px] uppercase font-bold tracking-wider text-green-600 dark:text-green-400">
                    Pemenang
                  </span>
                )}
              </div>
              <div className="order-1 sm:order-2 w-11 h-11 xs:w-13 xs:h-13 sm:w-16 sm:h-16 shrink-0 flex items-center justify-center p-1 rounded-xl bg-zinc-50/50 dark:bg-zinc-800/40">
                {home.logo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={home.logo}
                    alt={homeName}
                    className="w-full h-full object-contain"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center font-bold text-xs sm:text-sm text-zinc-600 dark:text-zinc-300">
                    {homeName.slice(0, 2)}
                  </div>
                )}
              </div>
            </div>

            {/* Score / Center Status */}
            <div className="flex flex-col items-center justify-center px-1 xs:px-2 sm:px-4 shrink-0">
              {/* Score Display */}
              {isPre ? (
                <div className="text-lg xs:text-xl sm:text-3xl font-mono font-bold text-zinc-400 dark:text-zinc-500">
                  VS
                </div>
              ) : (
                <div className="flex items-center gap-1 xs:gap-1.5 sm:gap-3 text-2xl xs:text-3xl sm:text-5xl font-mono font-black tracking-tight">
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
              <div className="mt-1.5 sm:mt-2">
                {isLive ? (
                  <span className="inline-flex items-center gap-1 xs:gap-1.5 px-2 xs:px-2.5 py-0.5 rounded-full bg-red-600 text-white font-bold text-[10px] xs:text-[11px] tracking-wide animate-pulse">
                    <span className="w-1.5 h-1.5 rounded-full bg-white" />
                    {status.short || 'LIVE'} {status.elapsed ? `${status.elapsed}'` : ''}
                  </span>
                ) : isFinished ? (
                  <span className="inline-flex items-center gap-1 px-2 xs:px-2.5 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-mono text-[10px] xs:text-xs font-bold">
                    {status.short === 'AET' ? 'AET' : status.short === 'PEN' ? 'PEN' : 'FT'}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 xs:px-2.5 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-mono text-[10px] xs:text-xs font-medium">
                    {kickoffTime}
                  </span>
                )}
              </div>

              {/* Extra Scores (HT / ET / Penalty) */}
              {!isPre && (
                <div className="flex items-center gap-1.5 mt-1 text-[10px] xs:text-[11px] font-mono text-zinc-500 dark:text-zinc-400">
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
            <div className="flex flex-col items-center sm:flex-row sm:justify-start gap-1.5 sm:gap-4 text-center sm:text-left min-w-0">
              <div className="order-1 w-11 h-11 xs:w-13 xs:h-13 sm:w-16 sm:h-16 shrink-0 flex items-center justify-center p-1 rounded-xl bg-zinc-50/50 dark:bg-zinc-800/40">
                {away.logo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={away.logo}
                    alt={awayName}
                    className="w-full h-full object-contain"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center font-bold text-xs sm:text-sm text-zinc-600 dark:text-zinc-300">
                    {awayName.slice(0, 2)}
                  </div>
                )}
              </div>
              <div className="order-2 min-w-0 w-full sm:w-auto px-0.5">
                <p
                  className={cn(
                    'text-xs xs:text-sm sm:text-base md:text-lg font-bold line-clamp-2 leading-tight',
                    away.winner
                      ? 'text-zinc-950 dark:text-zinc-50'
                      : 'text-zinc-800 dark:text-zinc-200'
                  )}
                  title={awayName}
                >
                  {awayName}
                </p>
                {away.winner && (
                  <span className="inline-block mt-0.5 px-1.5 py-0.5 rounded-full bg-green-50 dark:bg-green-950/60 text-[9px] xs:text-[10px] uppercase font-bold tracking-wider text-green-600 dark:text-green-400">
                    Pemenang
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Referee info footer */}
          {fixture.referee && (
            <div className="mt-3 pt-2.5 sm:mt-4 sm:pt-3 border-t border-zinc-100 dark:border-zinc-800 text-center text-[11px] sm:text-xs text-zinc-400">
              Wasit: <span className="text-zinc-600 dark:text-zinc-300 font-medium">{fixture.referee}</span>
            </div>
          )}
        </div>
      </div>

      {/* Tabs Menu - Segmented control on mobile, underline on desktop */}
      <div className="max-w-4xl mx-auto px-2.5 xs:px-3 sm:px-4 mb-3 sm:mb-4">
        <div className="bg-zinc-100/90 dark:bg-zinc-800/60 p-1 rounded-xl flex items-center gap-1 sm:bg-transparent sm:p-0 sm:rounded-none sm:border-b sm:border-zinc-200 dark:sm:border-zinc-800">
          <button
            onClick={() => setActiveTab('timeline')}
            className={cn(
              'flex-1 sm:flex-none flex items-center justify-center gap-1.5 py-2 px-2 sm:px-4 sm:py-3 text-xs sm:text-sm font-semibold rounded-lg sm:rounded-none sm:border-b-2 transition-all cursor-pointer',
              activeTab === 'timeline'
                ? 'bg-white dark:bg-zinc-900 text-green-600 dark:text-green-400 shadow-xs sm:bg-transparent sm:shadow-none sm:border-green-600 dark:sm:border-green-500'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 sm:border-transparent'
            )}
          >
            <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            <span>Kronologi</span>
          </button>

          <button
            onClick={() => setActiveTab('lineups')}
            className={cn(
              'flex-1 sm:flex-none flex items-center justify-center gap-1.5 py-2 px-2 sm:px-4 sm:py-3 text-xs sm:text-sm font-semibold rounded-lg sm:rounded-none sm:border-b-2 transition-all cursor-pointer',
              activeTab === 'lineups'
                ? 'bg-white dark:bg-zinc-900 text-green-600 dark:text-green-400 shadow-xs sm:bg-transparent sm:shadow-none sm:border-green-600 dark:sm:border-green-500'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 sm:border-transparent'
            )}
          >
            <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            <span className="hidden xs:inline">Susunan </span>
            <span>Pemain</span>
          </button>

          <button
            onClick={() => setActiveTab('stats')}
            className={cn(
              'flex-1 sm:flex-none flex items-center justify-center gap-1.5 py-2 px-2 sm:px-4 sm:py-3 text-xs sm:text-sm font-semibold rounded-lg sm:rounded-none sm:border-b-2 transition-all cursor-pointer',
              activeTab === 'stats'
                ? 'bg-white dark:bg-zinc-900 text-green-600 dark:text-green-400 shadow-xs sm:bg-transparent sm:shadow-none sm:border-green-600 dark:sm:border-green-500'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 sm:border-transparent'
            )}
          >
            <BarChart2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            <span>Statistik</span>
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <div className="max-w-4xl mx-auto px-2.5 xs:px-3 sm:px-4">
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
            homeLogo={home.logo}
            awayLogo={away.logo}
          />
        )}
      </div>
    </div>
  );
}

/* =========================================================================
   1. TIMELINE TAB (Responsive Adaptive: Mobile Feed + Desktop Stadium Spine)
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

  const getIsHome = (ev: FixtureDetail['events'][number]): boolean => {
    if (homeId != null && ev.teamId != null) {
      return ev.teamId === homeId;
    }
    if (ev.teamName) {
      const evTeamNorm = norm(ev.teamName);
      if (evTeamNorm && (normHome.includes(evTeamNorm) || evTeamNorm.includes(normHome))) {
        return true;
      }
      if (evTeamNorm && (normAway.includes(evTeamNorm) || evTeamNorm.includes(normAway))) {
        return false;
      }
    }
    return false;
  };

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 xs:p-4 sm:p-6 shadow-xs">
      {/* Mobile Top Header Indicator (< sm) */}
      <div className="flex sm:hidden items-center justify-between text-[11px] font-bold text-zinc-500 dark:text-zinc-400 pb-2 mb-3 border-b border-zinc-100 dark:border-zinc-800">
        <span className="text-green-600 dark:text-green-400 flex items-center gap-1 truncate max-w-[45%]">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
          {homeName} (Home)
        </span>
        <span className="text-zinc-600 dark:text-zinc-400 flex items-center gap-1 truncate max-w-[45%] text-right justify-end">
          {awayName} (Away)
          <span className="w-1.5 h-1.5 rounded-full bg-zinc-400" />
        </span>
      </div>

      {/* --- Mobile Version (< sm): Continuous Clean Match Feed --- */}
      <div className="block sm:hidden space-y-2.5">
        {sorted.map((ev, idx) => {
          const isHome = getIsHome(ev);
          const minuteLabel = `${ev.minute}${ev.extra ? `+${ev.extra}` : ''}'`;

          return (
            <div
              key={`m-${ev.minute}-${ev.teamId}-${idx}`}
              className={cn(
                'flex items-start gap-2.5 p-2 rounded-lg text-xs transition-colors',
                isHome
                  ? 'bg-green-50/40 dark:bg-green-950/20 border-l-[3px] border-green-500'
                  : 'bg-zinc-50 dark:bg-zinc-800/40 border-l-[3px] border-zinc-400 dark:border-zinc-600'
              )}
            >
              {/* Minute Badge */}
              <div className="shrink-0 flex flex-col items-center gap-1 pt-0.5">
                <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 shadow-2xs">
                  {minuteLabel}
                </span>
                <EventIcon type={ev.type} detail={ev.detail} />
              </div>

              {/* Event Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1 mb-0.5">
                  <p className="font-bold text-zinc-900 dark:text-zinc-100 truncate text-xs">
                    {ev.player || 'Pemain'}
                  </p>
                  <span
                    className={cn(
                      'text-[9px] font-semibold px-1.5 py-0.2 rounded shrink-0 uppercase tracking-tight',
                      isHome
                        ? 'text-green-700 dark:text-green-300 bg-green-100/60 dark:bg-green-900/40'
                        : 'text-zinc-600 dark:text-zinc-400 bg-zinc-200/60 dark:bg-zinc-700/50'
                    )}
                  >
                    {isHome ? 'Home' : 'Away'}
                  </span>
                </div>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-tight">
                  {ev.detail || ev.type}
                  {ev.assist && (
                    <span className="text-zinc-400 dark:text-zinc-500 ml-1">
                      (ast. {ev.assist})
                    </span>
                  )}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* --- Desktop Version (>= sm): Spacious Stadium Timeline --- */}
      <div className="hidden sm:block space-y-4 relative before:absolute before:inset-0 before:left-1/2 before:-translate-x-1/2 before:w-px before:bg-zinc-200 dark:before:bg-zinc-800">
        {sorted.map((ev, idx) => {
          const isHome = getIsHome(ev);
          const minuteLabel = `${ev.minute}${ev.extra ? `+${ev.extra}` : ''}'`;

          return (
            <div
              key={`d-${ev.minute}-${ev.teamId}-${idx}`}
              className="relative grid grid-cols-[1fr_auto_1fr] items-center gap-4 text-xs sm:text-sm"
            >
              {/* Left Column (Home Side) */}
              {isHome ? (
                <div className="text-right min-w-0 pr-2">
                  <p className="font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                    {ev.player || 'Pemain'}
                  </p>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
                    {ev.detail || ev.type}
                    {ev.assist ? ` (ast. ${ev.assist})` : ''}
                  </p>
                </div>
              ) : (
                <div className="min-w-0" />
              )}

              {/* Center Column: Minute + Icon on the Spine */}
              <div className="z-10 flex items-center justify-center gap-1.5 px-1 shrink-0 bg-white dark:bg-zinc-900 py-1">
                {isHome ? (
                  <>
                    <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300">
                      {minuteLabel}
                    </span>
                    <EventIcon type={ev.type} detail={ev.detail} />
                  </>
                ) : (
                  <>
                    <EventIcon type={ev.type} detail={ev.detail} />
                    <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300">
                      {minuteLabel}
                    </span>
                  </>
                )}
              </div>

              {/* Right Column (Away Side) */}
              {!isHome ? (
                <div className="text-left min-w-0 pl-2">
                  <p className="font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                    {ev.player || 'Pemain'}
                  </p>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
                    {ev.detail || ev.type}
                    {ev.assist ? ` (ast. ${ev.assist})` : ''}
                  </p>
                </div>
              ) : (
                <div className="min-w-0" />
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
      <span className="w-5 h-5 xs:w-6 xs:h-6 rounded-full bg-green-100 dark:bg-green-950/60 text-green-600 dark:text-green-400 flex items-center justify-center text-xs shadow-xs shrink-0">
        ⚽
      </span>
    );
  }
  if (lowerType === 'card') {
    if (lowerDetail.includes('red')) {
      return (
        <span className="w-3 h-4 xs:w-3.5 xs:h-5 rounded-xs bg-red-600 inline-block shadow-xs shrink-0" title="Kartu Merah" />
      );
    }
    return (
      <span className="w-3 h-4 xs:w-3.5 xs:h-5 rounded-xs bg-amber-400 inline-block shadow-xs shrink-0" title="Kartu Kuning" />
    );
  }
  if (lowerType === 'subst') {
    return (
      <span className="w-5 h-5 xs:w-6 xs:h-6 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center text-[11px] xs:text-xs font-bold shadow-xs shrink-0">
        ⇄
      </span>
    );
  }
  if (lowerType === 'var') {
    return (
      <span className="px-1 py-0.5 rounded bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-[9px] xs:text-[10px] font-bold shrink-0">
        VAR
      </span>
    );
  }
  return <Footprints className="w-3.5 h-3.5 xs:w-4 xs:h-4 text-zinc-400 shrink-0" />;
}

/* =========================================================================
   2. LINEUPS TAB (Mobile Team Switcher + Responsive Dual Column on Desktop)
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
  const [mobileTeam, setMobileTeam] = useState<'home' | 'away'>('home');

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
    <div className="space-y-3">
      {/* Mobile Team Switcher (< md) */}
      <div className="flex md:hidden bg-zinc-100 dark:bg-zinc-800/80 p-1 rounded-xl">
        <button
          onClick={() => setMobileTeam('home')}
          className={cn(
            'flex-1 flex items-center justify-center gap-2 py-2 px-2 rounded-lg text-xs font-bold transition-all',
            mobileTeam === 'home'
              ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 shadow-xs'
              : 'text-zinc-500 dark:text-zinc-400'
          )}
        >
          {homeLineup?.teamLogo && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={homeLineup.teamLogo} alt={homeName} className="w-4 h-4 object-contain shrink-0" />
          )}
          <span className="truncate">{homeName}</span>
        </button>

        <button
          onClick={() => setMobileTeam('away')}
          className={cn(
            'flex-1 flex items-center justify-center gap-2 py-2 px-2 rounded-lg text-xs font-bold transition-all',
            mobileTeam === 'away'
              ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 shadow-xs'
              : 'text-zinc-500 dark:text-zinc-400'
          )}
        >
          {awayLineup?.teamLogo && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={awayLineup.teamLogo} alt={awayName} className="w-4 h-4 object-contain shrink-0" />
          )}
          <span className="truncate">{awayName}</span>
        </button>
      </div>

      {/* Mobile Single Card View (< md) */}
      <div className="block md:hidden">
        {mobileTeam === 'home' && homeLineup && (
          <TeamLineupCard lineup={homeLineup} side="Home" />
        )}
        {mobileTeam === 'away' && awayLineup && (
          <TeamLineupCard lineup={awayLineup} side="Away" />
        )}
      </div>

      {/* Desktop Side-by-Side View (>= md) */}
      <div className="hidden md:grid md:grid-cols-2 gap-4">
        {homeLineup && <TeamLineupCard lineup={homeLineup} side="Home" />}
        {awayLineup && <TeamLineupCard lineup={awayLineup} side="Away" />}
      </div>
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
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 xs:p-4 sm:p-5 shadow-xs flex flex-col gap-3 sm:gap-4">
      {/* Header team */}
      <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-2.5 sm:pb-3">
        <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
          {lineup.teamLogo && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={lineup.teamLogo} alt={lineup.teamName} className="w-5 h-5 sm:w-6 sm:h-6 object-contain shrink-0" />
          )}
          <div className="min-w-0">
            <h3 className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate leading-tight">
              {lineup.teamName}
            </h3>
            <span className="text-[10px] sm:text-[11px] text-zinc-400">{side}</span>
          </div>
        </div>
        {lineup.formation && (
          <span className="px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 font-mono text-[11px] sm:text-xs font-semibold text-zinc-700 dark:text-zinc-300 shrink-0">
            {lineup.formation}
          </span>
        )}
      </div>

      {/* Starting XI */}
      <div>
        <h4 className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1.5 sm:mb-2 flex items-center gap-1.5">
          <Shirt className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
          Starting XI
        </h4>
        <div className="space-y-1">
          {lineup.startXI?.map((p) => (
            <div
              key={p.id || p.name}
              className="flex items-center justify-between py-1 px-1.5 xs:px-2 rounded hover:bg-zinc-50 dark:hover:bg-zinc-800/50 text-xs"
            >
              <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
                <span className="font-mono text-zinc-400 w-4 xs:w-5 text-right font-medium text-[11px] sm:text-xs shrink-0">
                  {p.number ?? '-'}
                </span>
                <span className="font-medium text-zinc-800 dark:text-zinc-200 truncate text-[11px] xs:text-xs sm:text-sm">
                  {p.name}
                </span>
              </div>
              <span className="text-[9px] xs:text-[10px] font-mono uppercase text-zinc-400 shrink-0 pl-1">
                {p.pos || ''}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Substitutes */}
      {lineup.substitutes && lineup.substitutes.length > 0 && (
        <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800">
          <h4 className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1.5 sm:mb-2">
            Cadangan
          </h4>
          <div className="space-y-1">
            {lineup.substitutes.map((p) => (
              <div
                key={p.id || p.name}
                className="flex items-center justify-between py-1 px-1.5 xs:px-2 rounded hover:bg-zinc-50 dark:hover:bg-zinc-800/50 text-xs text-zinc-600 dark:text-zinc-400"
              >
                <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
                  <span className="font-mono text-zinc-400 w-4 xs:w-5 text-right text-[11px] sm:text-xs shrink-0">
                    {p.number ?? '-'}
                  </span>
                  <span className="truncate text-[11px] xs:text-xs sm:text-sm">{p.name}</span>
                </div>
                <span className="text-[9px] xs:text-[10px] font-mono uppercase text-zinc-400 shrink-0 pl-1">
                  {p.pos || ''}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Coach */}
      {lineup.coach && (
        <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 text-[11px] sm:text-xs text-zinc-500">
          Pelatih: <span className="font-semibold text-zinc-700 dark:text-zinc-300">{lineup.coach}</span>
        </div>
      )}
    </div>
  );
}

/* =========================================================================
   3. STATS TAB (Responsive Comparison Bars & Mobile-Friendly Typography)
   ========================================================================= */
function StatsTab({
  statistics,
  homeId,
  awayId,
  homeName,
  awayName,
  homeLogo,
  awayLogo,
}: {
  statistics: FixtureDetail['statistics'];
  homeId: number | null;
  awayId: number | null;
  homeName: string;
  awayName: string;
  homeLogo?: string | null;
  awayLogo?: string | null;
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
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 xs:p-4 sm:p-6 shadow-xs">
      {/* Legend header */}
      <div className="flex items-center justify-between text-xs font-bold pb-3 border-b border-zinc-100 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 mb-3 sm:mb-4">
        <div className="flex items-center gap-1.5 truncate max-w-[42%]">
          {homeLogo && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={homeLogo} alt={homeName} className="w-4 h-4 object-contain shrink-0" />
          )}
          <span className="truncate text-[11px] sm:text-xs">{homeName}</span>
        </div>
        <span className="text-[10px] sm:text-xs text-zinc-400 font-semibold uppercase tracking-wider shrink-0 px-1">
          Statistik
        </span>
        <div className="flex items-center justify-end gap-1.5 truncate max-w-[42%] text-right">
          <span className="truncate text-[11px] sm:text-xs">{awayName}</span>
          {awayLogo && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={awayLogo} alt={awayName} className="w-4 h-4 object-contain shrink-0" />
          )}
        </div>
      </div>

      <div className="space-y-3 sm:space-y-4">
        {allStatTypes.map((type) => {
          const homeValRaw = homeStats?.stats?.find((s) => s.type === type)?.value ?? null;
          const awayValRaw = awayStats?.stats?.find((s) => s.type === type)?.value ?? null;

          const homeNum = parseStatNumber(homeValRaw);
          const awayNum = parseStatNumber(awayValRaw);
          const total = homeNum + awayNum;
          const homePercent = total > 0 ? (homeNum / total) * 100 : 50;

          const isHomeDominant = homeNum > awayNum;
          const isAwayDominant = awayNum > homeNum;

          return (
            <div key={type} className="space-y-1">
              <div className="flex items-center justify-between text-[11px] xs:text-xs">
                <span
                  className={cn(
                    'font-mono font-bold w-12 text-left',
                    isHomeDominant
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-zinc-800 dark:text-zinc-200'
                  )}
                >
                  {formatStatDisplay(homeValRaw)}
                </span>
                <span className="text-zinc-500 dark:text-zinc-400 font-medium text-center truncate px-1 flex-1">
                  {type}
                </span>
                <span
                  className={cn(
                    'font-mono font-bold w-12 text-right',
                    isAwayDominant
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-zinc-800 dark:text-zinc-200'
                  )}
                >
                  {formatStatDisplay(awayValRaw)}
                </span>
              </div>

              {/* Progress bar comparison */}
              <div className="h-1.5 sm:h-2 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden flex">
                <div
                  className={cn(
                    'transition-all duration-300',
                    isHomeDominant
                      ? 'bg-green-600 dark:bg-green-500'
                      : 'bg-zinc-400 dark:bg-zinc-600'
                  )}
                  style={{ width: `${homePercent}%` }}
                />
                <div
                  className={cn(
                    'transition-all duration-300',
                    isAwayDominant
                      ? 'bg-green-600 dark:bg-green-500'
                      : 'bg-zinc-300 dark:bg-zinc-700'
                  )}
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
    <div className="p-8 sm:p-12 text-center text-zinc-500 dark:text-zinc-400 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl">
      <p className="text-xs sm:text-sm font-medium">{message}</p>
    </div>
  );
}

function FixtureDetailSkeleton() {
  return (
    <div className="max-w-4xl mx-auto px-2.5 xs:px-3 sm:px-4 py-6 sm:py-8 space-y-4 sm:space-y-6 animate-pulse">
      <div className="h-4 w-32 bg-zinc-200 dark:bg-zinc-800 rounded" />
      <div className="h-48 sm:h-56 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl sm:rounded-2xl" />
      <div className="flex gap-2 sm:gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-2">
        <div className="h-8 flex-1 sm:flex-none sm:w-24 bg-zinc-200 dark:bg-zinc-800 rounded-lg" />
        <div className="h-8 flex-1 sm:flex-none sm:w-24 bg-zinc-200 dark:bg-zinc-800 rounded-lg" />
        <div className="h-8 flex-1 sm:flex-none sm:w-24 bg-zinc-200 dark:bg-zinc-800 rounded-lg" />
      </div>
      <div className="h-64 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl" />
    </div>
  );
}
