"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MicVAD } from "@ricky0123/vad-web";
import { float32ToWavBase64 } from "@/lib/wav";

export type VadState = "idle" | "initializing" | "listening" | "recording" | "processing";

interface UseVoicePipelineOptions {
  sessionId: string;
  sendMessage: (data: unknown) => void;
  onProcessingDone: () => void;
}

export function useVoicePipeline({
  sessionId,
  sendMessage,
  onProcessingDone,
}: UseVoicePipelineOptions) {
  const [vadState, setVadState] = useState<VadState>("idle");
  const [audioLevel, setAudioLevel] = useState(0);
  const [micError, setMicError] = useState<string | null>(null);
  const [isTtsPlaying, setIsTtsPlaying] = useState(false);

  // Visualization-only audio refs (not used for VAD)
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const levelPollRef = useRef<number | null>(null);

  // MicVAD ref
  const vadRef = useRef<Awaited<ReturnType<typeof MicVAD.new>> | null>(null);
  const vadStateRef = useRef<VadState>("idle"); // sync copy for use in callbacks

  // TTS playback
  const ttsChunksRef = useRef<Uint8Array[]>([]);
  const ttsAudioRef = useRef<HTMLAudioElement | null>(null);
  const isTtsPlayingRef = useRef(false); // ref for use inside VAD callbacks

  // Stable refs for sessionId and sendMessage (used inside MicVAD callbacks)
  const sessionIdRef = useRef(sessionId);
  sessionIdRef.current = sessionId;
  const sendMessageRef = useRef(sendMessage);
  sendMessageRef.current = sendMessage;

  function syncVadState(s: VadState) {
    vadStateRef.current = s;
    setVadState(s);
  }

  // ── Visualization level polling (waveform only, not VAD) ──────────────────

  function startLevelPolling() {
    if (levelPollRef.current !== null) return;
    const analyser = analyserRef.current;
    if (!analyser) return;

    const data = new Uint8Array(analyser.frequencyBinCount);
    levelPollRef.current = window.setInterval(() => {
      analyser.getByteTimeDomainData(data);
      let sumSq = 0;
      for (let i = 0; i < data.length; i++) {
        const dev = data[i] - 128;
        sumSq += dev * dev;
      }
      const rms = Math.sqrt(sumSq / data.length);
      setAudioLevel(Math.min(100, (rms / 128) * 400));
    }, 50);
  }

  function stopLevelPolling() {
    if (levelPollRef.current !== null) {
      clearInterval(levelPollRef.current);
      levelPollRef.current = null;
    }
    setAudioLevel(0);
  }

  // ── TTS playback ──────────────────────────────────────────────────────────

  function handleAudioChunk(base64: string) {
    try {
      const binary = atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      ttsChunksRef.current.push(bytes);
    } catch {
      // malformed chunk — skip
    }
  }

  function handleTtsEnd() {
    const chunks = ttsChunksRef.current;
    if (chunks.length === 0) return;

    if (ttsAudioRef.current) {
      ttsAudioRef.current.pause();
      ttsAudioRef.current = null;
    }

    const totalLen = chunks.reduce((s, c) => s + c.length, 0);
    const merged = new Uint8Array(totalLen);
    let offset = 0;
    for (const c of chunks) {
      merged.set(c, offset);
      offset += c.length;
    }

    const blob = new Blob([merged], { type: "audio/mpeg" });
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    ttsAudioRef.current = audio;

    isTtsPlayingRef.current = true;
    setIsTtsPlaying(true);

    audio.play().catch(() => {
      isTtsPlayingRef.current = false;
      setIsTtsPlaying(false);
    });
    audio.onended = () => {
      URL.revokeObjectURL(url);
      isTtsPlayingRef.current = false;
      setIsTtsPlaying(false);
    };

    ttsChunksRef.current = [];
  }

  // ── Public API ────────────────────────────────────────────────────────────

  const startListening = useCallback(async () => {
    setMicError(null);
    syncVadState("initializing");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Lightweight AudioContext for waveform visualization only
      const ctx = new AudioContext();
      const src = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      src.connect(analyser);
      audioCtxRef.current = ctx;
      analyserRef.current = analyser;
      startLevelPolling();

      // MicVAD — Silero v5 ML model, handles noise floor + hysteresis automatically
      const vad = await MicVAD.new({
        // Serve assets from public/ so Next.js doesn't interfere with paths
        baseAssetPath: "/",
        onnxWASMBasePath: "/",
        // Disable WASM threading — avoids SharedArrayBuffer / COOP-COEP requirement
        ortConfig: (ort) => {
          ort.env.wasm.numThreads = 1;
        },
        getStream: async () => stream,
        onSpeechStart: () => {
          syncVadState("recording");
          // Barge-in: stop TTS + tell server to cancel current turn
          if (isTtsPlayingRef.current) {
            if (ttsAudioRef.current) {
              ttsAudioRef.current.pause();
              ttsAudioRef.current = null;
            }
            ttsChunksRef.current = [];
            isTtsPlayingRef.current = false;
            setIsTtsPlaying(false);
            sendMessageRef.current({
              type: "interrupt",
              session_id: sessionIdRef.current,
            });
          }
        },
        onSpeechEnd: (audio: Float32Array) => {
          const base64 = float32ToWavBase64(audio);
          sendMessageRef.current({
            type: "audio_voice",
            session_id: sessionIdRef.current,
            data: base64,
            mime_type: "audio/wav",
          });
          syncVadState("processing");
        },
        positiveSpeechThreshold: 0.5,
        negativeSpeechThreshold: 0.35,
        minSpeechMs: 100,
        preSpeechPadMs: 300,
      });

      vadRef.current = vad;
      vad.start();
      syncVadState("listening");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Microphone access denied";
      setMicError(msg);
      syncVadState("idle");
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const stopListening = useCallback(() => {
    vadRef.current?.destroy();
    vadRef.current = null;

    stopLevelPolling();

    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;

    audioCtxRef.current?.close();
    audioCtxRef.current = null;
    analyserRef.current = null;

    if (ttsAudioRef.current) {
      ttsAudioRef.current.pause();
      ttsAudioRef.current = null;
    }
    ttsChunksRef.current = [];
    isTtsPlayingRef.current = false;
    setIsTtsPlaying(false);

    syncVadState("idle");
  }, []);

  const notifyTurnComplete = useCallback(() => {
    if (vadStateRef.current === "processing") {
      syncVadState("listening");
    }
    onProcessingDone();
  }, [onProcessingDone]);

  useEffect(() => {
    return () => {
      stopListening();
    };
  }, [stopListening]);

  return {
    vadState,
    audioLevel,
    micError,
    isTtsPlaying,
    startListening,
    stopListening,
    handleAudioChunk,
    handleTtsEnd,
    notifyTurnComplete,
  };
}
