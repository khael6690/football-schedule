'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { addDays, subDays, isToday, isSameDay } from 'date-fns';
import { cn } from '@/lib/utils';
import { formatShortMatchDate } from '@/lib/date';
import { useFixtures } from '@/hooks/useFixtures';
import { MatchRow } from '@/components/match/MatchRow';
import { SkeletonMatchRow } from '@/components/match/SkeletonMatchRow';

const LEAGUES = [
  { slug: 'all', name: 'All Leagues' },
  { slug: 'eng.1', name: 'Premier League' },
  { slug: 'esp.1', name: 'La Liga' },
  { slug: 'ger.1', name: 'Bundesliga' },
  { slug: 'ita.1', name: 'Serie A' },
  { slug: 'fra.1', name: 'Ligue 1' },
  { slug: 'uefa.cl', name: 'Champions League' },
];

const STATUS_OPTIONS = [
  { value: 'all', label: 'Semua Laga' },
  { value: 'live', label: 'Live 🔴' },
  { value: 'finished', label: 'Selesai' },
];

function getDateRange(): Date[] {
  const today = new Date();
  const yesterday = subDays(today, 1);
  const dates = [yesterday, today];
  for (let i = 1; i <= 5; i++) {
    dates.push(addDays(today, i));
  }
  return dates;
}

function DatePill({ date, active, onClick }: { date: Date; active: boolean; onClick: () => void }) {
  const label = isToday(date) ? 'Hari Ini' : formatShortMatchDate(date, 'id-ID');
  return (
    <button
      onClick={onClick}
      className={cn(
        'px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors',
        active
          ? 'bg-green-600 text-white shadow-sm'
          : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
      )}
    >
      {label}
    </button>
  );
}

function LeagueTab({ league, active, onClick }: { league: typeof LEAGUES[number]; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors relative',
        active
          ? 'text-green-600'
          : 'text-zinc-400 hover:text-zinc-200'
      )}
    >
      {league.name}
      {active && (
        <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-green-600" />
      )}
    </button>
  );
}

function FixturesContent() {
  const searchParams = useSearchParams();
  const dateRange = getDateRange();
  const [selectedDate, setSelectedDate] = useState<Date>(dateRange[1]); // today
  const [selectedLeague, setSelectedLeague] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  useEffect(() => {
    const statusParam = searchParams.get('status');
    if (statusParam && ['live', 'finished', 'all'].includes(statusParam.toLowerCase())) {
      setSelectedStatus(statusParam.toLowerCase());
    }
  }, [searchParams]);

  const { groups, isLoading, error } = useFixtures(
    selectedDate,
    selectedLeague === 'all' ? undefined : selectedLeague
  );

  // Filter events per group based on selectedStatus
  const filteredGroups = groups
    .map((g) => {
      const events = g.events.filter((ev: any) => {
        if (selectedStatus === 'live') {
          return (
            ev.status?.type?.state === 'in' ||
            ev.status?.type?.name?.includes('PROGRESS') ||
            ev.status?.type?.name?.includes('LIVE')
          );
        }
        if (selectedStatus === 'finished') {
          return (
            ev.status?.type?.state === 'post' ||
            ev.status?.type?.name?.includes('FULL_TIME') ||
            ev.status?.type?.name?.includes('FINAL')
          );
        }
        return true;
      });
      return { ...g, events };
    })
    .filter((g) => g.events.length > 0);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header & Status Filter Bar */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <h1 className="text-3xl font-bold">Fixtures</h1>
          <div className="flex items-center gap-1.5 p-1 bg-zinc-900 border border-zinc-800 rounded-lg">
            {STATUS_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setSelectedStatus(opt.value)}
                className={cn(
                  'px-3 py-1.5 rounded-md text-xs font-semibold transition',
                  selectedStatus === opt.value
                    ? opt.value === 'live'
                      ? 'bg-red-600 text-white animate-pulse'
                      : 'bg-green-600 text-white'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Date picker strip */}
        <div className="mb-4 overflow-x-auto scrollbar-hide">
          <div className="flex gap-2 pb-2">
            {dateRange.map((date, idx) => (
              <DatePill
                key={idx}
                date={date}
                active={isSameDay(date, selectedDate)}
                onClick={() => setSelectedDate(date)}
              />
            ))}
          </div>
        </div>

        {/* League filter tabs */}
        <div className="mb-6 overflow-x-auto scrollbar-hide border-b border-zinc-800">
          <div className="flex gap-1">
            {LEAGUES.map((league) => (
              <LeagueTab
                key={league.slug}
                league={league}
                active={selectedLeague === league.slug}
                onClick={() => setSelectedLeague(league.slug)}
              />
            ))}
          </div>
        </div>

        {/* Content */}
        {error && (
          <div className="bg-red-950/20 border border-red-900/50 text-red-400 px-4 py-3 rounded-lg">
            Failed to load fixtures. {error.message}
          </div>
        )}

        {isLoading && (
          <div className="space-y-6">
            <div className="bg-zinc-900 rounded-lg border border-zinc-800 overflow-hidden">
              <div className="sticky top-0 bg-zinc-900 border-b border-zinc-800 px-4 py-2">
                <div className="h-4 bg-zinc-700 rounded w-32 animate-pulse" />
              </div>
              <SkeletonMatchRow />
              <SkeletonMatchRow />
              <SkeletonMatchRow />
            </div>
          </div>
        )}

        {!isLoading && !error && filteredGroups.length === 0 && (
          <div className="text-center py-12 text-zinc-500">
            No {selectedStatus !== 'all' ? selectedStatus : ''} fixtures found for this selection.
          </div>
        )}

        {!isLoading && !error && filteredGroups.length > 0 && (
          <div className="space-y-6">
            {filteredGroups.map((group) => (
              <div
                key={group.leagueSlug}
                className="bg-zinc-900 rounded-lg border border-zinc-800 overflow-hidden"
              >
                {/* League group header (sticky) */}
                <div className="sticky top-0 bg-zinc-900 border-b border-zinc-800 px-4 py-2.5 flex items-center gap-2 z-10">
                  {group.leagueLogo && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={group.leagueLogo}
                      alt={group.leagueName}
                      width={18}
                      height={18}
                      className="rounded"
                    />
                  )}
                  <h2 className="text-sm font-semibold text-zinc-100">
                    {group.leagueName}
                  </h2>
                  <span className="text-xs text-zinc-500 ml-auto">
                    {group.events.length} {group.events.length === 1 ? 'match' : 'matches'}
                  </span>
                </div>

                {/* Match rows */}
                <div>
                  {group.events.map((event) => (
                    <MatchRow key={event.id} match={event} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function FixturesPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-zinc-950 p-10 text-center text-zinc-500">Loading fixtures...</div>}>
      <FixturesContent />
    </Suspense>
  );
}
