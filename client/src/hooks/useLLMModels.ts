import { useQuery } from '@tanstack/react-query';
import { LLMModelsService } from '@/services/llm-models.service';

export const LLM_MODELS_KEY = ['llm-models'] as const;

export function useLLMModels() {
  return useQuery({
    queryKey: LLM_MODELS_KEY,
    queryFn: LLMModelsService.list,
    staleTime: 1000 * 60 * 60, // 1 hour — models rarely change
  });
}
