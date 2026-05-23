// ── Voice types for ElevenLabs integration ───────────────────────────────

export interface VoiceLabel {
  gender: string | null;
  accent: string | null;
  use_case: string | null;
  age: string | null;
  descriptive: string | null;
}

export interface Voice {
  voice_id: string;
  name: string;
  category: string;
  preview_url: string | null;
  labels: VoiceLabel;
}
