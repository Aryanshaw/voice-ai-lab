'use client';

// ── AgentConfigEditor — viewport-locked two-column create/edit form ───────────
// The form fills exactly 100vh (no outer scroll). Each section manages its own
// overflow. Right column layout (top→bottom):
//   1. LLM settings (shrink-0) — model + temperature in one row
//   2. Voice picker (flex-1, overflow-y-auto) — takes majority of space
//   3. Voice settings (shrink-0) — EL model + stability + similarity

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeftIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useLLMModels } from '@/hooks/useLLMModels';
import { useElevenLabsModels } from '@/hooks/useElevenLabsModels';
import { VoicePicker } from './VoicePicker';
import ReactMarkdown from 'react-markdown';
import { cn } from '@/utils/utils';
import type { ConfigCreate } from '@/types/config.types';

// ── Defaults ──────────────────────────────────────────────────────────────────
const DEFAULT_FORM: ConfigCreate = {
  name: '',
  description: '',
  system_prompt: '',
  model: 'groq/llama3-8b-8192',
  temperature: 0.7,
  voice_settings: {
    voice_id: '21m00Tcm4TlvDq8ikWAM',
    model_id: 'eleven_turbo_v2',
    stability: 0.5,
    similarity_boost: 0.75,
  },
};


interface AgentConfigEditorProps {
  defaultValues?: Partial<ConfigCreate>;
  title: string;
  onSubmit: (data: ConfigCreate) => void;
  isSubmitting: boolean;
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
      {children}
    </p>
  );
}

