"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchAPI } from "@/lib/api";
import { ApiLeague, ApiLeaguesResponse } from "@/types/football";
import Link from "next/link";

import { Skeleton } from "@/components/ui/Skeleton";

export default function LeaguesPage() {
  const { data: leagues, isLoading } = useQuery<ApiLeague[], Error>({
    queryKey: ["leagues"],
    queryFn: () =>
      fetchAPI<ApiLeaguesResponse>("/get/soccer/leagues").then(
        (r) => r.leagues
      ),
  });

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-10 space-y-8">
        <Skeleton variant="text" className="w-32 h-8" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} variant="rect" className="h-24" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100 mb-8">Leagues</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {leagues?.map((league) => (
          <Link
            key={league.slug}
            href={`/standings/${league.slug}`}
            className="p-5 rounded-lg bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-green-600/50 transition group"
          >
            {league.logo && (
              <img src={league.logo} alt={league.name} className="w-8 h-8 mb-3 rounded" />
            )}
            <h2 className="font-semibold text-lg text-zinc-900 dark:text-zinc-100 group-hover:text-green-600">{league.name}</h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">{league.country}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
