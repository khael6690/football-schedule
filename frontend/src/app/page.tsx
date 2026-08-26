"use client";

import Link from "next/link";
import { format } from "date-fns";
import { ArrowRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { fetchAPI } from "@/lib/api";
import { MOCK_LEAGUES, MOCK_TODAYS_MATCHES } from "@/lib/mockData";
import { ComingSoonBadge } from "@/components/ui/ComingSoonBadge";

export const mockLeagues = MOCK_LEAGUES;

export default function LandingPage() {
  const todayFormatted = format(new Date(), "EEEE, MMMM d");

  const { data: leaguesData } = useQuery({
    queryKey: ["landingLeagues"],
    queryFn: async () => {
      try {
        const res = await fetchAPI<any>("/get/soccer/leagues");
        if (res && Array.isArray(res.leagues) && res.leagues.length > 0) {
          return res.leagues;
        }
        if (Array.isArray(res) && res.length > 0) return res;
      } catch (e) {
        // Fallback
      }
      return MOCK_LEAGUES;
    },
  });

  const displayLeagues = leaguesData && leaguesData.length > 0 ? leaguesData.slice(0, 6) : MOCK_LEAGUES;

  const liveMatches = [
    { id: 1, league: "Premier League", home: "Arsenal", away: "Chelsea", homeScore: 2, awayScore: 1, minute: "78'" },
    { id: 2, league: "La Liga", home: "Real Madrid", away: "Barcelona", homeScore: 1, awayScore: 1, minute: "62'" },
    { id: 3, league: "Champions League", home: "Bayern Munich", away: "PSG", homeScore: 3, awayScore: 0, minute: "89'" },
  ];

  const todaysMatches = MOCK_TODAYS_MATCHES;

  return (
    <div className="flex flex-col gap-24 pb-20">
      {/* 7A: Hero Section */}
      <section className="relative min-h-[calc(100dvh-4rem)] flex items-center max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 w-full items-center">
          {/* Left Side (60% -> col-span-7) */}
          <div className="lg:col-span-7 flex flex-col gap-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/10 border border-green-500/20 text-green-600 dark:text-green-400 text-xs font-medium w-fit">
              <span className="w-2 h-2 rounded-full bg-green-600 animate-pulse" />
              <span>Real-time football data & schedules</span>
            </div>

            <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-100 leading-tight">
              Every Goal.<br />Every Minute. Live.
            </h1>

            <p className="text-base sm:text-lg text-zinc-600 dark:text-zinc-400 max-w-xl">
              Real-time scores, fixtures, and standings for the world&apos;s top football leagues.
            </p>

            <div className="flex flex-wrap items-center gap-4 pt-2">
              <Link
                href="/fixtures?status=live"
                className="px-6 py-3 rounded-lg bg-green-600 hover:bg-green-700 text-white font-medium text-sm transition shadow-sm flex items-center gap-2"
              >
                Watch Live
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/fixtures"
                className="px-6 py-3 rounded-lg border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-900 text-zinc-900 dark:text-zinc-100 font-medium text-sm transition"
              >
                View Fixtures
              </Link>
            </div>
          </div>

          {/* Right Side (40% -> col-span-5) Live Match Ticker */}
          <div className="lg:col-span-5 flex flex-col gap-3">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Live Ticker</span>
                <ComingSoonBadge text="Dummy Preview" variant="warning" />
              </div>
              <span className="flex items-center gap-1.5 text-xs text-amber-500/90 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                Demo Feed
              </span>
            </div>

            {liveMatches.map((m) => (
              <div
                key={m.id}
                className="p-4 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-100 shadow-xl relative overflow-hidden group hover:border-green-600/50 transition"
              >
                <div className="absolute top-0 right-0 w-24 h-24 bg-green-500/5 rounded-full blur-xl group-hover:bg-green-500/10 transition" />
                <div className="flex justify-between items-center text-xs text-zinc-400 mb-2">
                  <span>{m.league}</span>
                  <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold uppercase tracking-wide text-[10px]">
                    DEMO {m.minute}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex flex-col gap-1">
                    <span className="font-medium text-sm">{m.home}</span>
                    <span className="font-medium text-sm">{m.away}</span>
                  </div>
                  <div className="flex flex-col items-end gap-1 font-mono font-bold text-lg">
                    <span>{m.homeScore}</span>
                    <span>{m.awayScore}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 7B: Top Leagues Section */}
      <section className="max-w-7xl mx-auto px-4 w-full">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">Top Leagues</h2>
          <Link href="/leagues" className="text-sm font-medium text-green-600 hover:underline flex items-center gap-1">
            All leagues <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayLeagues.map((l: any) => (
            <Link
              key={l.slug}
              href={`/standings/${l.slug}`}
              className="p-5 rounded-lg bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-green-600/50 group transition flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-white dark:bg-zinc-800 p-1 flex items-center justify-center border border-zinc-200 dark:border-zinc-700/50 shrink-0 relative overflow-hidden">
                  <img
                    src={l.logo}
                    alt={l.name}
                    className="w-full h-full object-contain"
                    onError={(e) => {
                      const target = e.currentTarget;
                      target.style.display = 'none';
                      if (target.parentElement) {
                        const fallback = document.createElement('div');
                        fallback.className = 'w-full h-full flex items-center justify-center font-bold text-xs text-zinc-700 dark:text-zinc-300';
                        fallback.innerText = (l.name || '').split(' ').map((n: string) => n[0]).join('').slice(0, 3);
                        target.parentElement.appendChild(fallback);
                      }
                    }}
                  />
                </div>
                <div>
                  <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 group-hover:text-green-600 transition">{l.name}</h3>
                  <p className="text-xs text-zinc-500">{l.country}</p>
                </div>
              </div>
              <span className="text-xs text-zinc-400 group-hover:translate-x-1 transition">View Fixtures →</span>
            </Link>
          ))}
        </div>
      </section>

      {/* 7C: Today's Matches Preview */}
      <section className="max-w-7xl mx-auto px-4 w-full">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">Today&apos;s Matches</h2>
                <ComingSoonBadge text="Dummy Preview" variant="warning" />
              </div>
              <p className="text-xs text-zinc-500 mt-0.5">{todayFormatted}</p>
            </div>
          </div>
          <Link href="/fixtures" className="text-sm font-medium text-green-600 hover:underline flex items-center gap-1">
            View all fixtures →
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {todaysMatches.map((m, idx) => (
            <div
              key={idx}
              className="p-4 rounded-lg bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex flex-col justify-between gap-4 hover:border-green-600/30 transition"
            >
              <div className="flex justify-between items-center text-xs text-zinc-500">
                <span className="font-medium">{m.league}</span>
                <span className="px-2 py-0.5 rounded bg-zinc-200 dark:bg-zinc-800 font-mono font-medium text-zinc-700 dark:text-zinc-300">
                  {m.status === "LIVE" ? `LIVE ${m.minute || ""}` : m.time}
                </span>
              </div>
              <div className="flex flex-col gap-2 font-medium text-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    {m.homeLogo && (
                      <img src={m.homeLogo} alt={m.home} className="w-5 h-5 object-contain" />
                    )}
                    <span className="text-zinc-900 dark:text-zinc-100">{m.home}</span>
                  </div>
                  <span className="font-mono text-zinc-900 dark:text-zinc-100 font-semibold">
                    {m.homeScore !== undefined ? m.homeScore : ""}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    {m.awayLogo && (
                      <img src={m.awayLogo} alt={m.away} className="w-5 h-5 object-contain" />
                    )}
                    <span className="text-zinc-900 dark:text-zinc-100">{m.away}</span>
                  </div>
                  <span className="font-mono text-zinc-900 dark:text-zinc-100 font-semibold">
                    {m.awayScore !== undefined ? m.awayScore : ""}
                  </span>
                </div>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-zinc-200 dark:border-zinc-800 text-[11px] text-zinc-400">
                <span className={m.status === "LIVE" ? "text-green-500 font-bold animate-pulse" : "text-zinc-500"}>
                  {m.status === "LIVE" ? "● Live In Progress" : m.status === "FINISHED" ? "Finished" : "Upcoming Match"}
                </span>
                <Link href="/fixtures" className="text-green-600 font-medium hover:underline">
                  Match Details
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 7D: Features Strip */}
      <section className="max-w-7xl mx-auto px-4 w-full">
        <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 mb-6">Built for fans who care about every second</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="pl-4 border-l-2 border-green-600 flex flex-col gap-2">
            <h3 className="font-bold text-lg text-zinc-900 dark:text-zinc-100">Live Scores</h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Updates every 15 seconds during matches with zero lag.</p>
          </div>
          <div className="pl-4 border-l-2 border-green-600 flex flex-col gap-2">
            <h3 className="font-bold text-lg text-zinc-900 dark:text-zinc-100">Full Coverage</h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">1000+ leagues across 80+ countries with deep statistics.</p>
          </div>
          <div className="pl-4 border-l-2 border-green-600 flex flex-col gap-2">
            <h3 className="font-bold text-lg text-zinc-900 dark:text-zinc-100">Zero Clutter</h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Clean interface, no intrusive ads, focused purely on the game.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
