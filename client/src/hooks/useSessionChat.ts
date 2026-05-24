import { useEffect, useRef, useState } from "react";
import { useWebsocket } from "@/hooks/useWebsocket";
import { useSessionTurns } from "@/hooks/useSessions";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  stt_ms?: number | null;
  llm_ms?: number | null;
  tts_ms?: number | null;
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

  // Reset state when session changes
  useEffect(() => {
    setMessages([]);
    setInput("");
    setIsStreaming(false);
    streamingIdRef.current = null;
    streamingContentRef.current = "";
    loadedTurnsRef.current = null;
  }, [sessionId]);

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
      (msg: { llm_ms: number; turn_id: string }) => {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === streamingIdRef.current
              ? { ...m, llm_ms: msg.llm_ms }
              : m
          )
        );
        streamingIdRef.current = null;
        streamingContentRef.current = "";
        setIsStreaming(false);
      }
    );

    const unsubError = subscribe("error", (msg: { message: string }) => {
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
    });

    const unsubTitle = subscribe(
      "session_title",
      (msg: { session_id: string; title: string }) => {
        if (msg.session_id === sessionId) {
          onTitleUpdate?.(msg.title);
        }
      }
    );

    return () => {
      unsubToken();
      unsubComplete();
      unsubError();
      unsubTitle();
    };
  }, [subscribe, sessionId, onTitleUpdate]);

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
  };
}
