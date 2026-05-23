import api from '@/lib/axios';
import type { AgentConfig, ConfigCreate, ConfigUpdate } from '@/types/config.types';

export class ConfigService {
  static async list(): Promise<AgentConfig[]> {
    const res = await api.get<AgentConfig[]>('/api/configs/');
    return res.data;
  }

  static async get(id: string): Promise<AgentConfig> {
    const res = await api.get<AgentConfig>(`/api/configs/${id}`);
    return res.data;
  }

  static async create(data: ConfigCreate): Promise<AgentConfig> {
    const res = await api.post<AgentConfig>('/api/configs/', data);
    return res.data;
  }

  static async update(id: string, data: ConfigUpdate): Promise<AgentConfig> {
    const res = await api.put<AgentConfig>(`/api/configs/${id}`, data);
    return res.data;
  }

  static async delete(id: string): Promise<void> {
    await api.delete(`/api/configs/${id}`);
  }
}
