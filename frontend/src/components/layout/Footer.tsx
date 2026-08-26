import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 py-10">
      <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <Link href="/" className="flex items-center gap-2 font-geist font-bold text-lg text-zinc-900 dark:text-zinc-100">
            <svg className="w-6 h-6 text-green-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
            </svg>
            <span>Football<span className="text-green-600">Live</span></span>
          </Link>
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
            Real-time football. No noise.
          </p>
        </div>

        <div className="flex flex-wrap gap-6 md:justify-end text-sm">
          <Link href="/live" className="text-zinc-600 dark:text-zinc-400 hover:text-green-600">
            Live Scores
          </Link>
          <Link href="/fixtures" className="text-zinc-600 dark:text-zinc-400 hover:text-green-600">
            Fixtures
          </Link>
          <Link href="/standings" className="text-zinc-600 dark:text-zinc-400 hover:text-green-600">
            Standings
          </Link>
          <Link href="/about" className="text-zinc-600 dark:text-zinc-400 hover:text-green-600">
            About
          </Link>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 mt-8 pt-6 border-t border-zinc-100 dark:border-zinc-900 flex flex-col sm:flex-row justify-between items-center text-xs text-zinc-500 dark:text-zinc-400 gap-4">
        <p>© {new Date().getFullYear()} FootballLive. All rights reserved.</p>
        <p>Data via API-Football</p>
      </div>
    </footer>
  );
}
