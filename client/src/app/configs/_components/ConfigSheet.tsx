'use client';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '@/components/ui/sheet';
import { ConfigForm, type FormState } from './ConfigForm';
import { useUIStore } from '@/store/useUIStore';
import { useConfigs, useCreateConfig, useUpdateConfig } from '@/hooks/useConfigs';
import { useLLMModels } from '@/hooks/useLLMModels';

const DEFAULT_FORM: FormState = {
  name: '',
  system_prompt: '',
  model: 'groq/llama3-8b-8192',
  temperature: 0.7,
  voice_id: '21m00Tcm4TlvDq8ikWAM',
  voice_model_id: 'eleven_turbo_v2',
  stability: 0.5,
  similarity_boost: 0.75,
};

export function ConfigSheet() {
  const { configSheetOpen, editingConfigId, setConfigSheet } = useUIStore();
  const { data: configs = [] } = useConfigs();
  const { data: models = {} } = useLLMModels();
  const createConfig = useCreateConfig();
  const updateConfig = useUpdateConfig();

  const [form, setForm] = useState<FormState>(DEFAULT_FORM);

  const editingConfig = editingConfigId
    ? configs.find((c) => c.id === editingConfigId)
    : null;

  useEffect(() => {
    if (configSheetOpen) {
      if (editingConfig) {
        setForm({
          name: editingConfig.name,
          system_prompt: editingConfig.system_prompt,
          model: editingConfig.model,
          temperature: editingConfig.temperature,
          voice_id: editingConfig.voice_settings.voice_id,
          voice_model_id: editingConfig.voice_settings.model_id,
          stability: editingConfig.voice_settings.stability,
          similarity_boost: editingConfig.voice_settings.similarity_boost,
        });
      } else {
        setForm(DEFAULT_FORM);
      }
    }
  }, [configSheetOpen, editingConfig]);

  const handleSave = () => {
    if (!form.name.trim() || !form.system_prompt.trim()) {
      toast.error('Name and system prompt are required');
      return;
    }

    const payload = {
      name: form.name.trim(),
      system_prompt: form.system_prompt.trim(),
      model: form.model,
      temperature: form.temperature,
      voice_settings: {
        voice_id: form.voice_id,
        model_id: form.voice_model_id,
        stability: form.stability,
        similarity_boost: form.similarity_boost,
      },
    };

    if (editingConfigId) {
      updateConfig.mutate({ id: editingConfigId, data: payload });
    } else {
      createConfig.mutate(payload);
    }
  };

  const isSaving = createConfig.isPending || updateConfig.isPending;

  return (
    <Sheet open={configSheetOpen} onOpenChange={(open) => setConfigSheet(open)}>
      <SheetContent side="right" className="w-[420px] sm:max-w-[420px] flex flex-col gap-0 p-0">
        <SheetHeader className="px-4 pt-4 pb-3 border-b border-border">
          <SheetTitle className="text-sm">
            {editingConfigId ? 'Edit Agent' : 'New Agent'}
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto py-4">
          <ConfigForm form={form} onChange={setForm} models={models} />
        </div>

        <SheetFooter className="border-t border-border px-4 py-3 flex flex-row gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 text-xs"
            onClick={() => setConfigSheet(false)}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            className="flex-1 text-xs"
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? 'Saving…' : editingConfigId ? 'Update' : 'Create'}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
