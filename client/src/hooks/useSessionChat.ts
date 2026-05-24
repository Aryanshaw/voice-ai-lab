import { useCallback, useEffect, useRef, useState } from "react";
import { useWebsocket } from "@/hooks/useWebsocket";
import { useSessionTurns } from "@/hooks/useSessions";
import { useVoicePipeline } from "@/hooks/useVoicePipeline";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  stt_ms?: number | null;
  llm_ms?: number | null;
  tts_ms?: number | null;
  isTranscript?: boolean; // pending voice message, not yet confirmed
}

export function useSessionChat(sessionId: string, onTitleUpdate?: (title: string) => void) {
  const { sendMessage, subscribe, isConnected, isReconnecting } = useWebsocket();
  const { data: turns, isLoading: turnsLoading } = useSessionTurns(sessionId);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [mode, setMode] = useState<"text" | "voice">("text");

  const streamingIdRef = useRef<string | null>(null);
  const streamingContentRef = useRef<string>("");
  const loadedTurnsRef = useRef<string | null>(null);
  const transcriptMsgIdRef = useRef<string | null>(null); // tracks the pending transcript bubble

  // Reset state when session changes
  useEffect(() => {
    setMessages([]);
    setInput("");
    setIsStreaming(false);
    streamingIdRef.current = null;
    streamingContentRef.current = "";
    loadedTurnsRef.current = null;
  }, [sessionId]);

  // Load past turns when switching to an existing session
  useEffect(() => {
    if (turns && loadedTurnsRef.current !== sessionId) {
      loadedTurnsRef.current = sessionId;
      setMessages(
        turns.map((t) => ({
          id: t.id,
          role: t.role,
          content: t.content,
          stt_ms: t.stt_ms,
          llm_ms: t.llm_ms,
          tts_ms: t.tts_ms,
        }))
      );
    }
  }, [turns, sessionId]);

  const onProcessingDone = useCallback(() => {
    // voice turn_complete already handled in the subscription below
  }, []);

  const voice = useVoicePipeline({ sessionId, sendMessage, onProcessingDone });

  // Stop mic when switching away from voice mode
  useEffect(() => {
    if (mode !== "voice") {
      voice.stopListening();
    }
  }, [mode]); // eslint-disable-line react-hooks/exhaustive-deps

  // Websocket subscriptions for streaming updates
  useEffect(() => {
    const unsubToken = subscribe("token", (msg: { content: string }) => {
      streamingContentRef.current += msg.content;
      const accumulated = streamingContentRef.current;
      setMessages((prev) =>
        prev.map((m) =>
          m.id === streamingIdRef.current ? { ...m, content: accumulated } : m
        )
      );
    });

    const unsubComplete = subscribe(
      "turn_complete",
      (msg: { stt_ms?: number; llm_ms: number; tts_ms?: number; turn_id: string }) => {
        // Confirm transcript bubble → real user message
        if (transcriptMsgIdRef.current) {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === transcriptMsgIdRef.current ? { ...m, isTranscript: false } : m
            )
          );
          transcriptMsgIdRef.current = null;
        }
        setMessages((prev) =>
          prev.map((m) =>
            m.id === streamingIdRef.current
              ? { ...m, llm_ms: msg.llm_ms, stt_ms: msg.stt_ms ?? null, tts_ms: msg.tts_ms ?? null }
              : m
          )
        );
        streamingIdRef.current = null;
        streamingContentRef.current = "";
        setIsStreaming(false);
        voice.notifyTurnComplete();
      }
    );

    const unsubError = subscribe("error", (msg: { message: string }) => {
      // Remove pending transcript bubble on error
      if (transcriptMsgIdRef.current) {
        setMessages((prev) => prev.filter((m) => m.id !== transcriptMsgIdRef.current));
        transcriptMsgIdRef.current = null;
      }
      setMessages((prev) =>
        prev.map((m) =>
          m.id === streamingIdRef.current
            ? { ...m, content: `Error: ${msg.message}` }
            : m
        )
      );
      streamingIdRef.current = null;
      streamingContentRef.current = "";
      setIsStreaming(false);
      voice.notifyTurnComplete(); // reset voice state so operator can retry
    });

    const unsubTitle = subscribe(
      "session_title",
      (msg: { session_id: string; title: string }) => {
        if (msg.session_id === sessionId) {
          onTitleUpdate?.(msg.title);
        }
      }
    );

    // Voice-specific events
    const unsubTranscript = subscribe("transcript", (msg: { content: string }) => {
      // Show what STT heard as a pending user bubble
      const transcriptId = crypto.randomUUID();
      const assistantId = crypto.randomUUID();
      transcriptMsgIdRef.current = transcriptId;
      streamingIdRef.current = assistantId;
      streamingContentRef.current = "";
      setIsStreaming(true);
      setMessages((prev) => [
        ...prev,
        { id: transcriptId, role: "user", content: msg.content, isTranscript: true },
        { id: assistantId, role: "assistant", content: "" },
      ]);
    });

    const unsubAudioChunk = subscribe("audio_chunk", (msg: { data: string }) => {
      voice.handleAudioChunk(msg.data);
    });

    const unsubTtsEnd = subscribe("tts_end", () => {
      voice.handleTtsEnd();
    });

    // Server sends voice_reset when STT returned empty (silence/noise) — not an error
    const unsubVoiceReset = subscribe("voice_reset", () => {
      voice.notifyTurnComplete(); // back to "listening", no message added
    });

    return () => {
      unsubToken();
      unsubComplete();
      unsubError();
      unsubTitle();
      unsubTranscript();
      unsubAudioChunk();
      unsubTtsEnd();
      unsubVoiceReset();
    };
  }, [subscribe, sessionId, onTitleUpdate]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleInputChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setInput(e.target.value);
    const el = e.target;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }

  function handleSend(textareaRef?: React.RefObject<HTMLTextAreaElement | null>) {
    if (!input.trim() || isStreaming || !isConnected) return;

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: input.trim(),
    };
    const assistantId = crypto.randomUUID();
    const assistantMsg: ChatMessage = {
      id: assistantId,
      role: "assistant",
      content: "",
    };

    streamingIdRef.current = assistantId;
    streamingContentRef.current = "";
    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setIsStreaming(true);
    sendMessage({ type: "message", session_id: sessionId, content: input.trim() });
    setInput("");

    // Reset textarea height after sending
    if (textareaRef?.current) {
      textareaRef.current.style.height = "auto";
    }
  }

  return {
    messages,
    input,
    setInput,
    isStreaming,
    mode,
    setMode,
    isConnected,
    isReconnecting,
    turnsLoading,
    handleInputChange,
    handleSend,
    // voice
    vadState: voice.vadState,
    audioLevel: voice.audioLevel,
    micError: voice.micError,
    startListening: voice.startListening,
    stopListening: voice.stopListening,
  };
}
