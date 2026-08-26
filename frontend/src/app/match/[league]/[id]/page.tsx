"use client";

import { useParams } from "next/navigation";
import { useMatch, useMatchPlays } from "@/hooks/useMatch";
import { EventTimeline } from "@/components/match/EventTimeline";
import { useState } from "react";
import { cn } from "@/lib/utils";

import { Skeleton } from "@/components/ui/Skeleton";

export default function MatchDetailPage() {
  const { league, id } = useParams<{ league: string, id: string }>();
  const [activeTab, setActiveTab] = useState("timeline");

  const { data: match, isLoading: matchLoading } = useMatch(league, id);
  const { data: events, isLoading: eventsLoading } = useMatchPlays(league, id, match?.status === 'live');

  if (matchLoading) {
    return (
      <div className="flex flex-col gap-6">
        <header className="bg-zinc-900 py-8 px-4 h-[200px] flex flex-col justify-center items-center gap-4">
          <Skeleton variant="text" className="w-32 bg-zinc-800" />
          <div className="flex gap-8 items-center">
            <Skeleton variant="circle" className="w-8 h-8 bg-zinc-800" />
            <Skeleton variant="text" className="w-24 h-12 bg-zinc-800" />
            <Skeleton variant="circle" className="w-8 h-8 bg-zinc-800" />
          </div>
        </header>
        <div className="max-w-4xl mx-auto w-full px-4">
          <Skeleton variant="rect" className="h-64" />
        </div>
      </div>
    );
  }
  if (!match) return <div className="p-10 text-center text-zinc-500">Match not found</div>;

  return (
    <div className="flex flex-col gap-6">
      <header className="bg-zinc-900 text-zinc-100 py-8 px-4">
        <div className="max-w-4xl mx-auto flex flex-col items-center gap-4">
          <div className="text-zinc-400 text-sm">{match.league.name} - {match.league.season}</div>
          <div className="flex items-center gap-8 text-xl font-bold">
            <div className="flex items-center gap-3">
              {match.homeTeam.logo && <img src={match.homeTeam.logo} alt={match.homeTeam.name} className="w-8 h-8" />}
              {match.homeTeam.name}
            </div>
            <div className="text-6xl font-mono">
              {match.homeScore ?? 0} - {match.awayScore ?? 0}
            </div>
            <div className="flex items-center gap-3">
              {match.awayTeam.name}
              {match.awayTeam.logo && <img src={match.awayTeam.logo} alt={match.awayTeam.name} className="w-8 h-8" />}
            </div>
          </div>
          {match.status === 'live' && (
            <div className="flex items-center gap-2 px-3 py-1 rounded bg-green-600 text-xs font-bold uppercase tracking-wide">
              <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
              LIVE {match.minute}'
            </div>
          )}
        </div>
      </header>

      <nav className="border-b border-zinc-200 dark:border-zinc-800">
        <div className="max-w-4xl mx-auto flex gap-6 px-4">
          {["timeline", "lineup", "stats"].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn("py-3 text-sm font-medium capitalize", activeTab === tab ? "text-green-600 border-b-2 border-green-600" : "text-zinc-500")}
            >
              {tab}
            </button>
          ))}
        </div>
      </nav>

      <main className="max-w-4xl mx-auto w-full px-4">
        {activeTab === "timeline" && <EventTimeline events={events || []} />}
      </main>
    </div>
  );
}
