import { Standing } from "@/types/football";
import Link from "next/link";
import { cn } from "@/lib/utils";

export function StandingsTable({ standings, leagueSlug }: { standings: Standing[], leagueSlug: string }) {
  return (
    <div className="w-full overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
      <table className="w-full text-sm text-left">
        <thead className="text-xs text-zinc-500 uppercase bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
          <tr>
            <th className="px-4 py-3">#</th>
            <th className="px-4 py-3">Club</th>
            <th className="px-4 py-3 text-center">P</th>
            <th className="px-4 py-3 text-center">W</th>
            <th className="px-4 py-3 text-center">D</th>
            <th className="px-4 py-3 text-center">L</th>
            <th className="px-4 py-3 text-center">GF</th>
            <th className="px-4 py-3 text-center">GA</th>
            <th className="px-4 py-3 text-center">GD</th>
            <th className="px-4 py-3 text-center">Pts</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
          {standings.map((s, idx) => (
            <tr
              key={s.team._id}
              className={cn(
                "hover:bg-zinc-100 dark:hover:bg-zinc-900 transition",
                idx < 4 && "border-l-4 border-l-green-600",
                idx >= 4 && idx < 5 && "border-l-4 border-l-amber-500",
                idx >= standings.length - 3 && "border-l-4 border-l-red-600"
              )}
            >
              <td className="px-4 py-3 font-mono">{s.position}</td>
              <td className="px-4 py-3 font-medium text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                {s.team.logo && <img src={s.team.logo} alt={s.team.name} className="w-5 h-5 rounded-full" />}
                <Link href={`/club/${leagueSlug}/${s.team._id}`} className="hover:text-green-600 transition">
                  {s.team.name}
                </Link>
              </td>
              <td className="px-4 py-3 text-center font-mono">{s.played}</td>
              <td className="px-4 py-3 text-center font-mono">{s.won}</td>
              <td className="px-4 py-3 text-center font-mono">{s.drawn}</td>
              <td className="px-4 py-3 text-center font-mono">{s.lost}</td>
              <td className="px-4 py-3 text-center font-mono">{s.goalsFor}</td>
              <td className="px-4 py-3 text-center font-mono">{s.goalsAgainst}</td>
              <td className="px-4 py-3 text-center font-mono">{s.goalDifference}</td>
              <td className="px-4 py-3 text-center font-mono font-bold text-green-600">{s.points}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
