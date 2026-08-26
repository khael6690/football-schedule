"use client";

import { useParams } from "next/navigation";
import { useMatch, useMatchPlays } from "@/hooks/useMatch";
import { EventTimeline } from "@/components/match/EventTimeline";
import { useState } from "react";
import { cn } from "@/lib/utils";

import { Skeleton } from "@/components/ui/Skeleton";

import { ComingSoonBadge, ComingSoonSection } from "@/components/ui/ComingSoonBadge";
import { Users, BarChart3, Clock } from "lucide-react";
import { formatKickoffTime } from "@/lib/date";

export default function MatchDetailPage() {
  const { league, id } = useParams<{ league: string; id: string }>();
  const [activeTab, setActiveTab] = useState("timeline");

  const { data: match, isLoading: matchLoading } = useMatch(league, id);
  const { data: events, isLoading: eventsLoading } = useMatchPlays(league, id, match?.status === "live");

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
    <div className="flex flex-col gap-6 pb-16">
      <header className="bg-zinc-900 text-zinc-100 py-8 px-4">
        <div className="max-w-4xl mx-auto flex flex-col items-center gap-4">
          <div className="text-zinc-400 text-sm">
            {match.league.name} - {match.league.season}
          </div>
          <div className="flex items-center gap-8 text-xl font-bold">
            <div className="flex items-center gap-3">
              {match.homeTeam.logo && <img src={match.homeTeam.logo} alt={match.homeTeam.name} className="w-8 h-8" />}
              {match.homeTeam.name}
            </div>
            <div className="text-6xl font-mono">
              {match.homeScore ?? (match.status === "scheduled" ? 0 : 0)} - {match.awayScore ?? (match.status === "scheduled" ? 0 : 0)}
            </div>
            <div className="flex items-center gap-3">
              {match.awayTeam.name}
              {match.awayTeam.logo && <img src={match.awayTeam.logo} alt={match.awayTeam.name} className="w-8 h-8" />}
            </div>
          </div>
          {match.status === "live" && (
            <div className="flex items-center gap-2 px-3 py-1 rounded bg-green-600 text-xs font-bold uppercase tracking-wide">
              <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
              LIVE {match.minute}'
            </div>
          )}
          {match.status === "scheduled" && match.startTime && (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded bg-zinc-800 text-zinc-300 text-xs font-mono">
              <Clock className="w-3.5 h-3.5 text-zinc-400" />
              <span>Kickoff: {formatKickoffTime(match.startTime, true)}</span>
            </div>
          )}
        </div>
      </header>

      <nav className="border-b border-zinc-200 dark:border-zinc-800">
        <div className="max-w-4xl mx-auto flex gap-6 px-4">
          {[
            { id: "timeline", label: "Timeline" },
            { id: "lineup", label: "Lineup", isComingSoon: true },
            { id: "stats", label: "Stats", isComingSoon: true },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "py-3 text-sm font-medium capitalize flex items-center gap-2 relative transition",
                activeTab === tab.id
                  ? "text-green-600 border-b-2 border-green-600 font-semibold"
                  : "text-zinc-500 hover:text-zinc-300"
              )}
            >
              <span>{tab.label}</span>
              {tab.isComingSoon && (
                <ComingSoonBadge text="Coming Soon" variant="subtle" size="sm" />
              )}
            </button>
          ))}
        </div>
      </nav>

      <main className="max-w-4xl mx-auto w-full px-4">
        {activeTab === "timeline" && <EventTimeline events={events || []} />}
        {activeTab === "lineup" && (
          <ComingSoonSection
            title="Team Lineup & Formations"
            description="Starting 11, bench players, and tactical formation charts are coming soon pending Backend API support."
            icon={<Users className="w-6 h-6" />}
          />
        )}
        {activeTab === "stats" && (
          <ComingSoonSection
            title="Match Statistics"
            description="Possession percentage, shots on target, fouls, corner kicks, and deep match stats are coming soon."
            icon={<BarChart3 className="w-6 h-6" />}
          />
        )}
      </main>
    </div>
  );
}
