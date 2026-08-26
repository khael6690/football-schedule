export function SkeletonMatchRow() {
  return (
    <div className="flex items-center gap-4 px-4 py-3.5 border-b border-zinc-100 dark:border-zinc-800/80 last:border-b-0 animate-pulse">
      {/* Time */}
      <div className="w-10 h-3 bg-zinc-200 dark:bg-zinc-700 rounded" />
      {/* Home team */}
      <div className="flex items-center gap-2 flex-1">
        <div className="w-6 h-6 rounded-full bg-zinc-200 dark:bg-zinc-700" />
        <div className="h-3 bg-zinc-200 dark:bg-zinc-700 rounded w-28" />
      </div>
      {/* Score */}
      <div className="w-12 h-5 bg-zinc-200 dark:bg-zinc-700 rounded mx-2" />
      {/* Away team */}
      <div className="flex items-center gap-2 flex-1 justify-end">
        <div className="h-3 bg-zinc-200 dark:bg-zinc-700 rounded w-28" />
        <div className="w-6 h-6 rounded-full bg-zinc-200 dark:bg-zinc-700" />
      </div>
      {/* Status */}
      <div className="w-10 h-4 bg-zinc-200 dark:bg-zinc-700 rounded" />
    </div>
  );
}
