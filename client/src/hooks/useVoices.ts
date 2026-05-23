// ── useVoices — TanStack Query wrapper for ElevenLabs voice list ──────────

import { useQuery } from '@tanstack/react-query';
import { VoicesService } from '@/services/voices.service';

export const VOICES_KEY = ['voices'] as const;

export function useVoices() {
  return useQuery({
    queryKey: VOICES_KEY,
    queryFn: VoicesService.list,
    staleTime: 1000 * 60 * 60, // 1 hour — matches backend Redis TTL
  });
}
