// ── VoicesService — fetches ElevenLabs voices and models via backend proxy ─

import api from '@/lib/axios';
import type { ELModel, Voice } from '@/types/voice.types';

export class VoicesService {
  static async list(): Promise<Voice[]> {
    const res = await api.get<Voice[]>('/api/voices/');
    return res.data;
  }

  static async listModels(): Promise<ELModel[]> {
    const res = await api.get<ELModel[]>('/api/voices/models/');
    return res.data;
  }
}
