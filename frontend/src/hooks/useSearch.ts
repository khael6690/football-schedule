import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchAPI } from "@/lib/api";
import { League, Club } from "@/types/football";

export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

export function useSearch(query: string) {
  const debouncedQuery = useDebounce(query.trim(), 500);

  const leaguesQuery = useQuery<League[], Error>({
    queryKey: ["searchLeagues", debouncedQuery],
    queryFn: () => fetchAPI<League[]>(`/get/soccer/leagues/search?q=${encodeURIComponent(debouncedQuery)}`),
    enabled: !!debouncedQuery,
  });

  const clubsQuery = useQuery<Club[], Error>({
    queryKey: ["searchClubs", debouncedQuery],
    queryFn: () => fetchAPI<Club[]>(`/get/soccer/clubs/search?q=${encodeURIComponent(debouncedQuery)}`),
    enabled: !!debouncedQuery,
  });

  return {
    leagues: leaguesQuery.data || [],
    clubs: clubsQuery.data || [],
    isLoading: (leaguesQuery.isLoading || clubsQuery.isLoading) && !!debouncedQuery,
    isSearching: debouncedQuery.length > 0,
  };
}
