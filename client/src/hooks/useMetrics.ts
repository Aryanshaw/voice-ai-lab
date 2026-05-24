import { useQuery } from "@tanstack/react-query";
import { MetricsService } from "@/services/metrics.service";

export const metricsSummaryKey = (config_id: string) =>
  ["metrics", "summary", config_id] as const;

export function useMetricsSummary(config_id: string | null) {
  return useQuery({
    queryKey: metricsSummaryKey(config_id ?? ""),
    queryFn: () => MetricsService.getSummary(config_id!),
    enabled: Boolean(config_id),
  });
}
