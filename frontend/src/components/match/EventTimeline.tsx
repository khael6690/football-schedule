import { MatchEvent } from "@/types/football";
import { Goal, TriangleAlert, Repeat, AlertTriangle } from "lucide-react";

export function EventTimeline({ events }: { events: MatchEvent[] }) {
  if (!events || events.length === 0) {
    return <div className="p-8 text-center text-zinc-500 dark:text-zinc-400">No events recorded yet</div>;
  }

  return (
    <div className="space-y-4">
      {events.map((event) => (
        <div key={event._id} className="flex items-center gap-4 py-2 border-b border-zinc-100 dark:border-zinc-800">
          <span className="font-mono text-xs text-zinc-400 w-10 shrink-0">{event.minute}'</span>
          <div className="shrink-0">
            {event.type === 'goal' && <Goal className="w-4 h-4 text-green-600" />}
            {event.type === 'yellow_card' && <TriangleAlert className="w-4 h-4 text-amber-500" />}
            {event.type === 'red_card' && <AlertTriangle className="w-4 h-4 text-red-600" />}
            {event.type === 'substitution' && <Repeat className="w-4 h-4 text-blue-500" />}
          </div>
          <div className="flex-1 text-sm flex justify-between">
            <span className={event.type === 'goal' ? "font-semibold text-green-600" : "text-zinc-900 dark:text-zinc-100"}>
              {event.player}
            </span>
            <span className="text-zinc-500 text-xs">{event.team}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
