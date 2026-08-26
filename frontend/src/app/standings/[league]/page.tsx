"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { fetchAPI } from "@/lib/api";
import {
  ApiLeaguesResponse,
  ApiLeague,
  ApiStandingsResponse,
  ApiStandingEntry,
  Standing,
  Club,
} from "@/types/football";
import { StandingsTable } from "@/components/league/StandingsTable";
import { Skeleton } from "@/components/ui/Skeleton";
import { useState } from "react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

function entryToStanding(e: ApiStandingEntry): Standing {
  const stat = (name: string) =>
    Number(e.stats.find((s) => s.abbreviation === name)?.displayValue ?? 0);

  const team: Club = {
    _id: e.team.id,
    name: e.team.displayName || e.team.name,
    logo: e.team.logo || undefined,
  };

  return {
    position: e.rank,
    team,
    played: stat("gamesPlayed"),
    won: stat("wins"),
    drawn: stat("ties"),
    lost: stat("losses"),
    goalsFor: stat("goalsFor"),
    goalsAgainst: stat("goalsAgainst"),
    goalDifference: stat("goalDifference"),
    points: stat("points"),
  };
}

export default function StandingsPage() {
  const { league } = useParams<{ league: string }>();
  const [activeGroup, setActiveGroup] = useState(0);

  const { data: standingsData, isLoading } = useQuery<ApiStandingsResponse, Error>({
    queryKey: ["standings", league],
    queryFn: () =>
      fetchAPI<ApiStandingsResponse>(`/get/soccer/${league}/standings`),
    staleTime: 5 * 60 * 1000,
  });

  const { data: leagueInfo } = useQuery<ApiLeague | undefined, Error>({
    queryKey: ["leagues"],
    queryFn: () =>
      fetchAPI<ApiLeaguesResponse>("/get/soccer/leagues").then((r) =>
        r.leagues?.find((l) => l.slug === league)
      ),
  });

  const groups = standingsData?.children ?? [];
  const currentGroup = groups[activeGroup];
  const standings: Standing[] = (currentGroup?.standings?.entries ?? []).map(
    entryToStanding
  );

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-10 space-y-6">
        <header>
          <Skeleton variant="text" className="w-48 h-8" />
          <Skeleton variant="text" className="w-24 h-4 mt-2" />
        </header>
        <div className="space-y-2">
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} variant="rect" className="h-12 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-10 min-h-screen">
      <div className="mb-6">
        <Link
          href="/leagues"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-500 dark:text-zinc-400 hover:text-green-600 dark:hover:text-green-400 mb-4 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Kembali ke Daftar Liga
        </Link>
        <header className="flex items-center gap-4">
          {leagueInfo?.logo && (
            <div className="w-12 h-12 rounded-xl bg-zinc-50 dark:bg-zinc-800 p-1.5 flex items-center justify-center border border-zinc-200 dark:border-zinc-700 shadow-xs shrink-0">
              <img src={leagueInfo.logo} alt={leagueInfo.name} className="w-full h-full object-contain" />
            </div>
          )}
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
              Klasemen {standingsData?.name ?? leagueInfo?.name ?? "Liga"}
            </h1>
            <p className="text-zinc-600 dark:text-zinc-400 text-sm mt-0.5">
              Musim {standingsData?.season ?? leagueInfo?.season?.year ?? 2026}
            </p>
          </div>
        </header>
      </div>

      {groups.length > 1 && (
        <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
          {groups.map((g, i) => (
            <button
              key={g.id}
              onClick={() => setActiveGroup(i)}
              className={cn(
                "px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition shadow-xs",
                i === activeGroup
                  ? "bg-green-600 text-white font-semibold"
                  : "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700"
              )}
            >
              {g.name}
            </button>
          ))}
        </div>
      )}

      {standings.length > 0 ? (
        <StandingsTable standings={standings} leagueSlug={league} />
      ) : (
        <div className="text-zinc-500 dark:text-zinc-400 text-center py-16 bg-zinc-50 dark:bg-zinc-900/30 rounded-xl border border-zinc-200 dark:border-zinc-800">
          Data klasemen belum tersedia untuk kompetisi ini.
        </div>
      )}
    </div>
  );
}