// ── AgentConfigEditor ─────────────────────────────────────────────────────────
export function AgentConfigEditor({
  defaultValues,
  title,
  onSubmit,
  isSubmitting,
}: AgentConfigEditorProps) {
  const router = useRouter();
  const { data: modelsMap = {} } = useLLMModels();
  const { data: elModels = [] } = useElevenLabsModels();
  const [viewMode, setViewMode] = useState<'edit' | 'preview'>('edit');

  const [form, setForm] = useState<ConfigCreate>({
    ...DEFAULT_FORM,
    ...defaultValues,
    voice_settings: {
      ...DEFAULT_FORM.voice_settings,
      ...defaultValues?.voice_settings,
    },
  });

  function patch(partial: Partial<ConfigCreate>) {
    setForm((prev) => ({ ...prev, ...partial }));
  }

  function patchVoice(partial: Partial<ConfigCreate['voice_settings']>) {
    setForm((prev) => ({
      ...prev,
      voice_settings: { ...prev.voice_settings, ...partial },
    }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit(form);
  }

  return (
    // flex-1: fills main container. overflow-hidden: no outer page scroll.
    <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-hidden">

      {/* Header */}
      <div className="flex shrink-0 items-center gap-3 border-b border-border px-6 py-3">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-7 cursor-pointer"
          onClick={() => router.push('/configs')}
        >
          <ArrowLeftIcon className="size-4" />
        </Button>
        <div>
          <h1 className="text-sm font-semibold leading-none">{title}</h1>
          <p className="mt-0.5 text-xs text-muted-foreground">Configure your voice agent</p>
        </div>
      </div>

      {/* ── Body — two columns, fills remaining height ───────────────────── */}
      {/* min-h-0 critical: allows flex children to shrink below content size */}
      <div className="grid min-h-0 flex-1 grid-cols-2 divide-x divide-border overflow-hidden">

        {/* ── LEFT: Identity fields ────────────────────────────────────── */}
        <div className="flex flex-col gap-4 overflow-y-auto p-6">
          <SectionLabel>Identity</SectionLabel>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name" className="text-sm">Agent Name</Label>
            <Input
              id="name"
              placeholder="e.g. Customer Support Bot"
              value={form.name}
              onChange={(e) => patch({ name: e.target.value })}
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="description" className="text-sm">
              Purpose
              <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                — what does this agent do?
              </span>
            </Label>
            <Input
              id="description"
              placeholder="e.g. Handles first-line customer support queries"
              value={form.description ?? ''}
              onChange={(e) => patch({ description: e.target.value })}
            />
          </div>

          {/* System prompt — grows to fill remaining left column height */}
          <div className="flex min-h-0 flex-1 flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="system_prompt" className="text-sm">System Prompt</Label>
              <div className="flex bg-muted p-0.5 rounded-md">
                <button
                  type="button"
                  onClick={() => setViewMode('edit')}
                  className={cn("px-2 py-1 text-[10px] rounded-sm font-medium transition-colors cursor-pointer", viewMode === 'edit' ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")}
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('preview')}
                  className={cn("px-2 py-1 text-[10px] rounded-sm font-medium transition-colors cursor-pointer", viewMode === 'preview' ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")}
                >
                  Preview
                </button>
              </div>
            </div>
            
            {viewMode === 'edit' ? (
              <Textarea
                id="system_prompt"
                placeholder={"You are a helpful support agent.\n\nRespond concisely and professionally."}
                // h-full fills the flex parent so textarea grows with the column
                className="h-full min-h-[200px] resize-none font-mono text-xs leading-relaxed"
                value={form.system_prompt}
                onChange={(e) => patch({ system_prompt: e.target.value })}
                required
              />
            ) : (
              <div className="h-full min-h-[200px] overflow-y-auto rounded-md border border-border bg-muted/30 p-3 text-xs">
                <ReactMarkdown
                  components={{
                    h1: ({node, ...props}) => <h1 className="text-lg font-bold mt-4 mb-2" {...props} />,
                    h2: ({node, ...props}) => <h2 className="text-md font-bold mt-4 mb-2" {...props} />,
                    h3: ({node, ...props}) => <h3 className="text-sm font-bold mt-3 mb-2" {...props} />,
                    p: ({node, ...props}) => <p className="mb-2 leading-relaxed" {...props} />,
                    ul: ({node, ...props}) => <ul className="list-disc pl-4 mb-2 space-y-1" {...props} />,
                    ol: ({node, ...props}) => <ol className="list-decimal pl-4 mb-2 space-y-1" {...props} />,
                    li: ({node, ...props}) => <li className="" {...props} />,
                    strong: ({node, ...props}) => <strong className="font-semibold" {...props} />,
                    em: ({node, ...props}) => <em className="italic" {...props} />,
                    pre: ({node, ...props}) => <pre className="bg-background border p-2 rounded-md overflow-x-auto mb-2" {...props} />,
                    code: ({node, className, ...props}) => <code className={cn("font-mono text-[10px]", !className?.includes('language-') && "bg-background border px-1 py-0.5 rounded-sm", className)} {...props} />,
                    blockquote: ({node, ...props}) => <blockquote className="border-l-2 border-primary pl-3 italic text-muted-foreground mb-2" {...props} />
                  }}
                >
                  {form.system_prompt || '*No prompt provided*'}
                </ReactMarkdown>
              </div>
            )}
            
            <p className="text-xs text-muted-foreground">
              {viewMode === 'edit' ? 'Injected as system message. Markdown supported.' : 'Preview of the system message rendering.'}
            </p>
          </div>
        </div>

        {/* ── RIGHT: LLM + Voice picker + Voice settings ──────────────── */}
        {/* Three stacked sections using flex column. Voice picker is flex-1. */}
        <div className="flex min-h-0 flex-col overflow-hidden">

          {/* 1. LLM settings — compact, horizontal layout, shrink-0 */}
          <div className="shrink-0 border-b border-border px-6 py-4 flex flex-col gap-3">
            <SectionLabel>Language Model</SectionLabel>
            {/* Model select + Temperature slider on one row */}
            <div className="flex items-center gap-4">
              {/* Model select — fixed width */}
              <div className="w-44 shrink-0">
                <Select value={form.model} onValueChange={(v) => patch({ model: v })}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Select model" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(modelsMap).map(([provider, entries]) => (
                      <div key={provider}>
                        <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                          {provider}
                        </p>
                        {entries.map((m) => (
                          <SelectItem key={m.id} value={`${m.provider}/${m.model_id}`} className="text-xs">
                            {m.label}
                          </SelectItem>
                        ))}
                      </div>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Temperature — takes remaining width */}
              <div className="flex flex-1 flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Temperature</span>
                  <Badge variant="outline" className="font-mono text-[10px]">
                    {form.temperature.toFixed(1)}
                  </Badge>
                </div>
                <Slider
                  min={0}
                  max={1}
                  step={0.1}
                  value={[form.temperature]}
                  onValueChange={([v]) => patch({ temperature: v })}
                />
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>Precise</span>
                  <span>Creative</span>
                </div>
              </div>
            </div>
          </div>

          {/* 2. Voice picker — flex-1 so it takes all remaining space, internally scrolls */}
          <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden px-6 py-4">
            <SectionLabel>Voice (ElevenLabs)</SectionLabel>
            {/* This div owns the scroll — voices never push the layout */}
            <div className="flex-1 overflow-y-auto">
              <VoicePicker
                value={form.voice_settings.voice_id}
                onChange={(voiceId) => patchVoice({ voice_id: voiceId })}
              />
            </div>
          </div>

          {/* 3. Voice settings — shrink-0, always visible at bottom */}
          <div className="shrink-0 border-t border-border px-6 py-4 flex flex-col gap-3">
            <SectionLabel>Voice Settings</SectionLabel>

            {/* EL synthesis model */}
            <div className="flex items-center gap-3">
              <span className="shrink-0 text-xs text-muted-foreground">Model</span>
              <Select
                value={form.voice_settings.model_id}
                onValueChange={(v) => patchVoice({ model_id: v })}
              >
                <SelectTrigger className="h-7 flex-1 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {elModels.map((m) => (
                    <SelectItem key={m.id} value={m.id} className="text-xs">
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Stability + Similarity side by side */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Stability</span>
                  <span className="font-mono text-[10px] text-muted-foreground">
                    {form.voice_settings.stability.toFixed(2)}
                  </span>
                </div>
                <Slider
                  min={0} max={1} step={0.05}
                  value={[form.voice_settings.stability]}
                  onValueChange={([v]) => patchVoice({ stability: v })}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Similarity</span>
                  <span className="font-mono text-[10px] text-muted-foreground">
                    {form.voice_settings.similarity_boost.toFixed(2)}
                  </span>
                </div>
                <Slider
                  min={0} max={1} step={0.05}
                  value={[form.voice_settings.similarity_boost]}
                  onValueChange={([v]) => patchVoice({ similarity_boost: v })}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex shrink-0 items-center justify-end gap-3 border-t border-border px-6 py-3">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="cursor-pointer"
          onClick={() => router.push('/configs')}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button type="submit" size="sm" className="cursor-pointer" disabled={isSubmitting}>
          {isSubmitting ? 'Saving…' : 'Save Agent'}
        </Button>
      </div>
    </form>
  );
}
