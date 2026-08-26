'use client';

import Link from 'next/link';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import type { ApiScoreboardEvent, ApiCompetitor } from '@/types/football';

interface Props {
  match: ApiScoreboardEvent;
}

function TeamLogo({ club, size = 24 }: { club: ApiCompetitor['team']; size?: number }) {
  if (club.logo) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={club.logo}
        alt={club.abbreviation ?? club.displayName}
        width={size}
        height={size}
        className="rounded-full object-contain"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <div
      className="rounded-full flex items-center justify-center bg-zinc-700 text-zinc-300 text-[9px] font-bold uppercase"
      style={{ width: size, height: size }}
    >
      {(club.abbreviation ?? club.displayName).slice(0, 3)}
    </div>
  );
}

function StatusBadge({ match }: { match: ApiScoreboardEvent }) {
  const state = match.status.type.state;
  const detail = match.status.type.detail || match.status.type.shortDetail || '';

  if (state === 'in') {
    return (
      <span className="px-1.5 py-0.5 rounded bg-green-600 text-white font-bold uppercase text-[10px] tracking-wide whitespace-nowrap">
        LIVE {detail}
      </span>
    );
  }
  if (state === 'post') {
    const desc = match.status.type.description || '';
    if (desc.toLowerCase().includes('half')) {
      return <span className="text-xs font-mono text-zinc-400">HT</span>;
    }
    return <span className="text-xs font-mono text-zinc-400">FT</span>;
  }
  if (state === 'unknown') {
    return (
      <span className="px-1.5 py-0.5 rounded bg-zinc-700 text-zinc-400 text-[10px] uppercase">
        {detail || 'PPD'}
      </span>
    );
  }
  // pre — show kick-off time
  try {
    const kickoff = format(new Date(match.date), 'HH:mm');
    return <span className="text-xs font-mono text-zinc-500">{kickoff}</span>;
  } catch {
    return null;
  }
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

  const matchId = match.id;

  return (
    <Link
      href={`/match/${matchId}`}
      className={cn(
        'flex items-center gap-3 px-4 py-3 border-b border-zinc-800 last:border-b-0',
        'hover:bg-zinc-800/40 transition-colors group cursor-pointer'
      )}
    >
      {/* Time / live indicator */}
      <div className="w-10 shrink-0 text-right">
        {isLive ? (
          <span className="w-2 h-2 rounded-full bg-green-600 animate-pulse inline-block" />
        ) : (
          <span className="text-xs font-mono text-zinc-500">
            {isFinished
              ? ''
              : (() => {
                  try {
                    return format(new Date(match.date), 'HH:mm');
                  } catch {
                    return '';
                  }
                })()}
          </span>
        )}
      </div>

      {/* Home team */}
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <TeamLogo club={home.team} size={22} />
        <span
          className={cn(
            'text-sm truncate',
            home.winner ? 'text-zinc-100 font-semibold' : 'text-zinc-300',
            !isFinished && !isLive && 'text-zinc-300'
          )}
        >
          {home.team.shortDisplayName || home.team.displayName}
        </span>
      </div>

      {/* Score / vs */}
      <div className="w-16 shrink-0 text-center font-mono font-bold text-base">
        {hasScore ? (
          <span className={cn(isLive ? 'text-green-400' : 'text-zinc-100')}>
            {homeScore} – {awayScore}
          </span>
        ) : (
          <span className="text-zinc-600 font-normal text-sm">vs</span>
        )}
      </div>

      {/* Away team */}
      <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
        <span
          className={cn(
            'text-sm truncate text-right',
            away.winner ? 'text-zinc-100 font-semibold' : 'text-zinc-300',
            !isFinished && !isLive && 'text-zinc-300'
          )}
        >
          {away.team.shortDisplayName || away.team.displayName}
        </span>
        <TeamLogo club={away.team} size={22} />
      </div>

      {/* Status badge */}
      <div className="w-16 shrink-0 text-right">
        <StatusBadge match={match} />
      </div>
    </Link>
  );
}
