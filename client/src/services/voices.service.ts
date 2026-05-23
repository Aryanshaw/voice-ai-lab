// ── VoicesService — fetches ElevenLabs voices via backend proxy ───────────

import api from '@/lib/axios';
import type { Voice } from '@/types/voice.types';

export class VoicesService {
  static async list(): Promise<Voice[]> {
    const res = await api.get<Voice[]>('/api/voices/');
    return res.data;
  }
}
