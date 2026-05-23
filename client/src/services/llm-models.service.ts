import api from '@/lib/axios';
import type { AvailableModels } from '@/types/config.types';

export class LLMModelsService {
  static async list(): Promise<AvailableModels> {
    const res = await api.get<AvailableModels>('/api/llm-models/');
    return res.data;
  }
}
