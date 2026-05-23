// ── useElevenLabsModels — TTS models from ElevenLabs via backend proxy ───────

import { useQuery } from '@tanstack/react-query';
import { VoicesService } from '@/services/voices.service';

export function useElevenLabsModels() {
  return useQuery({
    queryKey: ['el-models'],
    queryFn: VoicesService.listModels,
    staleTime: 1000 * 60 * 60 * 24, // 24h — matches backend Redis TTL
  });
}
