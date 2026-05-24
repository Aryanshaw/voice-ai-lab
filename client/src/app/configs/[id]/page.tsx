'use client';

import { use, useState, useCallback, useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { PlusIcon, ChevronDownIcon } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useConfig, useUpdateConfig } from '@/hooks/useConfigs';
import { useCreateSession, useConfigSessions, configSessionsKey } from '@/hooks/useSessions';
import { useWebsocket } from '@/hooks/useWebsocket';
import { useUIStore } from '@/store/useUIStore';
import { SessionPanel } from '@/components/SessionPanel';
import { AgentConfigEditor } from '@/app/configs/_components/AgentConfigEditor';
import { cn } from '@/utils/utils';
import type { ConfigCreate } from '@/types/config.types';

type Tab = 'chat' | 'config';

interface Props {
  params: Promise<{ id: string }>;
}

export default function ConfigDetailPage({ params }: Props) {
  const { id } = use(params);
  const { data: config, isLoading: configLoading } = useConfig(id);
  const { data: sessions } = useConfigSessions(id);
  const createSession = useCreateSession();
  const updateConfig = useUpdateConfig();
  const qc = useQueryClient();
  const { isConnected, isReconnecting } = useWebsocket();

  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [titleOverrides, setTitleOverrides] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState<Tab>('chat');

  // Auto-collapse app sidebar — 3-panel layout needs the space
  const { sidebarCollapsed, toggleSidebar } = useUIStore();
  const wasCollapsedRef = useRef(sidebarCollapsed);
  useEffect(() => {
    if (!wasCollapsedRef.current) toggleSidebar();
    return () => { if (!wasCollapsedRef.current) toggleSidebar(); };
  }, [toggleSidebar]);

  function handleNewSession() {
    createSession.mutate(id, {
      onSuccess: (session) => {
        setActiveSessionId(session.id);
        setActiveTab('chat');
      },
    });
  }

  const handleTitleUpdate = useCallback((title: string) => {
    if (!activeSessionId) return;
    setTitleOverrides((prev) => ({ ...prev, [activeSessionId]: title }));
    qc.invalidateQueries({ queryKey: configSessionsKey(id) });
  }, [activeSessionId, id, qc]);

  function handleConfigApply(data: ConfigCreate) {
    updateConfig.mutate({ id, data }, {
      onSuccess: () => setActiveTab('chat'),
    });
  }

  const activeSession = sessions?.find((s) => s.id === activeSessionId);
  const activeTitle = activeSessionId
    ? (titleOverrides[activeSessionId] ?? activeSession?.title ?? activeSessionId.slice(0, 14) + '…')
    : 'Select a session';

  const dotColor = isConnected
    ? 'bg-green-500'
    : isReconnecting
    ? 'bg-yellow-500 animate-pulse'
    : 'bg-red-500';

  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* ── Page header ─────────────────────────────────────────────────────── */}
      <div className="shrink-0 border-b border-border flex items-center gap-3 px-4 py-2.5">

        {/* Sessions dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs text-muted-foreground hover:bg-accent hover:text-foreground transition-colors cursor-pointer w-44">
              <span className="truncate flex-1">{activeTitle}</span>
              <ChevronDownIcon className="size-3 shrink-0 ml-auto" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-60">
            {(sessions ?? []).length === 0 && (
              <DropdownMenuItem disabled className="text-xs text-muted-foreground">
                No sessions yet
              </DropdownMenuItem>
            )}
            {sessions?.map((session) => {
              const title = titleOverrides[session.id] ?? session.title;
              return (
                <DropdownMenuItem
                  key={session.id}
                  onClick={() => { setActiveSessionId(session.id); setActiveTab('chat'); }}
                  className={cn('cursor-pointer text-xs gap-2', activeSessionId === session.id && 'font-medium')}
                >
                  <span className="truncate flex-1">{title ?? session.id.slice(0, 20) + '…'}</span>
                  <span className="text-[10px] text-muted-foreground shrink-0 opacity-60">
                    {new Date(session.started_at).toLocaleDateString()}
                  </span>
                </DropdownMenuItem>
              );
            })}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleNewSession}
              disabled={createSession.isPending}
              className="cursor-pointer text-xs gap-1.5"
            >
              <PlusIcon className="size-3" />
              {createSession.isPending ? 'Starting…' : 'New Session'}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="h-4 w-px bg-border shrink-0" />

        {/* Chat / Config tabs */}
        <div className="flex items-center gap-0.5 bg-muted rounded-md p-0.5">
          <button
            onClick={() => setActiveTab('chat')}
            className={cn(
              'px-2.5 py-1 text-xs rounded-sm font-medium transition-colors cursor-pointer',
              activeTab === 'chat'
                ? 'bg-background shadow-sm text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            Chat
          </button>
          <button
            onClick={() => setActiveTab('config')}
            className={cn(
              'px-2.5 py-1 text-xs rounded-sm font-medium transition-colors cursor-pointer',
              activeTab === 'config'
                ? 'bg-background shadow-sm text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            Config
          </button>
        </div>

        <div className="flex-1" />

        {/* Agent name + WS status */}
        <div className="flex items-center gap-2 shrink-0">
          <span className={cn('size-2 rounded-full shrink-0', dotColor)} />
          {configLoading ? (
            <Skeleton className="h-4 w-32" />
          ) : (
            <span className="text-xs text-muted-foreground font-medium">{config?.name}</span>
          )}
        </div>
      </div>

      {/* ── Content ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col flex-1 min-h-0 overflow-hidden">

        {/* Config editor — mounted only when config tab active */}
        {activeTab === 'config' && config && (
          <AgentConfigEditor
            title="Edit Config"
            defaultValues={config as any}
            onSubmit={handleConfigApply}
            isSubmitting={updateConfig.isPending}
            onCancel={() => setActiveTab('chat')}
          />
        )}

        {/* Session panel — always mounted when session exists, hidden during config tab.
            Keeping it mounted preserves messages state + WS subscriptions. */}
        {activeSessionId && (
          <div className={cn(
            'flex flex-col flex-1 min-h-0 overflow-hidden',
            activeTab === 'config' && 'hidden'
          )}>
            <SessionPanel sessionId={activeSessionId} onTitleUpdate={handleTitleUpdate} />
          </div>
        )}

        {/* Empty state — no session selected and not in config tab */}
        {!activeSessionId && activeTab !== 'config' && (
          <div className="flex h-full flex-col items-center justify-center gap-4 text-center px-8">
            {configLoading ? (
              <Skeleton className="h-6 w-48" />
            ) : (
              <>
                <p className="text-base font-semibold">{config?.name}</p>
                {config?.description && (
                  <p className="text-xs text-muted-foreground max-w-xs">{config.description}</p>
                )}
                <Button
                  size="sm"
                  onClick={handleNewSession}
                  disabled={createSession.isPending}
                  className="cursor-pointer"
                >
                  {createSession.isPending ? 'Starting…' : 'Start Session'}
                </Button>
              </>
            )}
          </div>
        )}

      </div>

    </div>
  );
}
