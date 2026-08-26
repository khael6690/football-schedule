import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchAPI } from "@/lib/api";
import { MOCK_LEAGUES, MOCK_CLUBS } from "@/lib/mockData";

export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

export function useSearch(query: string) {
  const debouncedQuery = useDebounce(query.trim().toLowerCase(), 300);

  const leaguesQuery = useQuery({
    queryKey: ["searchLeagues", debouncedQuery],
    queryFn: async () => {
      try {
        const res = await fetchAPI<any[]>(`/get/soccer/leagues/search?q=${encodeURIComponent(debouncedQuery)}`);
        if (res && res.length > 0) return res;
      } catch (e) {
        // Fallback to mock search
      }
      return MOCK_LEAGUES.filter(
        (l) =>
          l.name.toLowerCase().includes(debouncedQuery) ||
          l.country.toLowerCase().includes(debouncedQuery) ||
          l.slug.toLowerCase().includes(debouncedQuery)
      );
    },
    enabled: !!debouncedQuery,
  });

  const clubsQuery = useQuery({
    queryKey: ["searchClubs", debouncedQuery],
    queryFn: async () => {
      try {
        const res = await fetchAPI<any[]>(`/get/soccer/clubs/search?q=${encodeURIComponent(debouncedQuery)}`);
        if (res && res.length > 0) return res;
      } catch (e) {
        // Fallback to mock search
      }
      return Object.values(MOCK_CLUBS).filter(
        (c) =>
          c.name.toLowerCase().includes(debouncedQuery) ||
          c.shortName.toLowerCase().includes(debouncedQuery) ||
          c.city.toLowerCase().includes(debouncedQuery) ||
          c.coach.toLowerCase().includes(debouncedQuery)
      );
    },
    enabled: !!debouncedQuery,
  });

  const filteredLeagues = debouncedQuery
    ? Array.isArray(leaguesQuery.data)
      ? leaguesQuery.data
      : MOCK_LEAGUES.filter(
          (l) =>
            l.name.toLowerCase().includes(debouncedQuery) ||
            l.country.toLowerCase().includes(debouncedQuery)
        )
    : [];

  const filteredClubs = debouncedQuery
    ? Array.isArray(clubsQuery.data)
      ? clubsQuery.data
      : Object.values(MOCK_CLUBS).filter(
          (c) =>
            c.name.toLowerCase().includes(debouncedQuery) ||
            c.shortName.toLowerCase().includes(debouncedQuery)
        )
    : [];

  return {
    leagues: filteredLeagues,
    clubs: filteredClubs,
    isLoading: (leaguesQuery.isLoading || clubsQuery.isLoading) && !!debouncedQuery,
    isSearching: debouncedQuery.length > 0,
  };
}
