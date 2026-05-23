'use client';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { AvailableModels } from '@/types/config.types';

export interface FormState {
  name: string;
  system_prompt: string;
  model: string;
  temperature: number;
  voice_id: string;
  voice_model_id: string;
  stability: number;
  similarity_boost: number;
}

interface ConfigFormProps {
  form: FormState;
  onChange: (f: FormState) => void;
  models: AvailableModels;
}

export function ConfigForm({ form, onChange, models }: ConfigFormProps) {
  return (
    <div className="flex flex-col gap-5 overflow-y-auto px-4 py-2">
      {/* Name */}
      <div className="flex flex-col gap-1.5">
        <Label className="text-xs">Name</Label>
        <Input
          placeholder="e.g. Customer Support Bot"
          value={form.name}
          onChange={(e) => onChange({ ...form, name: e.target.value })}
        />
      </div>

      {/* System Prompt */}
      <div className="flex flex-col gap-1.5">
        <Label className="text-xs">System Prompt</Label>
        <Textarea
          placeholder="You are a helpful support agent…"
          className="min-h-32 resize-none"
          value={form.system_prompt}
          onChange={(e) => onChange({ ...form, system_prompt: e.target.value })}
        />
      </div>

      <Separator />

      {/* Model */}
      <div className="flex flex-col gap-1.5">
        <Label className="text-xs">Model</Label>
        <Select value={form.model} onValueChange={(v) => onChange({ ...form, model: v })}>
          <SelectTrigger className="text-xs">
            <SelectValue placeholder="Select model" />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(models).map(([provider, entries]) => (
              <div key={provider}>
                <p className="px-2 py-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {provider}
                </p>
                {entries.map((m) => (
                  <SelectItem key={m.id} value={m.id} className="text-xs">
                    {m.label}
                  </SelectItem>
                ))}
              </div>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Temperature */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs">Temperature</Label>
          <Badge variant="outline" className="text-xs font-mono">
            {form.temperature.toFixed(1)}
          </Badge>
        </div>
        <Slider
          min={0}
          max={1}
          step={0.1}
          value={[form.temperature]}
          onValueChange={([v]) => onChange({ ...form, temperature: v })}
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Precise</span>
          <span>Creative</span>
        </div>
      </div>

      <Separator />
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Voice Settings (ElevenLabs)
      </p>

      {/* Voice ID */}
      <div className="flex flex-col gap-1.5">
        <Label className="text-xs">Voice ID</Label>
        <Input
          placeholder="21m00Tcm4TlvDq8ikWAM"
          value={form.voice_id}
          onChange={(e) => onChange({ ...form, voice_id: e.target.value })}
          className="font-mono text-xs"
        />
        <p className="text-xs text-muted-foreground">
          Find voice IDs at elevenlabs.io/voice-library
        </p>
      </div>

      {/* ElevenLabs Model */}
      <div className="flex flex-col gap-1.5">
        <Label className="text-xs">ElevenLabs Model</Label>
        <Select
          value={form.voice_model_id}
          onValueChange={(v) => onChange({ ...form, voice_model_id: v })}
        >
          <SelectTrigger className="text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="eleven_turbo_v2" className="text-xs">
              Turbo v2 (fastest)
            </SelectItem>
            <SelectItem value="eleven_turbo_v2_5" className="text-xs">
              Turbo v2.5
            </SelectItem>
            <SelectItem value="eleven_multilingual_v2" className="text-xs">
              Multilingual v2
            </SelectItem>
            <SelectItem value="eleven_monolingual_v1" className="text-xs">
              Monolingual v1
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Stability */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs">Stability</Label>
          <Badge variant="outline" className="text-xs font-mono">
            {form.stability.toFixed(2)}
          </Badge>
        </div>
        <Slider
          min={0}
          max={1}
          step={0.05}
          value={[form.stability]}
          onValueChange={([v]) => onChange({ ...form, stability: v })}
        />
      </div>

      {/* Similarity Boost */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs">Similarity Boost</Label>
          <Badge variant="outline" className="text-xs font-mono">
            {form.similarity_boost.toFixed(2)}
          </Badge>
        </div>
        <Slider
          min={0}
          max={1}
          step={0.05}
          value={[form.similarity_boost]}
          onValueChange={([v]) => onChange({ ...form, similarity_boost: v })}
        />
      </div>
    </div>
  );
}
