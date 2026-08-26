'use client';

import { useState } from 'react';
import { format, addDays, subDays, isToday, isSameDay } from 'date-fns';
import { cn } from '@/lib/utils';
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
  const label = isToday(date) ? 'Today' : format(date, 'EEE d');
  return (
    <button
      onClick={onClick}
      className={cn(
        'px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors',
        active
          ? 'bg-green-600 text-white'
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

export default function FixturesPage() {
  const dateRange = getDateRange();
  const [selectedDate, setSelectedDate] = useState<Date>(dateRange[1]); // today
  const [selectedLeague, setSelectedLeague] = useState<string>('all');

  const { groups, isLoading, error } = useFixtures(
    selectedDate,
    selectedLeague === 'all' ? undefined : selectedLeague
  );

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <h1 className="text-3xl font-bold mb-6">Fixtures</h1>

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

        {!isLoading && !error && groups.length === 0 && (
          <div className="text-center py-12 text-zinc-500">
            No fixtures found for this date.
          </div>
        )}

        {!isLoading && !error && groups.length > 0 && (
          <div className="space-y-6">
            {groups.map((group) => (
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
