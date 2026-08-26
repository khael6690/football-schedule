import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 py-10 transition-colors">
      <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <Link href="/" className="flex items-center gap-2.5 font-bold text-lg text-zinc-900 dark:text-zinc-100 group">
            <img
              src="/logo.png"
              alt="Football Live"
              className="w-7 h-7 object-contain drop-shadow-sm group-hover:scale-105 transition-transform"
            />
            <span>
              Football<span className="text-green-600 dark:text-green-500">Live</span>
            </span>
          </Link>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Jadwal dan skor pertandingan sepak bola real-time dengan Waktu Indonesia Barat (WIB).
          </p>
        </div>

        <div className="flex flex-wrap gap-6 md:justify-end text-sm">
          <Link href="/fixtures?status=live" className="text-zinc-600 hover:text-green-600 dark:text-zinc-400 dark:hover:text-green-500 transition-colors">
            Live Scores
          </Link>
          <Link href="/fixtures" className="text-zinc-600 hover:text-green-600 dark:text-zinc-400 dark:hover:text-green-500 transition-colors">
            Fixtures
          </Link>
          <Link href="/leagues" className="text-zinc-600 hover:text-green-600 dark:text-zinc-400 dark:hover:text-green-500 transition-colors">
            Leagues
          </Link>
          <Link href="/standings/eng.1" className="text-zinc-600 hover:text-green-600 dark:text-zinc-400 dark:hover:text-green-500 transition-colors">
            Standings
          </Link>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 mt-8 pt-6 border-t border-zinc-200 dark:border-zinc-900 flex flex-col sm:flex-row justify-between items-center text-xs text-zinc-500 dark:text-zinc-400 gap-4">
        <p>© {new Date().getFullYear()} FootballLive. All rights reserved.</p>
        <p>Data via Football-Data.org API</p>
      </div>
    </footer>
  );
}
