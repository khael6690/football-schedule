"use client";

import { useParams } from "next/navigation";
import { useClub } from "@/hooks/useClub";

import { Skeleton } from "@/components/ui/Skeleton";

export default function ClubPage() {
  const { league, id } = useParams<{ league: string, id: string }>();
  const { data: club, isLoading } = useClub(league, id);

  if (isLoading) {
    return (
      <div className="flex flex-col">
        <header className="bg-zinc-900 py-10 px-4">
          <div className="max-w-7xl mx-auto flex items-center gap-6">
            <Skeleton variant="circle" className="w-20 h-20 bg-zinc-800" />
            <div className="space-y-2">
              <Skeleton variant="text" className="w-48 h-8 bg-zinc-800" />
              <Skeleton variant="text" className="w-32 bg-zinc-800" />
            </div>
          </div>
        </header>
        <main className="max-w-7xl mx-auto px-4 py-10 space-y-8">
          <div>
            <Skeleton variant="text" className="w-32 h-6 mb-4" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Skeleton variant="rect" className="h-24" />
              <Skeleton variant="rect" className="h-24" />
              <Skeleton variant="rect" className="h-24" />
            </div>
          </div>
        </main>
      </div>
    );
  }
  if (!club) return <div className="p-10 text-center text-zinc-500">Club not found</div>;

  return (
    <div className="flex flex-col">
      <header className="bg-zinc-900 text-zinc-100 py-10 px-4">
        <div className="max-w-7xl mx-auto flex items-center gap-6">
          {club.logo && <img src={club.logo} alt={club.name} className="w-20 h-20 rounded-full" />}
          <div>
            <h1 className="text-4xl font-bold">{club.name}</h1>
            <p className="text-zinc-400 italic mt-1">{club.venue?.name}</p>
            <p className="text-sm mt-2">Manager: {club.coach || 'Unknown'}</p>
          </div>
        </div>
      </header>
      
      <main className="max-w-7xl mx-auto px-4 py-10">
        <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-6">Upcoming Fixtures</h2>
        <p className="text-zinc-500 dark:text-zinc-400">Upcoming matches data coming soon...</p>
        
        <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mt-12 mb-6">Squad</h2>
        <p className="text-zinc-500 dark:text-zinc-400">Squad data coming soon</p>
      </main>
    </div>
  );
}
