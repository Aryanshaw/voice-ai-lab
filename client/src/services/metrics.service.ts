import api from "@/lib/axios";

export interface StageStats {
  stage: string;
  p50: number;
  p90: number;
  p99: number;
  avg: number;
  count: number;
  error_count: number;
  error_rate: number;
}

export interface MetricsSummary {
  config_id: string;
  stages: StageStats[];
}

export const MetricsService = {
  getSummary: async (config_id: string): Promise<MetricsSummary> => {
    const res = await api.get("/api/metrics/summary", { params: { config_id } });
    return res.data;
  },
};
