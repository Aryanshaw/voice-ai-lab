'use client';

// ── /configs/new — Create a new agent config ─────────────────────────────────
// Thin page: delegates form rendering to AgentConfigEditor,
// handles mutation and post-success navigation.

import { useRouter } from 'next/navigation';
import { useCreateConfig } from '@/hooks/useConfigs';
import { AgentConfigEditor } from '../_components/AgentConfigEditor';
import type { ConfigCreate } from '@/types/config.types';

export default function NewConfigPage() {
  const router = useRouter();
  const createConfig = useCreateConfig();

  function handleSubmit(data: ConfigCreate) {
    createConfig.mutate(data, {
      // Navigate back to agents list after successful creation
      onSuccess: () => router.push('/configs'),
    });
  }

  return (
    <AgentConfigEditor
      title="New Agent"
      onSubmit={handleSubmit}
      isSubmitting={createConfig.isPending}
    />
  );
}
