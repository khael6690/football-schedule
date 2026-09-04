'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchFixtureDetail } from '@/lib/api';
import type { FixtureDetail } from '@/types/fixtureDetail';

export function useFixtureDetail(apfId: number | string | undefined) {
  const numericId = apfId ? Number(apfId) : undefined;

  return useQuery<FixtureDetail>({
    queryKey: ['fixture-detail', numericId],
    queryFn: async () => {
      if (!numericId || isNaN(numericId)) {
        throw new Error('ID pertandingan tidak valid');
      }
      const res = await fetchFixtureDetail(numericId);
      return res.fixture;
    },
    enabled: !!numericId && !isNaN(numericId),
    refetchInterval: (query) => {
      const data = query.state.data;
      if (data?.status?.state === 'in') {
        return 30000;
      }
      return false;
    },
    staleTime: 15000,
  });
}
