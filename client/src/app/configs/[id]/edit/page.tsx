'use client';

// ── /configs/[id]/edit — Edit an existing agent config ───────────────────────
// Fetches config by id, pre-fills AgentConfigEditor with current values.

import { use } from 'react';
import { useRouter } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';
import { useConfig, useUpdateConfig } from '@/hooks/useConfigs';
import { AgentConfigEditor } from '../../_components/AgentConfigEditor';
import type { ConfigCreate } from '@/types/config.types';

interface EditConfigPageProps {
  params: Promise<{ id: string }>;
}

export default function EditConfigPage({ params }: EditConfigPageProps) {
  // Unwrap params (Next.js 15 async params)
  const { id } = use(params);

  const router = useRouter();
  const { data: config, isLoading } = useConfig(id);
  const updateConfig = useUpdateConfig();

  function handleSubmit(data: ConfigCreate) {
    updateConfig.mutate(
      { id, data },
      { onSuccess: () => router.push('/configs') }
    );
  }

  // Show minimal skeleton while config loads
  if (isLoading) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8 space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  if (!config) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8">
        <p className="text-sm text-muted-foreground">Agent not found.</p>
      </div>
    );
  }

  return (
    <AgentConfigEditor
      title={`Edit — ${config.name}`}
      defaultValues={{
        name: config.name,
        description: config.description ?? '',
        system_prompt: config.system_prompt,
        model: config.model,
        temperature: config.temperature,
        voice_settings: config.voice_settings,
      }}
      onSubmit={handleSubmit}
      isSubmitting={updateConfig.isPending}
    />
  );
}
