import { useQuery } from "@tanstack/react-query";
import { fetchAPI } from "@/lib/api";
import { Match, MatchEvent } from "@/types/football";

export function useMatch(leagueSlug: string, eventId: string) {
  return useQuery<Match, Error>({
    queryKey: ["match", leagueSlug, eventId],
    queryFn: () => fetchAPI<Match>(`/get/soccer/${leagueSlug}/events/${eventId}`),
    refetchInterval: (query) => {
      const match = query.state.data;
      return match?.status === "live" ? 15000 : false;
    },
  });
}

export function useMatchPlays(leagueSlug: string, eventId: string, isLive: boolean) {
  return useQuery<MatchEvent[], Error>({
    queryKey: ["matchPlays", leagueSlug, eventId],
    queryFn: () => fetchAPI<MatchEvent[]>(`/get/soccer/${leagueSlug}/events/${eventId}/plays?important=false`),
    refetchInterval: isLive ? 15000 : false,
  });
}
