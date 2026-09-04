"use client";

import Link from "next/link";
import { ArrowRight, Calendar, Radio, Trophy, ShieldCheck, Zap } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { fetchAPI } from "@/lib/api";
import { formatFullMatchDate, formatKickoffTime, toScoreboardDateParam } from "@/lib/date";
import { Skeleton } from "@/components/ui/Skeleton";
import LiveScoresWidget from "@/components/LiveScoresWidget";
import type { ApiLeaguesResponse, ApiScoreboardResponse, ApiScoreboardEvent } from "@/types/football";

export default function LandingPage() {
  const todayDateParam = toScoreboardDateParam(new Date());
  const todayFormatted = formatFullMatchDate(new Date(), "id-ID");

  // 1. Fetch Top Leagues
  const { data: leagues, isLoading: leaguesLoading } = useQuery({
    queryKey: ["landingLeagues"],
    queryFn: async () => {
      try {
        const res = await fetchAPI<ApiLeaguesResponse>("/get/soccer/leagues");
        if (res && Array.isArray(res.leagues) && res.leagues.length > 0) {
          return res.leagues.slice(0, 6);
        }
      } catch (e) {
        console.warn("Failed to fetch leagues for landing page:", e);
      }
      return [];
    },
    staleTime: 60000,
  });

  // 2. Fetch Real Today's Matches (with tz_offset=7 for WIB)
  const { data: todaysMatches, isLoading: matchesLoading } = useQuery({
    queryKey: ["landingTodaysMatches", todayDateParam],
    queryFn: async () => {
      try {
        const res = await fetchAPI<ApiScoreboardResponse>(
          `/get/soccer/scoreboard?dates=${todayDateParam}&tz_offset=7`
        );
        if (res && Array.isArray(res.leagues)) {
          const list: Array<{
            leagueSlug: string;
            leagueName: string;
            leagueLogo?: string;
            event: ApiScoreboardEvent;
          }> = [];

          for (const group of res.leagues) {
            for (const ev of group.events || []) {
              list.push({
                leagueSlug: group.league.slug,
                leagueName: group.league.name,
                leagueLogo: group.league.logo,
                event: ev,
              });
            }
          }
          return list;
        }
      } catch (e) {
        console.warn("Failed to fetch today matches for landing page:", e);
      }
      return [];
    },
    refetchInterval: 15000,
  });

  return (
    <div className="flex flex-col gap-16 md:gap-24 pb-20">
      {/* 1. Hero Section */}
      <section className="relative pt-12 pb-6 max-w-7xl mx-auto px-4 w-full">
        <div className="flex flex-col items-center text-center max-w-3xl mx-auto gap-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-green-500/10 border border-green-500/20 text-green-700 dark:text-green-400 text-xs font-semibold tracking-wide shadow-xs">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span>Jadwal & Skor Langsung Sepak Bola Real-Time</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-zinc-950 dark:text-zinc-50 leading-tight">
            Setiap Gol. Setiap Menit.<br />
            <span className="bg-gradient-to-r from-green-600 to-teal-500 dark:from-green-400 dark:to-teal-400 bg-clip-text text-transparent">
              Live & Akurat (WIB).
            </span>
          </h1>

          <p className="text-base sm:text-lg text-zinc-700 dark:text-zinc-300 max-w-2xl leading-relaxed">
            Pantau jadwal pertandingan, skor terkini, dan klasemen liga top dunia dengan penyesuaian otomatis Waktu Indonesia Barat.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
            <Link
              href="/fixtures?status=live"
              className="px-6 py-3 rounded-lg bg-green-600 hover:bg-green-700 text-white font-medium text-sm transition shadow-md shadow-green-600/20 flex items-center gap-2"
            >
              <Radio className="w-4 h-4 animate-pulse" />
              Pertandingan Live
            </Link>
            <Link
              href="/fixtures"
              className="px-6 py-3 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-medium text-sm transition flex items-center gap-2 shadow-xs"
            >
              <Calendar className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
              Semua Jadwal
            </Link>
          </div>
        </div>
      </section>

      {/* 1.5. Live Scores Widget */}
      <section className="max-w-7xl mx-auto px-4 w-full">
        <LiveScoresWidget />
      </section>

      {/* 2. Top Leagues Section */}
      <section className="max-w-7xl mx-auto px-4 w-full">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">Top Leagues</h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">Kompetisi utama Eropa & Internasional</p>
          </div>
          <Link href="/leagues" className="text-sm font-medium text-green-600 dark:text-green-400 hover:underline flex items-center gap-1">
            Semua liga <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {leaguesLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-24 w-full rounded-lg" />
            ))}
          </div>
        ) : leagues && leagues.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {leagues.map((l) => (
              <Link
                key={l.slug}
                href={`/standings/${l.slug}`}
                className="p-5 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-green-600/60 dark:hover:border-green-500/50 group transition flex items-center justify-between shadow-xs hover:shadow-md"
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-zinc-50 dark:bg-zinc-800 p-1.5 flex items-center justify-center border border-zinc-200 dark:border-zinc-700/50 shrink-0 relative overflow-hidden">
                    {l.logo ? (
                      <img
                        src={l.logo}
                        alt={l.name}
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <Trophy className="w-6 h-6 text-zinc-400" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 group-hover:text-green-600 dark:group-hover:text-green-400 transition text-sm sm:text-base">
                      {l.name}
                    </h3>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">{l.country}</p>
                  </div>
                </div>
                <span className="text-xs text-zinc-500 dark:text-zinc-400 group-hover:translate-x-1 group-hover:text-green-600 dark:group-hover:text-green-400 transition font-medium">Klasemen →</span>
              </Link>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center text-zinc-500 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-900/40 rounded-lg border border-zinc-200 dark:border-zinc-800">
            Daftar liga akan muncul setelah data disinkronkan.
          </div>
        )}
      </section>

      {/* 3. Real Today's Matches Section */}
      <section className="max-w-7xl mx-auto px-4 w-full">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
              Jadwal Pertandingan Hari Ini
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 capitalize">{todayFormatted}</p>
          </div>
          <Link href="/fixtures" className="text-sm font-medium text-green-600 dark:text-green-400 hover:underline flex items-center gap-1">
            Lihat semua jadwal →
          </Link>
        </div>

        {matchesLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-36 w-full rounded-lg" />
            ))}
          </div>
        ) : todaysMatches && todaysMatches.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {todaysMatches.map(({ leagueName, leagueSlug, event }) => {
              const comp = event.competitions?.[0];
              const home = comp?.competitors?.find((c) => c.homeAway === "home");
              const away = comp?.competitors?.find((c) => c.homeAway === "away");
              const state = event.status?.type?.state;
              const isLive = state === "in";
              const isFinished = state === "post";
              const detail = event.status?.type?.detail || event.status?.type?.shortDetail || "";
              const kickoffTimeWib = formatKickoffTime(event.date, true);

              const apfId = (event as { apfId?: number }).apfId;
              const hasApfId = typeof apfId === "number" && !isNaN(apfId);

              const cardInner = (
                <>
                  <div className="flex justify-between items-center text-xs text-zinc-500 dark:text-zinc-400">
                    <span className="font-semibold text-zinc-700 dark:text-zinc-300">{leagueName}</span>
                    {isLive ? (
                      <span className="px-2 py-0.5 rounded bg-green-600 text-white font-bold uppercase text-[10px] animate-pulse">
                        LIVE {detail}
                      </span>
                    ) : isFinished ? (
                      <span className="px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 font-mono font-medium text-zinc-700 dark:text-zinc-300">
                        FT
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 font-mono font-medium text-zinc-700 dark:text-zinc-300">
                        {kickoffTimeWib}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-col gap-2.5 font-medium text-sm">
                    {/* Home Team */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        {home?.team?.logo ? (
                          <img
                            src={home.team.logo}
                            alt={home?.team?.displayName || home?.team?.name || 'Home'}
                            title={home?.team?.displayName || home?.team?.name || 'Home'}
                            className="w-5 h-5 object-contain shrink-0"
                          />
                        ) : (
                          <div className="w-5 h-5 rounded-full bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 text-[8px] flex items-center justify-center font-bold shrink-0">
                            {(home?.team?.displayName || "H").slice(0, 2)}
                          </div>
                        )}
                        <span className={`text-zinc-900 dark:text-zinc-100 truncate ${home?.winner ? "font-bold" : ""}`}>
                          {home?.team?.displayName || home?.team?.name || "Home"}
                        </span>
                      </div>
                      <span className="font-mono text-zinc-900 dark:text-zinc-100 font-bold shrink-0">
                        {home?.score ?? (isFinished || isLive ? 0 : "")}
                      </span>
                    </div>

                    {/* Away Team */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        {away?.team?.logo ? (
                          <img
                            src={away.team.logo}
                            alt={away?.team?.displayName || away?.team?.name || 'Away'}
                            title={away?.team?.displayName || away?.team?.name || 'Away'}
                            className="w-5 h-5 object-contain shrink-0"
                          />
                        ) : (
                          <div className="w-5 h-5 rounded-full bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 text-[8px] flex items-center justify-center font-bold shrink-0">
                            {(away?.team?.displayName || "A").slice(0, 2)}
                          </div>
                        )}
                        <span className={`text-zinc-900 dark:text-zinc-100 truncate ${away?.winner ? "font-bold" : ""}`}>
                          {away?.team?.displayName || away?.team?.name || "Away"}
                        </span>
                      </div>
                      <span className="font-mono text-zinc-900 dark:text-zinc-100 font-bold shrink-0">
                        {away?.score ?? (isFinished || isLive ? 0 : "")}
                      </span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-2.5 border-t border-zinc-100 dark:border-zinc-800 text-[11px] text-zinc-500 dark:text-zinc-400">
                    <span className={isLive ? "text-green-600 dark:text-green-400 font-bold flex items-center gap-1" : ""}>
                      {isLive ? (
                        <>
                          <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                          Sedang Berlangsung
                        </>
                      ) : isFinished ? (
                        "Pertandingan Selesai"
                      ) : (
                        `Kickoff: ${kickoffTimeWib}`
                      )}
                    </span>
                    {hasApfId && (
                      <span className="text-green-600 dark:text-green-400 font-medium group-hover:underline">
                        Detail Pertandingan →
                      </span>
                    )}
                  </div>
                </>
              );

              if (hasApfId) {
                return (
                  <Link
                    key={event.id}
                    href={`/fixture/${apfId}`}
                    className="p-4 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex flex-col justify-between gap-4 hover:border-green-600/60 dark:hover:border-green-500/50 transition group shadow-xs hover:shadow-md cursor-pointer"
                  >
                    {cardInner}
                  </Link>
                );
              }

              return (
                <div
                  key={event.id}
                  className="p-4 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex flex-col justify-between gap-4 shadow-xs select-none"
                >
                  {cardInner}
                </div>
              );
            })}
          </div>
        ) : (
          /* Empty State */
          <div className="text-center py-14 px-6 rounded-xl bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center text-zinc-600 dark:text-zinc-400 mb-1">
              <Calendar className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              Tidak ada jadwal pertandingan hari ini
            </h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 max-w-md">
              Tidak ada laga yang dijadwalkan pada tanggal {todayFormatted}. Silakan periksa jadwal pertandingan mendatang.
            </p>
            <Link
              href="/fixtures"
              className="mt-2 inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-green-600 hover:bg-green-700 text-white font-medium text-sm transition shadow-sm"
            >
              Lihat Jadwal Lengkap <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        )}
      </section>

      {/* 4. Features Section */}
      <section className="max-w-7xl mx-auto px-4 w-full pt-4">
        <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 mb-6">
          Dibuat untuk Penggemar Sepak Bola
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="pl-4 border-l-2 border-green-600 dark:border-green-500 flex flex-col gap-2">
            <h3 className="font-bold text-lg text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <Zap className="w-5 h-5 text-green-600 dark:text-green-400" />
              Skor Real-Time
            </h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Pembaruan skor otomatis saat pertandingan berlangsung dengan jeda minim.
            </p>
          </div>
          <div className="pl-4 border-l-2 border-green-600 dark:border-green-500 flex flex-col gap-2">
            <h3 className="font-bold text-lg text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-green-600 dark:text-green-400" />
              Waktu Indonesia (WIB)
            </h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Seluruh jadwal dan kickoff waktu Eropa otomatis dikonversi ke waktu lokal Anda.
            </p>
          </div>
          <div className="pl-4 border-l-2 border-green-600 dark:border-green-500 flex flex-col gap-2">
            <h3 className="font-bold text-lg text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-green-600 dark:text-green-400" />
              Bebas Iklan Mengganggu
            </h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Tampilan bersih, responsif, dan fokus murni pada statistik dan jadwal pertandingan.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
