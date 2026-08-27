"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { Clock } from "lucide-react";
import { fetchLiveMatches, type LiveMatchResponse } from "@/lib/api";
import { getApiBase } from "@/lib/api";

interface LiveMatch {
  id: string;
  league: { id: string; name: string; slug: string; logo?: string };
  home: { id: string; name: string; logo?: string; score: number };
  away: { id: string; name: string; logo?: string; score: number };
  score: { home: number; away: number };
  status: { state: string; short: string; long: string; elapsed?: number };
  events?: Array<{
    time: number;
    extraTime?: number;
    teamName: string;
    playerName: string;
    type: string;
    detail: string;
  }>;
}

export default function LiveScoresWidget() {
  const [matches, setMatches] = useState<LiveMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState<string>("loading");
  const [stale, setStale] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);

  // Initial load via fetch
  const loadLive = useCallback(async () => {
    try {
      const res = await fetchLiveMatches();
      setMatches(res.matches || []);
      setSource(res.meta?.source || "fetch");
      setStale(res.meta?.stale || false);
    } catch (e) {
      console.warn("Failed to fetch live matches:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLive();

    // Try SSE for real-time updates, fall back to polling
    let pollTimer: ReturnType<typeof setInterval> | null = null;

    try {
      const sseUrl = `${getApiBase()}/api/live/stream`;
      const es = new EventSource(sseUrl);
      eventSourceRef.current = es;

      es.addEventListener("live-update", (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.matches) {
            setMatches(data.matches);
            setSource("sse");
            setStale(false);
          }
        } catch {}
      });

      es.addEventListener("connected", () => {
        setSource("sse");
      });

      es.onerror = () => {
        // SSE failed — fall back to polling
        console.warn("SSE connection failed, falling back to polling");
        es.close();
        eventSourceRef.current = null;
        pollTimer = setInterval(loadLive, 15000);
      };
    } catch {
      // SSE not available — use polling
      pollTimer = setInterval(loadLive, 15000);
    }

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      if (pollTimer) clearInterval(pollTimer);
    };
  }, [loadLive]);

  if (loading) {
    return (
      <div className="p-6 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs animate-pulse">
        <div className="h-5 w-40 bg-zinc-200 dark:bg-zinc-800 rounded mb-4" />
        <div className="space-y-3">
          <div className="h-16 bg-zinc-100 dark:bg-zinc-800/60 rounded-lg" />
          <div className="h-16 bg-zinc-100 dark:bg-zinc-800/60 rounded-lg" />
        </div>
      </div>
    );
  }

  if (matches.length === 0) {
    return (
      <div className="p-6 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs flex flex-col items-center justify-center text-center gap-3">
        <div className="w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-400">
          <Clock className="w-5 h-5" />
        </div>
        <div>
          <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm">Tidak Ada Pertandingan Live</h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            Skor langsung akan muncul otomatis di sini saat pertandingan dimulai.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs overflow-hidden">
      <div className="px-5 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-900/50">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75 animate-ping" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
          </span>
          <h3 className="font-bold text-zinc-900 dark:text-zinc-100 text-sm">LIVE SEKARANG</h3>
        </div>
        <div className="flex items-center gap-2">
          {stale && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 font-medium">
              CACHED
            </span>
          )}
          <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/10 text-red-600 dark:text-red-400 font-semibold border border-red-500/20">
            {matches.length} Match{matches.length > 1 ? "es" : ""}
          </span>
        </div>
      </div>

      <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
        {matches.map((m) => (
          <div key={m.id} className="p-4 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition">
            <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400 mb-2">
              <div className="flex items-center gap-1.5">
                {m.league.logo && <img src={m.league.logo} alt="" className="w-3.5 h-3.5 object-contain" />}
                <span className="font-medium text-zinc-700 dark:text-zinc-300">{m.league.name}</span>
              </div>
              <span className="px-2 py-0.5 rounded bg-red-500 text-white font-bold text-[10px] animate-pulse">
                {m.status.short || "LIVE"} {m.status.elapsed ? `${m.status.elapsed}'` : ""}
              </span>
            </div>

            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2.5 flex-1 min-w-0">
                {m.home.logo && <img src={m.home.logo} alt="" className="w-5 h-5 object-contain shrink-0" />}
                <span className="font-semibold text-sm text-zinc-900 dark:text-zinc-100 truncate">{m.home.name}</span>
              </div>
              <div className="px-3 py-1 rounded bg-zinc-100 dark:bg-zinc-800 font-extrabold text-sm text-zinc-900 dark:text-zinc-100 shrink-0 tabular-nums">
                {m.score.home} - {m.score.away}
              </div>
              <div className="flex items-center gap-2.5 flex-1 min-w-0 justify-end text-right">
                <span className="font-semibold text-sm text-zinc-900 dark:text-zinc-100 truncate">{m.away.name}</span>
                {m.away.logo && <img src={m.away.logo} alt="" className="w-5 h-5 object-contain shrink-0" />}
              </div>
            </div>

            {m.events && m.events.length > 0 && (
              <div className="mt-2.5 pt-2 border-t border-zinc-100 dark:border-zinc-800/80 flex flex-wrap gap-1.5 text-[11px] text-zinc-600 dark:text-zinc-400">
                {m.events.slice(-3).map((ev, i) => (
                  <span key={i} className="inline-flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded">
                    <span>
                      {ev.type === "Goal" ? "⚽" : ev.type === "Card" && ev.detail?.includes("Yellow") ? "🟨" : ev.type === "Card" && ev.detail?.includes("Red") ? "🟥" : ev.type === "subst" ? "🔄" : "📋"}
                    </span>
                    <span className="font-medium truncate max-w-[100px]">{ev.playerName}</span>
                    <span className="text-zinc-400">{ev.time}'</span>
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
