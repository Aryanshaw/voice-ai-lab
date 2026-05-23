'use client';

// ── /configs — Agent configs list page ────────────────────────────────────────
// Lists all agent configs. Create/edit navigated to dedicated pages.

import { useRouter } from 'next/navigation';
import { PlusIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useConfigs, useDeleteConfig } from '@/hooks/useConfigs';
import { ConfigGrid } from './_components/ConfigGrid';

export default function ConfigsPage() {
  const router = useRouter();
  const { data: configs = [], isLoading } = useConfigs();
  const deleteConfig = useDeleteConfig();

  const handleCreateNew = () => {
    router.push('/configs/new');
  };

  const handleDelete = (id: string) => {
    deleteConfig.mutate(id);
  };

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mx-auto max-w-7xl px-4 py-6">
        {/* Page header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold">Agents</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Configure AI voice agents</p>
          </div>
          <Button
            size="sm"
            className="gap-1.5 text-xs cursor-pointer"
            onClick={handleCreateNew}
          >
            <PlusIcon className="size-3.5" /> New Agent
          </Button>
        </div>

        {/* Agent grid — handles loading, empty, and populated states */}
        <ConfigGrid
          configs={configs}
          loading={isLoading}
          onDelete={handleDelete}
        />
      </div>
    </div>
  );
}
