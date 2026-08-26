"use client";

import { useParams } from "next/navigation";
import { useClub } from "@/hooks/useClub";
import { Skeleton } from "@/components/ui/Skeleton";
import { Shield, User, MapPin, Trophy, Calendar, Users } from "lucide-react";
import Link from "next/link";

export default function ClubPage() {
  const { league, id } = useParams<{ league: string; id: string }>();
  const { data: club, isLoading } = useClub(league || "eng.1", id || "57");

  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen bg-zinc-950 text-zinc-100">
        <header className="bg-zinc-900 border-b border-zinc-800 py-10 px-4">
          <div className="max-w-7xl mx-auto flex items-center gap-6">
            <Skeleton variant="circle" className="w-20 h-20 bg-zinc-800" />
            <div className="space-y-2">
              <Skeleton variant="text" className="w-48 h-8 bg-zinc-800" />
              <Skeleton variant="text" className="w-32 bg-zinc-800" />
            </div>
          </div>
        </header>
        <main className="max-w-7xl mx-auto px-4 py-10 space-y-8">
          <Skeleton variant="rect" className="h-40 bg-zinc-900 rounded-xl" />
          <Skeleton variant="rect" className="h-64 bg-zinc-900 rounded-xl" />
        </main>
      </div>
    );
  }

  if (!club) return <div className="p-10 text-center text-zinc-500 bg-zinc-950 min-h-screen">Club not found</div>;

  const positions = ["Goalkeeper", "Defender", "Midfielder", "Forward"] as const;

  const squadByPosition = positions.map((pos) => ({
    position: pos,
    players: (club.squad || []).filter((p: any) => p.position === pos),
  }));

  return (
    <div className="flex flex-col min-h-screen bg-zinc-950 text-zinc-100">
      {/* Header Banner */}
      <header className="bg-gradient-to-b from-zinc-900 to-zinc-950 border-b border-zinc-800/80 py-10 px-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-6">
            {club.logo ? (
              <img src={club.logo} alt={club.name} className="w-24 h-24 object-contain drop-shadow-lg shrink-0" />
            ) : (
              <div className="w-24 h-24 rounded-2xl bg-zinc-800 flex items-center justify-center text-zinc-400">
                <Shield className="w-12 h-12" />
              </div>
            )}
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">{club.name}</h1>
                {club.rank && (
                  <span className="px-3 py-1 rounded-full bg-green-500/10 border border-green-500/30 text-green-400 text-xs font-bold">
                    Rank #{club.rank}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-zinc-400">
                {club.venue && (
                  <span className="flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-green-500 shrink-0" />
                    {club.venue} {club.city ? `(${club.city})` : ""}
                  </span>
                )}
                {club.coach && (
                  <span className="flex items-center gap-1.5">
                    <User className="w-4 h-4 text-green-500 shrink-0" />
                    Manager: <strong className="text-zinc-200 font-medium">{club.coach}</strong>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Quick Stat Badges */}
          <div className="flex items-center gap-3 w-full md:w-auto">
            {club.points !== undefined && (
              <div className="flex-1 md:flex-none p-3.5 rounded-xl bg-zinc-900/80 border border-zinc-800 text-center min-w-[90px]">
                <div className="text-xs text-zinc-400 uppercase tracking-wider">Points</div>
                <div className="text-2xl font-bold text-green-400 font-mono mt-0.5">{club.points}</div>
              </div>
            )}
            {club.capacity && (
              <div className="flex-1 md:flex-none p-3.5 rounded-xl bg-zinc-900/80 border border-zinc-800 text-center min-w-[100px]">
                <div className="text-xs text-zinc-400 uppercase tracking-wider">Capacity</div>
                <div className="text-lg font-bold text-zinc-200 font-mono mt-0.5">{club.capacity}</div>
              </div>
            )}
            {club.founded && (
              <div className="flex-1 md:flex-none p-3.5 rounded-xl bg-zinc-900/80 border border-zinc-800 text-center min-w-[90px]">
                <div className="text-xs text-zinc-400 uppercase tracking-wider">Founded</div>
                <div className="text-lg font-bold text-zinc-200 font-mono mt-0.5">{club.founded}</div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-10 w-full space-y-12">
        {/* Matches Section */}
        <section className="space-y-6">
          <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Calendar className="w-5 h-5 text-green-500" />
              Club Fixtures & Recent Results
            </h2>
            <Link href="/fixtures" className="text-xs font-semibold text-green-500 hover:underline">
              View All Fixtures →
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Recent Match */}
            {club.recentFixtures?.map((m: any) => (
              <div key={m.id} className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 flex flex-col justify-between gap-3">
                <div className="flex justify-between text-xs text-zinc-400">
                  <span>{m.league}</span>
                  <span className="px-2 py-0.5 rounded bg-zinc-800 text-green-400 font-bold">{m.status}</span>
                </div>
                <div className="flex justify-between items-center font-semibold text-sm">
                  <div className="flex items-center gap-2">
                    <img src={m.homeLogo} alt={m.home} className="w-6 h-6 object-contain" />
                    <span>{m.home}</span>
                  </div>
                  <div className="font-mono text-base font-bold bg-zinc-800 px-2.5 py-1 rounded">
                    {m.homeScore} - {m.awayScore}
                  </div>
                  <div className="flex items-center gap-2">
                    <span>{m.away}</span>
                    <img src={m.awayLogo} alt={m.away} className="w-6 h-6 object-contain" />
                  </div>
                </div>
              </div>
            ))}

            {/* Upcoming Match */}
            {club.upcomingFixtures?.map((m: any) => (
              <div key={m.id} className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 flex flex-col justify-between gap-3">
                <div className="flex justify-between text-xs text-zinc-400">
                  <span>{m.league}</span>
                  <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 font-medium">Upcoming ({m.date})</span>
                </div>
                <div className="flex justify-between items-center font-semibold text-sm">
                  <div className="flex items-center gap-2">
                    <img src={m.homeLogo} alt={m.home} className="w-6 h-6 object-contain" />
                    <span>{m.home}</span>
                  </div>
                  <div className="font-mono text-xs text-zinc-400 bg-zinc-800/80 px-2.5 py-1 rounded">
                    {m.time}
                  </div>
                  <div className="flex items-center gap-2">
                    <span>{m.away}</span>
                    <img src={m.awayLogo} alt={m.away} className="w-6 h-6 object-contain" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Squad Section */}
        <section className="space-y-6">
          <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Users className="w-5 h-5 text-green-500" />
              Squad Players
            </h2>
            <span className="text-xs text-zinc-400 font-mono">
              {club.squad?.length || 0} Registered Players
            </span>
          </div>

          <div className="space-y-8">
            {squadByPosition.map(
              (group) =>
                group.players.length > 0 && (
                  <div key={group.position} className="space-y-3">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 px-1">
                      {group.position}s ({group.players.length})
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      {group.players.map((player: any) => (
                        <div
                          key={player.id}
                          className="p-3.5 rounded-xl bg-zinc-900 border border-zinc-800/80 hover:border-green-600/40 transition flex items-center justify-between"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg bg-zinc-800 text-green-400 font-mono font-bold text-sm flex items-center justify-center shrink-0">
                              #{player.number}
                            </div>
                            <div>
                              <div className="font-semibold text-sm text-zinc-100">{player.name}</div>
                              <div className="text-xs text-zinc-500">{player.nationality}</div>
                            </div>
                          </div>
                          <span className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider px-2 py-0.5 bg-zinc-800/60 rounded">
                            {player.position.slice(0, 3)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
