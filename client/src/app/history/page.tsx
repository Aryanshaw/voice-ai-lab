"use client";

import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Clock, MessageSquare } from "lucide-react";
import { useAllSessions } from "@/hooks/useSessions";
import { useConfigs } from "@/hooks/useConfigs";

export default function HistoryPage() {
  const { data: sessions, isLoading } = useAllSessions();
  const { data: configs } = useConfigs();

  const configMap = Object.fromEntries((configs ?? []).map((c) => [c.id, c.name]));
  const activeCount = sessions?.filter((s) => s.status === "active").length ?? 0;

  return (
    <div className="flex-1 overflow-y-auto px-6 py-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-baseline gap-3">
            <h1 className="text-base font-semibold">Session History</h1>
            {sessions?.length ? (
              <span className="text-xs text-muted-foreground">
                {sessions.length} sessions
                {activeCount > 0 && (
                  <span className="ml-1.5 text-emerald-500">&bull; {activeCount} active</span>
                )}
              </span>
            ) : null}
          </div>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="space-y-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="h-14 rounded-xl bg-muted/40 animate-pulse"
                style={{ opacity: 1 - i * 0.15 }}
              />
            ))}
          </div>
        ) : !sessions?.length ? (
          <div className="flex flex-col items-center justify-center py-32 text-center">
            <div className="size-12 rounded-2xl bg-muted/50 flex items-center justify-center mb-3">
              <MessageSquare className="size-5 text-muted-foreground/30" />
            </div>
            <p className="text-sm font-medium">No sessions yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Start a session from a config page
            </p>
          </div>
        ) : (
          <div className="border border-border rounded-xl overflow-hidden">
            {/* Column headers */}
            <div className="grid grid-cols-[1fr_180px_150px_90px] gap-4 px-4 py-2.5 bg-muted/30 border-b border-border">
              <span className="text-[10px] font-medium text-muted-foreground/60 uppercase tracking-wider">Session</span>
              <span className="text-[10px] font-medium text-muted-foreground/60 uppercase tracking-wider">Config</span>
              <span className="text-[10px] font-medium text-muted-foreground/60 uppercase tracking-wider">Started</span>
              <span className="text-[10px] font-medium text-muted-foreground/60 uppercase tracking-wider">Status</span>
            </div>

            <div className="divide-y divide-border/50">
              {sessions.map((session) => (
                <Link
                  key={session.id}
                  href={`/sessions/${session.id}`}
                  className="grid grid-cols-[1fr_180px_150px_90px] gap-4 px-4 py-3.5 hover:bg-muted/20 transition-colors cursor-pointer items-center"
                >
                  <p className="text-sm font-medium truncate">
                    {session.title ?? `Session ${session.id.slice(0, 8)}…`}
                  </p>

                  <p className="text-sm text-muted-foreground truncate">
                    {configMap[session.config_id] ?? session.config_id.slice(0, 12) + "…"}
                  </p>

                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Clock className="size-3 shrink-0" />
                    {formatDistanceToNow(new Date(session.started_at), { addSuffix: true })}
                  </div>

                  {session.status === "active" ? (
                    <div className="flex items-center gap-1.5">
                      <span className="relative flex size-1.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex rounded-full size-1.5 bg-emerald-500" />
                      </span>
                      <span className="text-xs font-medium text-emerald-500">active</span>
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground/50">{session.status}</span>
                  )}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
