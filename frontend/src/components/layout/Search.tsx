"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Search as SearchIcon, X, Loader2, Trophy, Shield } from "lucide-react";
import { useSearch } from "@/hooks/useSearch";

interface SearchProps {
  open: boolean;
  onClose: () => void;
}

export function Search({ open, onClose }: SearchProps) {
  const [query, setQuery] = useState("");
  const router = useRouter();
  const { leagues, clubs, isLoading, isSearching } = useSearch(query);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const handleSelect = (url: string) => {
    router.push(url);
    onClose();
    setQuery("");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 px-4 bg-zinc-950/80 backdrop-blur-sm">
      <div className="fixed inset-0" onClick={onClose} />

      <div className="relative w-full max-w-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-2xl overflow-hidden z-10">
        <div className="flex items-center px-4 border-b border-zinc-200 dark:border-zinc-800">
          <SearchIcon className="w-5 h-5 text-zinc-400 shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search teams, leagues..."
            autoFocus
            className="w-full px-4 py-4 bg-transparent text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 border-none outline-none text-base"
          />
          {isLoading ? (
            <Loader2 className="w-5 h-5 text-green-600 animate-spin shrink-0" />
          ) : query ? (
            <button onClick={() => setQuery("")} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200">
              <X className="w-5 h-5" />
            </button>
          ) : null}
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-4 space-y-6">
          {!isSearching && (
            <div className="text-center py-8 text-zinc-400 text-sm">
              Type at least one character to search
            </div>
          )}

          {isSearching && !isLoading && leagues.length === 0 && clubs.length === 0 && (
            <div className="text-center py-8 text-zinc-400 text-sm">
              No results found for &quot;{query}&quot;
            </div>
          )}

          {leagues.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2 px-2">
                Leagues
              </div>
              <div className="space-y-1">
                {leagues.slice(0, 5).map((league: any) => (
                  <button
                    key={league.slug}
                    onClick={() => handleSelect(`/standings/${league.slug}`)}
                    className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition text-left"
                  >
                    <div className="flex items-center gap-3">
                      {league.logo ? (
                        <img src={league.logo} alt={league.name} className="w-8 h-8 rounded object-contain shrink-0" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center text-zinc-600 dark:text-zinc-300">
                          <Trophy className="w-4 h-4" />
                        </div>
                      )}
                      <div>
                        <div className="font-medium text-sm text-zinc-900 dark:text-zinc-100">{league.name}</div>
                        <div className="text-xs text-zinc-500">{league.country}</div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {clubs.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2 px-2">
                Clubs
              </div>
              <div className="space-y-1">
                {clubs.slice(0, 10).map((club: any) => {
                  const clubId = club.id || club._id;
                  const leagueSlug = club.leagueSlug || "eng.1";
                  return (
                    <button
                      key={clubId}
                      onClick={() => handleSelect(`/club/${leagueSlug}/${clubId}`)}
                      className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition text-left"
                    >
                      <div className="flex items-center gap-3">
                        {club.logo ? (
                          <img src={club.logo} alt={club.name} className="w-8 h-8 rounded-full object-contain shrink-0" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center text-zinc-600 dark:text-zinc-300">
                            <Shield className="w-4 h-4" />
                          </div>
                        )}
                        <div>
                          <div className="font-medium text-sm text-zinc-900 dark:text-zinc-100">{club.name}</div>
                          <div className="text-xs text-zinc-500">{club.shortName || club.city || club.venue || "Club"}</div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
