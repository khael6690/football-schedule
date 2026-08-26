import { Standing } from "@/types/football";
import Link from "next/link";
import { cn } from "@/lib/utils";

export function StandingsTable({ standings, leagueSlug }: { standings: Standing[], leagueSlug: string }) {
  return (
    <div className="w-full overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xs">
      <table className="w-full text-sm text-left">
        <thead className="text-xs text-zinc-600 dark:text-zinc-400 uppercase bg-zinc-50 dark:bg-zinc-800/80 border-b border-zinc-200 dark:border-zinc-800">
          <tr>
            <th className="px-4 py-3.5 w-12 text-center">#</th>
            <th className="px-4 py-3.5">Klub</th>
            <th className="px-3 py-3.5 text-center" title="Main">P</th>
            <th className="px-3 py-3.5 text-center" title="Menang">W</th>
            <th className="px-3 py-3.5 text-center" title="Seri">D</th>
            <th className="px-3 py-3.5 text-center" title="Kalah">L</th>
            <th className="px-3 py-3.5 text-center" title="Gol Memasukkan">GF</th>
            <th className="px-3 py-3.5 text-center" title="Gol Kemasukan">GA</th>
            <th className="px-3 py-3.5 text-center" title="Selisih Gol">GD</th>
            <th className="px-4 py-3.5 text-center font-bold" title="Poin">Pts</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/70">
          {standings.map((s, idx) => (
            <tr
              key={s.team._id}
              className={cn(
                "hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors",
                idx < 4 && "border-l-4 border-l-green-600 dark:border-l-green-500",
                idx >= 4 && idx < 6 && "border-l-4 border-l-blue-500 dark:border-l-blue-400",
                idx >= standings.length - 3 && "border-l-4 border-l-red-500 dark:border-l-red-400"
              )}
            >
              <td className="px-4 py-3.5 text-center font-mono font-medium text-zinc-600 dark:text-zinc-400">
                {s.position}
              </td>
              <td className="px-4 py-3.5 font-medium text-zinc-900 dark:text-zinc-100">
                <div className="flex items-center gap-2.5">
                  {s.team.logo ? (
                    <img
                      src={s.team.logo}
                      alt={s.team.name}
                      className="w-5 h-5 object-contain shrink-0"
                    />
                  ) : (
                    <div className="w-5 h-5 rounded-full bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300 text-[8px] flex items-center justify-center font-bold shrink-0">
                      {(s.team.name || "T").slice(0, 2)}
                    </div>
                  )}
                  <Link
                    href={`/club/${leagueSlug}/${s.team._id}`}
                    className="hover:text-green-600 dark:hover:text-green-400 transition-colors truncate"
                  >
                    {s.team.name}
                  </Link>
                </div>
              </td>
              <td className="px-3 py-3.5 text-center font-mono text-zinc-700 dark:text-zinc-300">{s.played}</td>
              <td className="px-3 py-3.5 text-center font-mono text-zinc-700 dark:text-zinc-300">{s.won}</td>
              <td className="px-3 py-3.5 text-center font-mono text-zinc-700 dark:text-zinc-300">{s.drawn}</td>
              <td className="px-3 py-3.5 text-center font-mono text-zinc-700 dark:text-zinc-300">{s.lost}</td>
              <td className="px-3 py-3.5 text-center font-mono text-zinc-700 dark:text-zinc-300">{s.goalsFor}</td>
              <td className="px-3 py-3.5 text-center font-mono text-zinc-700 dark:text-zinc-300">{s.goalsAgainst}</td>
              <td className="px-3 py-3.5 text-center font-mono text-zinc-700 dark:text-zinc-300">{s.goalDifference}</td>
              <td className="px-4 py-3.5 text-center font-mono font-bold text-green-600 dark:text-green-400 bg-green-500/5">
                {s.points}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
