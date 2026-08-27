"use client";

import { useParams } from "next/navigation";
import { useMatch, useMatchPlays } from "@/hooks/useMatch";
import { EventTimeline } from "@/components/match/EventTimeline";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/Skeleton";
import { ComingSoonBadge, ComingSoonSection } from "@/components/ui/ComingSoonBadge";
import { Users, BarChart3, Clock, ArrowLeft } from "lucide-react";
import { formatKickoffTime } from "@/lib/date";
import Link from "next/link";

export default function MatchDetailPage() {
  const { league, id } = useParams<{ league: string; id: string }>();
  const [activeTab, setActiveTab] = useState("timeline");

  const { data: match, isLoading: matchLoading } = useMatch(league, id);
  const { data: events, isLoading: eventsLoading } = useMatchPlays(league, id, match?.status === "live");

  if (matchLoading) {
    return (
      <div className="flex flex-col gap-6 max-w-4xl mx-auto px-4 py-8">
        <header className="bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl py-8 px-4 h-[200px] flex flex-col justify-center items-center gap-4">
          <Skeleton variant="text" className="w-32" />
          <div className="flex gap-8 items-center">
            <Skeleton variant="circle" className="w-10 h-10" />
            <Skeleton variant="text" className="w-24 h-12" />
            <Skeleton variant="circle" className="w-10 h-10" />
          </div>
        </header>
        <Skeleton variant="rect" className="h-64 rounded-2xl" />
      </div>
    );
  }
  if (!match) {
    return (
      <div className="p-16 text-center text-zinc-500 dark:text-zinc-400">
        <p className="text-lg font-semibold">Pertandingan tidak ditemukan</p>
        <Link href="/fixtures" className="mt-3 inline-block text-sm text-green-600 dark:text-green-400 hover:underline">
          ← Kembali ke Jadwal
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 pb-16 min-h-screen">
      <div className="max-w-4xl mx-auto w-full px-4 pt-6">
        <Link
          href="/fixtures"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-500 dark:text-zinc-400 hover:text-green-600 dark:hover:text-green-400 mb-4 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Kembali ke Jadwal
        </Link>
      </div>

      <header className="bg-zinc-100 dark:bg-zinc-900 border-y border-zinc-200 dark:border-zinc-800 py-8 px-4 transition-colors">
        <div className="max-w-4xl mx-auto flex flex-col items-center gap-4 text-center">
          <div className="text-zinc-500 dark:text-zinc-400 text-xs sm:text-sm font-medium">
            {match.league?.name || "League"} • {match.league?.season || ""}
          </div>

          <div className="flex items-center justify-center gap-6 sm:gap-12 w-full">
            {/* Home Team */}
            <div className="flex flex-col sm:flex-row items-center gap-3 flex-1 justify-end text-right">
              <span className="text-base sm:text-xl font-bold text-zinc-900 dark:text-zinc-100">
                {match.homeTeam.name}
              </span>
              {match.homeTeam.logo && (
                <img src={match.homeTeam.logo} alt={match.homeTeam.name} className="w-10 h-10 sm:w-12 sm:h-12 object-contain" />
              )}
            </div>

            {/* Score */}
            <div className="text-4xl sm:text-6xl font-mono font-bold text-zinc-900 dark:text-zinc-100 shrink-0">
              {match.homeScore ?? (match.status === "scheduled" ? 0 : 0)} – {match.awayScore ?? (match.status === "scheduled" ? 0 : 0)}
            </div>

            {/* Away Team */}
            <div className="flex flex-col-reverse sm:flex-row items-center gap-3 flex-1 justify-start text-left">
              {match.awayTeam.logo && (
                <img src={match.awayTeam.logo} alt={match.awayTeam.name} className="w-10 h-10 sm:w-12 sm:h-12 object-contain" />
              )}
              <span className="text-base sm:text-xl font-bold text-zinc-900 dark:text-zinc-100">
                {match.awayTeam.name}
              </span>
            </div>
          </div>

          {match.status === "live" && (
            <div className="flex items-center gap-2 px-3 py-1 rounded bg-green-600 text-white text-xs font-bold uppercase tracking-wide animate-pulse">
              <span className="w-2 h-2 rounded-full bg-white" />
              LIVE {match.minute}'
            </div>
          )}

          {match.status === "scheduled" && match.startTime && (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 text-xs font-mono shadow-xs">
              <Clock className="w-3.5 h-3.5 text-zinc-400" />
              <span>Kickoff: {formatKickoffTime(match.startTime, true)}</span>
            </div>
          )}
        </div>
      </header>

      {/* Tabs Navigation */}
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
                "py-3 text-sm font-medium capitalize flex items-center gap-2 relative transition-colors",
                activeTab === tab.id
                  ? "text-green-600 dark:text-green-500 border-b-2 border-green-600 dark:border-green-500 font-semibold"
                  : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
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

      {/* Main Content */}
      <main className="max-w-4xl mx-auto w-full px-4">
        {activeTab === "timeline" && <EventTimeline events={events || []} />}
        {activeTab === "lineup" && (
          <ComingSoonSection
            title="Team Lineup & Formations"
            description="Starting 11, pemain cadangan, dan bagan formasi taktis akan segera hadir."
            icon={<Users className="w-6 h-6" />}
          />
        )}
        {activeTab === "stats" && (
          <ComingSoonSection
            title="Statistik Pertandingan"
            description="Persentase penguasaan bola, tendangan ke gawang, pelanggaran, dan statistik mendalam akan segera hadir."
            icon={<BarChart3 className="w-6 h-6" />}
          />
        )}
      </main>
    </div>
  );
}
