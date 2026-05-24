export interface Session {
  id: string;
  config_id: string;
  title: string | null;
  started_at: string;
  ended_at: string | null;
  status: string;
}

export interface SessionTurn {
  id: string;
  session_id: string;
  role: "user" | "assistant";
  content: string;
  stt_ms: number | null;
  llm_ms: number | null;
  tts_ms: number | null;
  created_at: string;
}
