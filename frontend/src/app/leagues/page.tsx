"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchAPI } from "@/lib/api";
import { ApiLeaguesResponse, ApiLeague } from "@/types/football";
import Link from "next/link";
import { Skeleton } from "@/components/ui/Skeleton";
import { Trophy, ArrowRight } from "lucide-react";

export default function LeaguesPage() {
  const { data: leagues, isLoading } = useQuery<ApiLeague[], Error>({
    queryKey: ["leaguesPage"],
    queryFn: async () => {
      try {
        const r = await fetchAPI<ApiLeaguesResponse>("/get/soccer/leagues");
        if (r && Array.isArray(r.leagues) && r.leagues.length > 0) {
          return r.leagues;
        }
      } catch (e) {
        console.warn("Failed to fetch leagues:", e);
      }
      return [];
    },
    staleTime: 60000,
  });

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-10 space-y-8">
        <Skeleton variant="text" className="w-48 h-8" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} variant="rect" className="h-28 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-10 min-h-screen">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
          Semua Liga & Kompetisi
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
          Daftar liga sepak bola top dunia dan jadwal pertandingan lengkap.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {(leagues || []).map((league) => (
          <Link
            key={league.slug}
            href={`/standings/${league.slug}`}
            className="p-5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-green-600/60 dark:hover:border-green-500/50 transition-all group shadow-xs hover:shadow-md flex items-center justify-between"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-lg bg-zinc-50 dark:bg-zinc-800 p-1.5 flex items-center justify-center border border-zinc-200 dark:border-zinc-700/50 shrink-0 relative overflow-hidden">
                {league.logo ? (
                  <img
                    src={league.logo}
                    alt={league.name}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <Trophy className="w-6 h-6 text-zinc-400" />
                )}
              </div>
              <div>
                <h2 className="font-semibold text-base text-zinc-900 dark:text-zinc-100 group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors">
                  {league.name}
                </h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">{league.country}</p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-zinc-400 group-hover:text-green-600 dark:group-hover:text-green-400 group-hover:translate-x-1 transition-all shrink-0" />
          </Link>
        ))}
      </div>
    </div>
  );
}
