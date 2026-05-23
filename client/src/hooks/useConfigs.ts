// ── useConfigs — TanStack Query hooks for AgentConfig CRUD ───────────────────
// Hooks own query keys and cache invalidation. Pages own navigation / UI state.

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ConfigService } from '@/services/config.service';
import type { ConfigCreate, ConfigUpdate } from '@/types/config.types';

// ── Query keys ────────────────────────────────────────────────────────────────
export const CONFIGS_KEY = ['configs'] as const;
export const configKey = (id: string) => ['configs', id] as const;

// ── useConfigs — fetch all agent configs ─────────────────────────────────────
export function useConfigs() {
  return useQuery({
    queryKey: CONFIGS_KEY,
    queryFn: ConfigService.list,
  });
}

// ── useConfig — fetch single agent config by id ───────────────────────────────
export function useConfig(id: string) {
  return useQuery({
    queryKey: configKey(id),
    queryFn: () => ConfigService.get(id),
    enabled: Boolean(id),
  });
}

// ── useCreateConfig — create a new agent config ───────────────────────────────
// onSuccess navigation is handled by the calling page via mutate options.
export function useCreateConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: ConfigCreate) => ConfigService.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: CONFIGS_KEY });
      toast.success('Agent created');
    },
    onError: () => toast.error('Failed to create agent'),
  });
}

// ── useUpdateConfig — update an existing agent config ─────────────────────────
export function useUpdateConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ConfigUpdate }) =>
      ConfigService.update(id, data),
    onSuccess: (_res, { id }) => {
      qc.invalidateQueries({ queryKey: CONFIGS_KEY });
      qc.invalidateQueries({ queryKey: configKey(id) });
      toast.success('Agent updated');
    },
    onError: () => toast.error('Failed to update agent'),
  });
}

// ── useDeleteConfig — delete an agent config ──────────────────────────────────
export function useDeleteConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => ConfigService.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: CONFIGS_KEY });
      toast.success('Agent deleted');
    },
    onError: () => toast.error('Failed to delete agent'),
  });
}
