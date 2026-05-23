'use client';

// ── VoicePicker — ElevenLabs voice selection grid ────────────────────────────
// Cards: rectangular (wider than square), rounded-md radius.
// Selected: blue border + blue tinted background.
// Play button: inside card div (never nested button-in-button).

import { useRef, useState, useEffect } from 'react';
import { PlayIcon, SquareIcon, CheckIcon } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/utils/utils';
import { useVoices } from '@/hooks/useVoices';
import type { Voice } from '@/types/voice.types';

interface VoicePickerProps {
  value: string;
  onChange: (voiceId: string) => void;
}

// ── VoiceCard ─────────────────────────────────────────────────────────────────
function VoiceCard({
  voice,
  selected,
  onSelect,
  playing,
  onTogglePlay,
}: {
  voice: Voice;
  selected: boolean;
  onSelect: () => void;
  playing: boolean;
  onTogglePlay: (e: React.MouseEvent) => void;
}) {
  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSelect();
    }
  }

  // "Roger - Laid-Back, Casual" format (like ElevenLabs UI)
  const displayName = voice.labels.descriptive
    ? `${voice.name} - ${voice.labels.descriptive}`
    : voice.name;

  // Visible label chips: gender, accent, use_case (skip descriptive — shown in title)
  const chips = [
    voice.labels.gender,
    voice.labels.accent,
    voice.labels.use_case,
  ].filter(Boolean) as string[];

  return (
    // div root (not button) → avoids nested-button HTML error
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={handleKeyDown}
      className={cn(
        // Rectangular card with moderate rounding
        'relative flex flex-col gap-2 rounded-md border p-3 transition-colors cursor-pointer select-none',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        selected
          ? 'border-blue-500 bg-blue-500/10 text-foreground'
          : 'border-border bg-card hover:border-border/60 hover:bg-accent/40'
      )}
    >
      {/* Selected checkmark — top right */}
      {selected && (
        <span className="absolute right-2 top-2 flex size-4 items-center justify-center rounded-sm bg-blue-500">
          <CheckIcon className="size-2.5 text-white" />
        </span>
      )}

      {/* Voice name (truncated, with descriptive label) */}
      <p
        className="truncate pr-6 text-xs font-medium leading-snug"
        title={displayName}
      >
        {displayName}
      </p>

      {/* Category */}
      <p className="text-[10px] text-muted-foreground">{voice.category}</p>

      {/* Label chips */}
      {chips.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {chips.map((chip) => (
            <span
              key={chip}
              className={cn(
                'rounded-sm px-1.5 py-0.5 text-[10px] font-medium',
                selected
                  ? 'bg-blue-500/20 text-blue-300'
                  : 'bg-muted text-muted-foreground'
              )}
            >
              {chip}
            </span>
          ))}
        </div>
      )}

      {/* Play preview button — bottom right */}
      {voice.preview_url && (
        <button
          type="button"
          onClick={onTogglePlay}
          title={playing ? 'Stop preview' : 'Play preview'}
          className={cn(
            'absolute bottom-2.5 right-2.5 flex size-6 items-center justify-center rounded-sm border transition-colors cursor-pointer',
            playing
              ? 'border-blue-500 bg-blue-500 text-white hover:bg-blue-600 hover:border-blue-600'
              : selected
                ? 'border-blue-400 text-blue-400 hover:bg-blue-500/20'
                : 'border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground'
          )}
        >
          {playing ? <SquareIcon className="size-2.5" /> : <PlayIcon className="size-2.5" />}
        </button>
      )}
    </div>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────
function VoicePickerSkeleton() {
  return (
    <div className="grid grid-cols-3 gap-2">
      {Array.from({ length: 9 }).map((_, i) => (
        <div key={i} className="rounded-md border border-border p-3 space-y-2">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-2.5 w-14" />
          <div className="flex gap-1">
            <Skeleton className="h-4 w-10 rounded-sm" />
            <Skeleton className="h-4 w-16 rounded-sm" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ── VoicePicker ────────────────────────────────────────────────────────────────
export function VoicePicker({ value, onChange }: VoicePickerProps) {
  const { data: voices = [], isLoading, isError } = useVoices();
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Clean up audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

  const togglePlay = (voiceId: string, url: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (playingId === voiceId) {
      // Pause current
      audioRef.current?.pause();
      setPlayingId(null);
    } else {
      // Pause previous if exists
      audioRef.current?.pause();
      // Play new
      const audio = new Audio(url);
      audio.onended = () => setPlayingId(null);
      audio.play();
      audioRef.current = audio;
      setPlayingId(voiceId);
    }
  };

  if (isLoading) return <VoicePickerSkeleton />;

  if (isError) {
    return (
      <p className="text-xs text-destructive">
        Failed to load voices. Check your ElevenLabs API key.
      </p>
    );
  }

  if (voices.length === 0) {
    return <p className="text-xs text-muted-foreground">No voices available.</p>;
  }

  return (
    <div className="grid grid-cols-3 gap-2">
      {voices.map((voice) => (
        <VoiceCard
          key={voice.voice_id}
          voice={voice}
          selected={voice.voice_id === value}
          onSelect={() => onChange(voice.voice_id)}
          playing={playingId === voice.voice_id}
          onTogglePlay={(e) => togglePlay(voice.voice_id, voice.preview_url!, e)}
        />
      ))}
    </div>
  );
}
