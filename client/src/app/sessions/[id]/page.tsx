'use client';

import { use, useMemo } from 'react';
import Link from 'next/link';
import { ChevronLeftIcon } from 'lucide-react';
import { useSession } from '@/hooks/useSessions';
import { SessionPanel } from '@/components/SessionPanel';

interface Props {
  params: Promise<{ id: string }>;
}

export default function SessionDetailPage({ params }: Props) {
  const { id: sessionId } = use(params);
  const { data: session, isLoading } = useSession(sessionId);

  const breadcrumb = useMemo(() => {
    if (!session) return null;
    const date = new Date(session.started_at).toLocaleString();
    const label = `${session.id.slice(0, 8)}… — ${date}`;
    return { configId: session.config_id, label };
  }, [session]);

  return (
    <div className="flex flex-col h-full">
      <header className="flex items-center gap-3 px-4 py-2.5 border-b shrink-0">
        {breadcrumb ? (
          <Link
            href={`/configs/${breadcrumb.configId}`}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            <ChevronLeftIcon className="size-3.5" />
            <span className="hidden sm:inline">Back to Config</span>
          </Link>
        ) : (
          <div className="h-4 w-20 bg-muted rounded animate-pulse" />
        )}

        <div className="flex-1" />

        {isLoading ? (
          <div className="h-3 w-40 bg-muted rounded animate-pulse" />
        ) : (
          <span className="text-xs text-muted-foreground">
            {session?.id ? `${session.id.slice(0, 8)}…` : 'Session'}
          </span>
        )}
      </header>

      <div className="flex-1 flex flex-col overflow-hidden">
        <SessionPanel sessionId={sessionId} />
      </div>
    </div>
  );
}
