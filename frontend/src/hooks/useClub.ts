import { useQuery } from "@tanstack/react-query";
import { fetchAPI } from "@/lib/api";
import { Club, ApiClubDetailResponse } from "@/types/football";

export function useClub(leagueSlug: string, clubId: string) {
  return useQuery<Club, Error>({
    queryKey: ["club", leagueSlug, clubId],
    queryFn: () =>
      fetchAPI<ApiClubDetailResponse>(
        `/get/soccer/${leagueSlug}/clubs/${clubId}`
      ).then((r) => ({
        _id: r.club.id,
        name: r.club.displayName,
        shortName: r.club.shortDisplayName,
        logo: r.club.logo,
        venue: r.club.venue?.name
          ? {
              name: r.club.venue.name,
              city: r.club.city || "",
            }
          : undefined,
        coach: r.coach?.name || undefined,
      })),
  });
}
