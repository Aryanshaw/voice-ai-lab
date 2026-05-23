import { create } from "zustand";

export interface VoiceSettings {
  voice_id: string;
  model_id: string;
  stability: number;
  similarity_boost: number;
}

export interface AgentConfig {
  id: string;
  name: string;
  system_prompt: string;
  model: string;
  temperature: number;
  voice_settings: VoiceSettings;
  created_at: string;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// Config store
// ---------------------------------------------------------------------------

interface ConfigStore {
  configs: AgentConfig[];
  selectedConfig: AgentConfig | null;
  isSheetOpen: boolean;
  setConfigs: (configs: AgentConfig[]) => void;
  upsertConfig: (config: AgentConfig) => void;
  removeConfig: (id: string) => void;
  setSelectedConfig: (config: AgentConfig | null) => void;
  setSheetOpen: (open: boolean) => void;
}

export const useConfigStore = create<ConfigStore>((set) => ({
  configs: [],
  selectedConfig: null,
  isSheetOpen: false,
  setConfigs: (configs) => set({ configs }),
  upsertConfig: (config) =>
    set((state) => {
      const exists = state.configs.find((c) => c.id === config.id);
      return {
        configs: exists
          ? state.configs.map((c) => (c.id === config.id ? config : c))
          : [config, ...state.configs],
      };
    }),
  removeConfig: (id) =>
    set((state) => ({ configs: state.configs.filter((c) => c.id !== id) })),
  setSelectedConfig: (config) => set({ selectedConfig: config }),
  setSheetOpen: (open) => set({ isSheetOpen: open }),
}));
