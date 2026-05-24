"use client";

import { useEffect, useRef } from "react";
import { ArrowUp, Mic, MicOff, Loader2, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SessionTurnsSkeleton } from "@/components/SessionTurnsSkeleton";
import { useSessionChat } from "@/hooks/useSessionChat";
import type { VadState } from "@/hooks/useVoicePipeline";

interface SessionPanelProps {
  sessionId: string;
  onTitleUpdate?: (title: string) => void;
}

const VAD_LABEL: Record<VadState, string> = {
  idle: "Click mic to start",
  initializing: "Initializing…",
  listening: "Listening…",
  recording: "Recording…",
  processing: "Processing…",
};

export function SessionPanel({ sessionId, onTitleUpdate }: SessionPanelProps) {
  const {
    messages,
    input,
    isStreaming,
    mode,
    setMode,
    isConnected,
    turnsLoading,
    handleInputChange,
    handleSend: _handleSend,
    vadState,
    audioLevel,
    micError,
    isTtsPlaying,
    startListening,
    stopListening,
  } = useSessionChat(sessionId, onTitleUpdate);

  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!isStreaming && isConnected && mode === "text") {
      textareaRef.current?.focus();
    }
  }, [isStreaming, isConnected, mode]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "auto" });
  }, [messages]);

  function handleSend() {
    _handleSend(textareaRef);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function handleMicToggle() {
    if (vadState === "idle") {
      startListening();
    } else {
      stopListening();
    }
  }

  // Bar heights for waveform visualiser (5 bars)
  const barHeights = Array.from({ length: 5 }, (_, i) => {
    const phase = (i / 4) * Math.PI;
    const base = 20;
    const amp = audioLevel * 0.6;
    return Math.max(base, base + amp * Math.sin(phase));
  });

  return (
    <div className="flex flex-col h-full">

      {/* Messages */}
      <div className="flex-1 overflow-y-auto min-h-0 px-6 py-4">
        {turnsLoading ? (
          <SessionTurnsSkeleton />
        ) : messages.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-muted-foreground">Send a message to start the conversation.</p>
          </div>
        ) : (
          <div className="space-y-3 max-w-3xl mx-auto">
            {messages.map((msg, idx) => {
              const isLastAssistant =
                msg.role === "assistant" &&
                idx === messages.map((m) => m.role).lastIndexOf("assistant");
              return (
                <div
                  key={msg.id}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[72%] rounded-2xl px-4 py-2.5 text-sm transition-opacity ${
                      msg.role === "user"
                        ? `bg-primary text-primary-foreground ${msg.isTranscript ? "opacity-60" : ""}`
                        : "bg-muted text-foreground"
                    }`}
                  >
                    {msg.isTranscript && (
                      <span className="text-[10px] opacity-60 block mb-1 flex items-center gap-1">
                        <Mic className="inline size-2.5" /> transcript
                      </span>
                    )}
                    <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                    {msg.role === "assistant" && isTtsPlaying && isLastAssistant && (
                      <div className="flex items-center gap-1 mt-1.5">
                        <Volume2 className="size-3 text-muted-foreground animate-pulse" />
                        <span className="text-[10px] text-muted-foreground">Playing</span>
                      </div>
                    )}
                    {msg.role === "assistant" && (msg.stt_ms !== undefined || msg.llm_ms !== undefined || msg.tts_ms !== undefined) && (
                      <div className="flex gap-2.5 mt-1.5 text-[10px] opacity-40">
                        <span>stt {msg.stt_ms != null ? `${msg.stt_ms}ms` : "—"}</span>
                        <span>llm {msg.llm_ms != null ? `${msg.llm_ms}ms` : "—"}</span>
                        <span>tts {msg.tts_ms != null ? `${msg.tts_ms}ms` : "—"}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <div className="px-6 py-4 shrink-0">
        <div className="relative flex flex-col max-w-3xl mx-auto rounded-2xl border border-input bg-background shadow-sm focus-within:ring-1 focus-within:ring-ring transition-shadow">

          {mode === "voice" ? (
            <div className="flex flex-col items-center justify-center gap-4 py-6">
              {/* Waveform */}
              <div className="flex items-end gap-1 h-10">
                {barHeights.map((h, i) => (
                  <div
                    key={i}
                    className={`w-1.5 rounded-full transition-all duration-75 ${
                      vadState === "recording"
                        ? "bg-primary"
                        : vadState === "listening"
                        ? "bg-muted-foreground/50"
                        : "bg-muted-foreground/20"
                    }`}
                    style={{ height: `${h}%` }}
                  />
                ))}
              </div>

              {/* Mic button */}
              <button
                onClick={handleMicToggle}
                disabled={!isConnected || vadState === "processing" || vadState === "initializing"}
                className={`cursor-pointer rounded-full p-4 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                  vadState === "idle"
                    ? "bg-muted hover:bg-muted/80"
                    : vadState === "processing" || vadState === "initializing"
                    ? "bg-muted"
                    : "bg-primary hover:bg-primary/90"
                }`}
              >
                {vadState === "processing" || vadState === "initializing" ? (
                  <Loader2 className="size-5 text-muted-foreground animate-spin" />
                ) : vadState === "idle" ? (
                  <MicOff className="size-5 text-muted-foreground" />
                ) : (
                  <Mic className="size-5 text-primary-foreground" />
                )}
              </button>

              <span className="text-xs text-muted-foreground">
                {micError ?? VAD_LABEL[vadState]}
              </span>
            </div>
          ) : (
            <textarea
              ref={textareaRef}
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Write a message..."
              disabled={isStreaming || !isConnected}
              rows={1}
              className="w-full resize-none bg-transparent px-4 pt-4 pb-2 text-sm placeholder:text-muted-foreground focus:outline-none disabled:opacity-50 min-h-0 max-h-[30vh] overflow-y-auto leading-relaxed border-0 ring-0 focus:ring-0"
            />
          )}

          <div className="flex items-center justify-between px-3 pb-3">
            {/* Mode toggle */}
            <div className="flex gap-1">
              <Button
                size="sm"
                variant={mode === "text" ? "default" : "outline"}
                className="h-6 text-xs cursor-pointer px-2"
                onClick={() => setMode("text")}
              >
                Text
              </Button>
              <Button
                size="sm"
                variant={mode === "voice" ? "default" : "outline"}
                className="h-6 text-xs cursor-pointer px-2 gap-1"
                onClick={() => setMode("voice")}
              >
                <Mic className="size-3" />
                Voice
              </Button>
            </div>
            {/* Send button — text mode only */}
            {mode === "text" && (
              <Button
                size="icon"
                onClick={handleSend}
                disabled={isStreaming || !isConnected || !input.trim()}
                className="cursor-pointer shrink-0 rounded-lg size-8 bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                <ArrowUp className="size-4" strokeWidth={2.5} />
              </Button>
            )}
          </div>
        </div>
      </div>

    </div>
  );
}
