export interface VoiceSettings {
  voice_id: string;
  model_id: string;
  stability: number;
  similarity_boost: number;
}

export interface AgentConfig {
  id: string;
  name: string;
  description: string | null;
  system_prompt: string;
  model: string;
  temperature: number;
  voice_settings: VoiceSettings;
  created_at: string;
  updated_at: string;
}

export interface ConfigCreate {
  name: string;
  description?: string;
  system_prompt: string;
  model: string;
  temperature: number;
  voice_settings: VoiceSettings;
}

export interface ConfigUpdate {
  name?: string;
  description?: string;
  system_prompt?: string;
  model?: string;
  temperature?: number;
  voice_settings?: VoiceSettings;
}

export interface LLMModel {
  id: string;
  provider: string;
  model_id: string;
  label: string;
  is_active: boolean;
}

export type AvailableModels = Record<string, LLMModel[]>;
