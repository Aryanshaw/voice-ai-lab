'use client';

// ── ConfigCard — single agent card in the configs list ────────────────────────
// Shows agent name, prompt preview, model badges, and action buttons.
// Edit navigates to /configs/[id]/edit (dedicated page, not a sheet).

import { useRouter } from 'next/navigation';
import { BotIcon, PencilIcon, TrashIcon, PlayIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { AgentConfig } from '@/types/config.types';

interface ConfigCardProps {
  config: AgentConfig;
  onDelete: (id: string) => void;
}

export function ConfigCard({ config, onDelete }: ConfigCardProps) {
  const router = useRouter();

  const handleEdit = () => router.push(`/configs/${config.id}/edit`);
  const handleDelete = () => onDelete(config.id);

  // model is stored as "provider/model_id" — split for badge display
  const [provider, model] = config.model.split('/');

  return (
    <div className="rounded-lg border border-border bg-card p-4 transition-colors hover:border-border/80">
      {/* Header: icon + name + prompt preview + actions */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted">
            <BotIcon className="size-4 text-muted-foreground" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-foreground">{config.name}</p>
            {/* Show description if set, else fall back to system prompt preview */}
            <p className="truncate text-xs text-muted-foreground mt-0.5">
              {config.description
                ? config.description
                : `${config.system_prompt.slice(0, 60)}${config.system_prompt.length > 60 ? '…' : ''}`}
            </p>
          </div>
        </div>
        {/* Edit and delete action buttons */}
        <div className="flex shrink-0 items-center gap-1.5">
          <Button
            variant="ghost"
            size="icon"
            className="size-7 cursor-pointer"
            onClick={handleEdit}
            title="Edit agent"
          >
            <PencilIcon className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-7 hover:text-destructive cursor-pointer"
            onClick={handleDelete}
            title="Delete agent"
          >
            <TrashIcon className="size-3.5" />
          </Button>
        </div>
      </div>

      {/* Model + temperature badges */}
      <div className="mt-3 flex items-center gap-2">
        <Badge variant="secondary" className="text-xs font-mono">
          {provider}
        </Badge>
        <Badge variant="outline" className="text-xs font-mono">
          {model}
        </Badge>
        <Badge variant="outline" className="text-xs">
          t={config.temperature}
        </Badge>
      </div>

      {/* Start session */}
      <div className="mt-3">
        <Button
          size="sm"
          className="h-7 w-full gap-1.5 text-xs cursor-pointer"
          onClick={() => router.push(`/configs/${config.id}`)}
        >
          <PlayIcon className="size-3" />
          Start Session
        </Button>
      </div>
    </div>
  );
}
