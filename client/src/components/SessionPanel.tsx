"use client";

import { useEffect, useRef } from "react";
import { ArrowUp, Mic } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SessionTurnsSkeleton } from "@/components/SessionTurnsSkeleton";
import { useSessionChat } from "@/hooks/useSessionChat";

interface SessionPanelProps {
  sessionId: string;
  onTitleUpdate?: (title: string) => void;
}

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
  } = useSessionChat(sessionId, onTitleUpdate);

  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!isStreaming && isConnected) {
      textareaRef.current?.focus();
    }
  }, [isStreaming, isConnected]);

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
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[72%] rounded-2xl px-4 py-2.5 text-sm ${
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-foreground"
                  }`}
                >
                  <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                  {msg.role === "assistant" && (msg.stt_ms !== undefined || msg.llm_ms !== undefined || msg.tts_ms !== undefined) && (
                    <div className="flex gap-2.5 mt-1.5 text-[10px] opacity-40">
                      <span>stt {msg.stt_ms != null ? `${msg.stt_ms}ms` : "—"}</span>
                      <span>llm {msg.llm_ms != null ? `${msg.llm_ms}ms` : "—"}</span>
                      <span>tts {msg.tts_ms != null ? `${msg.tts_ms}ms` : "—"}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <div className="px-6 py-4 shrink-0">
        <div className="relative flex flex-col max-w-3xl mx-auto rounded-2xl border border-input bg-background shadow-sm focus-within:ring-1 focus-within:ring-ring transition-shadow">
          {mode === "voice" ? (
            <div className="flex flex-col items-center justify-center gap-3 py-8">
              <Mic className="size-7 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Voice mode — coming soon</span>
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
            {/* Mode toggle — lives inside the box, left side */}
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
            {/* Send button — right side */}
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
