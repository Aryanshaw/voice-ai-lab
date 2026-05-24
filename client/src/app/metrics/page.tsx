"use client";

import { useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useConfigs } from "@/hooks/useConfigs";
import { useMetricsSummary } from "@/hooks/useMetrics";
import { ChevronDown } from "lucide-react";
import type { StageStats } from "@/services/metrics.service";

const STAGE_LABELS: Record<string, string> = {
  stt: "STT",
  llm: "LLM",
  tts: "TTS",
};

const STAGE_META: Record<string, { label: string; dot: string }> = {
  stt: { label: "Speech-to-Text", dot: "bg-sky-500" },
  llm: { label: "Language Model", dot: "bg-violet-500" },
  tts: { label: "Text-to-Speech", dot: "bg-amber-500" },
};

const P_COLORS = {
  p50: "#6366f1",
  p90: "#f59e0b",
  p99: "#ef4444",
};

function StageCard({ stage }: { stage: StageStats }) {
  const meta = STAGE_META[stage.stage];
  const max = Math.max(stage.p50, stage.p90, stage.p99);

  return (
    <div className="border border-border rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {meta && <span className={`size-2 rounded-full ${meta.dot}`} />}
          <span className="text-xs font-semibold">
            {meta?.label ?? (STAGE_LABELS[stage.stage] ?? stage.stage)}
          </span>
        </div>
        <span className="text-xs text-muted-foreground">{stage.count} samples</span>
      </div>

      <div className="space-y-2">
        {(["p50", "p90", "p99"] as const).map((key) => (
          <div key={key} className="flex items-center gap-3">
            <span className="text-[10px] font-mono text-muted-foreground/60 w-6">{key}</span>
            <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{
                  width: max > 0 ? `${(stage[key] / max) * 100}%` : "0%",
                  backgroundColor: P_COLORS[key],
                  transition: "width 0.6s ease",
                }}
              />
            </div>
            <span className="text-xs font-mono w-14 text-right">{stage[key]}ms</span>
          </div>
        ))}
      </div>

      <div className="mt-3 pt-2.5 border-t border-border/40 flex justify-between items-center">
        <span className="text-[10px] text-muted-foreground/50">avg</span>
        <span className="text-sm font-mono font-semibold">{stage.avg}ms</span>
        {stage.error_count > 0 && (
          <span className="text-[10px] font-mono text-red-500 bg-red-500/10 px-1.5 py-0.5 rounded">
            {stage.error_count} err · {(stage.error_rate * 100).toFixed(1)}%
          </span>
        )}
      </div>
    </div>
  );
}

export default function MetricsPage() {
  const { data: configs, isLoading: configsLoading } = useConfigs();
  const [selectedConfigId, setSelectedConfigId] = useState<string>("");

  const activeConfigId = selectedConfigId || configs?.[0]?.id || "";
  const { data: summary, isLoading: metricsLoading } = useMetricsSummary(activeConfigId || null);

  const chartData = (summary?.stages ?? []).map((s) => ({
    stage: STAGE_LABELS[s.stage] ?? s.stage,
    p50: s.p50,
    p90: s.p90,
    p99: s.p99,
  }));

  const totalSamples = (summary?.stages ?? []).reduce((sum, s) => sum + s.count, 0);
  const totalErrors = (summary?.stages ?? []).reduce((sum, s) => sum + s.error_count, 0);
  const llmStage = summary?.stages.find((s) => s.stage === "llm");

  return (
    <div className="flex-1 overflow-y-auto px-6 py-8">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-base font-semibold">Metrics</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Latency percentiles per pipeline stage
            </p>
          </div>

          <div className="relative">
            <select
              value={activeConfigId}
              onChange={(e) => setSelectedConfigId(e.target.value)}
              disabled={configsLoading}
              className="appearance-none text-sm rounded-lg border border-input bg-background px-3 py-1.5 pr-8 focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer disabled:opacity-50"
            >
              {configsLoading ? (
                <option>Loading…</option>
              ) : (
                configs?.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))
              )}
            </select>
            <ChevronDown className="size-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          </div>
        </div>

        {/* Stat row */}
        {summary && (
          <div className="flex items-center gap-6 px-4 py-4 border border-border rounded-xl bg-muted/20">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground/60 mb-0.5">Samples</p>
              <p className="text-xl font-mono font-semibold">{totalSamples}</p>
            </div>
            <div className="h-7 w-px bg-border" />
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground/60 mb-0.5">Stages</p>
              <p className="text-xl font-mono font-semibold">{summary.stages.length}</p>
            </div>
            <div className="h-7 w-px bg-border" />
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground/60 mb-0.5">Avg LLM</p>
              <p className="text-xl font-mono font-semibold">
                {llmStage ? `${llmStage.avg}ms` : "—"}
              </p>
            </div>
            {llmStage && (
              <>
                <div className="h-7 w-px bg-border" />
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground/60 mb-0.5">LLM p99</p>
                  <p className="text-xl font-mono font-semibold text-red-500">{llmStage.p99}ms</p>
                </div>
              </>
            )}
            <div className="h-7 w-px bg-border" />
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground/60 mb-0.5">Errors</p>
              <p className={`text-xl font-mono font-semibold ${totalErrors > 0 ? "text-red-500" : "text-muted-foreground"}`}>
                {totalErrors}
              </p>
            </div>
          </div>
        )}

        {/* Chart */}
        {metricsLoading ? (
          <div className="h-64 rounded-xl bg-muted/40 animate-pulse" />
        ) : chartData.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-44 rounded-xl border border-dashed border-border/50">
            <p className="text-sm text-muted-foreground">No metrics for this config</p>
            <p className="text-xs text-muted-foreground/50 mt-1">Run sessions to collect latency data</p>
          </div>
        ) : (
          <div className="border border-border rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs font-medium text-muted-foreground">Latency percentiles (ms)</p>
              <div className="flex items-center gap-3">
                {(Object.entries(P_COLORS) as [string, string][]).map(([key, color]) => (
                  <div key={key} className="flex items-center gap-1.5">
                    <div className="size-2 rounded-sm" style={{ backgroundColor: color }} />
                    <span className="text-[10px] font-mono text-muted-foreground">{key}</span>
                  </div>
                ))}
              </div>
            </div>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={chartData} barCategoryGap="35%" barGap={2}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis
                  dataKey="stage"
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)", fontFamily: "monospace" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                  axisLine={false}
                  tickLine={false}
                  unit="ms"
                  width={52}
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: "8px",
                    fontSize: "11px",
                    fontFamily: "monospace",
                  }}
                  formatter={(value: any) => [`${value}ms`]}
                  cursor={{ fill: "var(--muted)", opacity: 0.5 }}
                />
                <Bar dataKey="p50" fill={P_COLORS.p50} radius={[3, 3, 0, 0]} />
                <Bar dataKey="p90" fill={P_COLORS.p90} radius={[3, 3, 0, 0]} />
                <Bar dataKey="p99" fill={P_COLORS.p99} radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Stage breakdown */}
        {(summary?.stages.length ?? 0) > 0 && (
          <div className="space-y-3">
            <p className="text-[10px] font-medium text-muted-foreground/60 uppercase tracking-wider">
              Stage Breakdown
            </p>
            <div className="grid gap-3">
              {summary!.stages.map((s) => (
                <StageCard key={s.stage} stage={s} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
