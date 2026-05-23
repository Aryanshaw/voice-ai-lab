'use client';

// ── ConfigGrid — renders the list of agent config cards ───────────────────────
// Handles loading (skeleton), empty state, and populated grid.
// Edit navigation is handled inside ConfigCard via router.push.

import { useRouter } from 'next/navigation';
import { BotIcon, PlusIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ConfigCard } from './ConfigCard';
import type { AgentConfig } from '@/types/config.types';

interface ConfigGridProps {
  configs: AgentConfig[];
  loading: boolean;
  onDelete: (id: string) => void;
}

export function ConfigGrid({ configs, loading, onDelete }: ConfigGridProps) {
  const router = useRouter();

  const handleCreateNew = () => {
    router.push('/configs/new');
  };

  // ── Loading state: three placeholder cards ────────────────────────────────
  if (loading) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-lg border border-border p-4">
            <div className="flex items-center gap-2.5">
              <Skeleton className="size-8 rounded-md" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3.5 w-32" />
                <Skeleton className="h-3 w-48" />
              </div>
            </div>
            <div className="mt-3 flex gap-2">
              <Skeleton className="h-5 w-12 rounded-full" />
              <Skeleton className="h-5 w-24 rounded-full" />
            </div>
            <Skeleton className="mt-3 h-7 w-full rounded-md" />
          </div>
        ))}
      </div>
    );
  }

  // ── Empty state ──────────────────────────────────────────────────────────
  if (configs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-muted">
          <BotIcon className="size-6 text-muted-foreground" />
        </div>
        <p className="mt-3 text-sm font-medium">No agents yet</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Create your first agent to get started
        </p>
        <Button
          size="sm"
          className="mt-4 gap-1.5 text-xs cursor-pointer"
          onClick={handleCreateNew}
        >
          <PlusIcon className="size-3.5" />
          New Agent
        </Button>
      </div>
    );
  }

  // ── Populated grid ────────────────────────────────────────────────────────
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {configs.map((config) => (
        <ConfigCard key={config.id} config={config} onDelete={onDelete} />
      ))}
    </div>
  );
}
