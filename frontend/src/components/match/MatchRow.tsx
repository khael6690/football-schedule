'use client';

import Link from 'next/link';
import { cn } from '@/lib/utils';
import { formatKickoffTime } from '@/lib/date';
import type { ApiScoreboardEvent, ApiCompetitor } from '@/types/football';

interface Props {
  match: ApiScoreboardEvent;
}

function TeamLogo({
  club,
  className,
}: {
  club: ApiCompetitor['team'];
  className?: string;
}) {
  const teamTitle = club.displayName || club.name || club.shortDisplayName || club.abbreviation || 'Team';
  if (club.logo) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={club.logo}
        alt={teamTitle}
        title={teamTitle}
        aria-label={teamTitle}
        className={cn('rounded-full object-contain shrink-0', className)}
      />
    );
  }
  return (
    <div
      title={teamTitle}
      aria-label={teamTitle}
      className={cn(
        'rounded-full flex items-center justify-center bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-bold uppercase shrink-0',
        className
      )}
    >
      {(club.abbreviation ?? club.displayName ?? 'T').slice(0, 3)}
    </div>
  );
}

function StatusBadge({ match }: { match: ApiScoreboardEvent }) {
  const state = match.status.type.state;
  const detail = match.status.type.detail || match.status.type.shortDetail || '';

  if (state === 'in') {
    return (
      <span className="px-1.5 py-0.5 rounded bg-green-600 text-white font-bold uppercase text-[10px] tracking-wide whitespace-nowrap animate-pulse">
        LIVE {detail}
      </span>
    );
  }
  if (state === 'post') {
    const desc = match.status.type.description || '';
    const label = desc.toLowerCase().includes('half') ? 'HT' : 'FT';
    return (
      <span className="px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-mono text-xs font-semibold">
        {label}
      </span>
    );
  }
  if (state === 'unknown') {
    return (
      <span className="px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-400 text-[10px] font-bold uppercase">
        {detail || 'PPD'}
      </span>
    );
  }
  // pre — show kick-off time in WIB
  const kickoff = formatKickoffTime(match.date, true);
  if (kickoff) {
    return (
      <span className="text-xs font-mono text-zinc-600 dark:text-zinc-400 font-medium whitespace-nowrap">
        {kickoff}
      </span>
    );
  }
  return null;
}

export function MatchRow({ match }: Props) {
  const comp = match.competitions?.[0];
  const home = comp?.competitors?.find((c) => c.homeAway === 'home');
  const away = comp?.competitors?.find((c) => c.homeAway === 'away');

  if (!home || !away) return null;

  const state = match.status.type.state;
  const isLive = state === 'in';
  const isFinished = state === 'post';

  const homeScore = home.score != null ? home.score : null;
  const awayScore = away.score != null ? away.score : null;
  const hasScore = homeScore !== null && awayScore !== null;

  const hasApfId = typeof match.apfId === 'number' && !isNaN(match.apfId);

  const rowContent = (
    <>
      {/* Time / live indicator */}
      <div className="w-12 shrink-0 text-right">
        {isLive ? (
          <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse inline-block shadow-sm" />
        ) : (
          <span className="text-xs font-mono text-zinc-500 dark:text-zinc-400 font-medium">
            {isFinished ? '' : formatKickoffTime(match.date, false)}
          </span>
        )}
      </div>

      {/* Home team */}
      <div className="flex items-center gap-2.5 flex-1 min-w-0 justify-end sm:justify-start">
        <TeamLogo club={home.team} className="w-7 h-7 sm:w-5.5 sm:h-5.5 text-[10px] sm:text-[9px]" />
        <span
          className={cn(
            'hidden sm:inline text-sm truncate transition-colors',
            home.winner
              ? 'text-zinc-950 dark:text-zinc-50 font-bold'
              : hasApfId
                ? 'text-zinc-800 dark:text-zinc-200 font-medium group-hover:text-green-600 dark:group-hover:text-green-400'
                : 'text-zinc-800 dark:text-zinc-200 font-medium'
          )}
        >
          {home.team.displayName || home.team.shortDisplayName}
        </span>
      </div>

      {/* Score / vs */}
      <div className="w-16 shrink-0 text-center font-mono font-bold text-base">
        {hasScore ? (
          <span className={cn(isLive ? 'text-green-600 dark:text-green-400' : 'text-zinc-900 dark:text-zinc-100')}>
            {homeScore} – {awayScore}
          </span>
        ) : (
          <span className="text-zinc-400 dark:text-zinc-500 font-semibold text-xs uppercase tracking-wider">
            vs
          </span>
        )}
      </div>

      {/* Away team */}
      <div className="flex items-center gap-2.5 flex-1 min-w-0 justify-start sm:justify-end">
        <span
          className={cn(
            'hidden sm:inline text-sm truncate text-right transition-colors',
            away.winner
              ? 'text-zinc-950 dark:text-zinc-50 font-bold'
              : hasApfId
                ? 'text-zinc-800 dark:text-zinc-200 font-medium group-hover:text-green-600 dark:group-hover:text-green-400'
                : 'text-zinc-800 dark:text-zinc-200 font-medium'
          )}
        >
          {away.team.displayName || away.team.shortDisplayName}
        </span>
        <TeamLogo club={away.team} className="w-7 h-7 sm:w-5.5 sm:h-5.5 text-[10px] sm:text-[9px]" />
      </div>

      {/* Status badge */}
      <div className="w-16 shrink-0 text-right">
        <StatusBadge match={match} />
      </div>
    </>
  );

  if (hasApfId) {
    return (
      <Link
        href={`/fixture/${match.apfId}`}
        className={cn(
          'flex items-center gap-3 px-4 py-3.5 transition-colors group cursor-pointer',
          'hover:bg-zinc-50 dark:hover:bg-zinc-800/50'
        )}
      >
        {rowContent}
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-3 px-4 py-3.5 select-none">
      {rowContent}
    </div>
  );
}
