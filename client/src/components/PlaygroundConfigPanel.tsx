"use client";

import { useState, useEffect } from "react";
import { ChevronUpIcon, ChevronDownIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLLMModels } from "@/hooks/useLLMModels";
import { useUpdateConfig } from "@/hooks/useConfigs";
import type { AgentConfig } from "@/types/config.types";

interface PlaygroundConfigPanelProps {
  config: AgentConfig;
}

export function PlaygroundConfigPanel({ config }: PlaygroundConfigPanelProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [systemPrompt, setSystemPrompt] = useState(config.system_prompt);
  const [model, setModel] = useState(config.model);
  const [temperature, setTemperature] = useState(config.temperature);

  const { data: modelsMap = {} } = useLLMModels();
  const updateConfig = useUpdateConfig();

  // Sync local state when switching to a different config
  useEffect(() => {
    setSystemPrompt(config.system_prompt);
    setModel(config.model);
    setTemperature(config.temperature);
  }, [config.id]);

  const isDirty =
    systemPrompt !== config.system_prompt ||
    model !== config.model ||
    temperature !== config.temperature;

  function handleApply() {
    updateConfig.mutate({ id: config.id, data: { system_prompt: systemPrompt, model, temperature } });
  }

  return (
    <div className="shrink-0 border-b border-border">
      {/* Panel header row */}
      <div className="flex items-center justify-between px-4 py-2.5">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          Prompt &amp; Config
        </span>
        <button
          type="button"
          onClick={() => setCollapsed((v) => !v)}
          className="flex size-6 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-foreground transition-colors cursor-pointer"
          title={collapsed ? "Expand config" : "Collapse config"}
        >
          {collapsed
            ? <ChevronDownIcon className="size-3.5" />
            : <ChevronUpIcon className="size-3.5" />}
        </button>
      </div>

      {!collapsed && (
        <div className="flex flex-col gap-3 px-4 pb-4">
          {/* System prompt */}
          <Textarea
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            placeholder="System prompt..."
            rows={4}
            className="resize-none font-mono text-xs leading-relaxed max-h-[25vh] overflow-y-auto"
          />

          {/* Model + Temp + Apply — single row */}
          <div className="flex items-center gap-3">
            <Select value={model} onValueChange={setModel}>
              <SelectTrigger className="h-7 w-44 shrink-0 text-xs cursor-pointer">
                <SelectValue placeholder="Model" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(modelsMap).map(([provider, entries]) => (
                  <div key={provider}>
                    <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {provider}
                    </p>
                    {entries.map((m) => (
                      <SelectItem
                        key={m.id}
                        value={`${m.provider}/${m.model_id}`}
                        className="text-xs cursor-pointer"
                      >
                        {m.label}
                      </SelectItem>
                    ))}
                  </div>
                ))}
              </SelectContent>
            </Select>

            <div className="flex flex-1 items-center gap-2 min-w-0">
              <span className="shrink-0 text-xs text-muted-foreground">Temp</span>
              <Slider
                min={0}
                max={1}
                step={0.1}
                value={[temperature]}
                onValueChange={([v]) => setTemperature(v)}
                className="flex-1"
              />
              <Badge variant="outline" className="shrink-0 font-mono text-[10px]">
                {temperature.toFixed(1)}
              </Badge>
            </div>

            <Button
              size="sm"
              className="h-7 shrink-0 cursor-pointer text-xs"
              onClick={handleApply}
              disabled={!isDirty || updateConfig.isPending}
            >
              {updateConfig.isPending ? "Saving…" : "Apply"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
