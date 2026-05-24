"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type VadState = "idle" | "listening" | "recording" | "processing";

const SPEECH_RMS_THRESHOLD = 18;   // out of 0–128 (centre=128 removed)
const SILENCE_DELAY_MS = 350;       // ms of silence before we stop recording
const RECORDER_TIMESLICE_MS = 200;  // how often ondataavailable fires

function blobsToBase64(blobs: Blob[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const combined = new Blob(blobs, { type: blobs[0]?.type ?? "audio/webm" });
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      // result is "data:<mime>;base64,<data>"
      resolve(result.split(",")[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(combined);
  });
}

interface UseVoicePipelineOptions {
  sessionId: string;
  sendMessage: (data: unknown) => void;
  onProcessingDone: () => void; // called when turn_complete arrives
}

export function useVoicePipeline({
  sessionId,
  sendMessage,
  onProcessingDone,
}: UseVoicePipelineOptions) {
  const [vadState, setVadState] = useState<VadState>("idle");
  const [audioLevel, setAudioLevel] = useState(0); // 0–100 for UI
  const [micError, setMicError] = useState<string | null>(null);

  // Audio I/O refs
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const blobChunksRef = useRef<Blob[]>([]);

  // VAD timing refs
  const vadPollRef = useRef<number | null>(null);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const vadStateRef = useRef<VadState>("idle"); // sync copy for use inside setInterval

  // TTS playback buffer
  const ttsChunksRef = useRef<Uint8Array[]>([]);
  const ttsAudioRef = useRef<HTMLAudioElement | null>(null);

  function syncVadState(s: VadState) {
    vadStateRef.current = s;
    setVadState(s);
  }

  // ── VAD polling ────────────────────────────────────────────────────────────

  function startVadPolling() {
    if (vadPollRef.current !== null) return;

    const analyser = analyserRef.current;
    if (!analyser) return;

    const data = new Uint8Array(analyser.frequencyBinCount);

    vadPollRef.current = window.setInterval(() => {
      analyser.getByteTimeDomainData(data);

      // RMS of deviation from centre (128)
      let sumSq = 0;
      for (let i = 0; i < data.length; i++) {
        const dev = data[i] - 128;
        sumSq += dev * dev;
      }
      const rms = Math.sqrt(sumSq / data.length);
      setAudioLevel(Math.min(100, (rms / 128) * 400)); // 0–100 for UI

      const isSpeech = rms > SPEECH_RMS_THRESHOLD;
      const state = vadStateRef.current;

      if (isSpeech) {
        // Clear any pending silence timer
        if (silenceTimerRef.current !== null) {
          clearTimeout(silenceTimerRef.current);
          silenceTimerRef.current = null;
        }
        // Transition listening → recording
        if (state === "listening") {
          startRecording();
        }
      } else {
        // Silence detected while recording → start silence countdown
        if (state === "recording" && silenceTimerRef.current === null) {
          silenceTimerRef.current = setTimeout(() => {
            silenceTimerRef.current = null;
            stopRecording();
          }, SILENCE_DELAY_MS);
        }
      }
    }, 50);
  }

  function stopVadPolling() {
    if (vadPollRef.current !== null) {
      clearInterval(vadPollRef.current);
      vadPollRef.current = null;
    }
    if (silenceTimerRef.current !== null) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    setAudioLevel(0);
  }

  // ── Recording ──────────────────────────────────────────────────────────────

  function startRecording() {
    const stream = streamRef.current;
    if (!stream) return;

    syncVadState("recording");
    blobChunksRef.current = [];

    const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
      ? "audio/webm;codecs=opus"
      : "audio/webm";

    const recorder = new MediaRecorder(stream, { mimeType });
    recorderRef.current = recorder;

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        blobChunksRef.current.push(e.data);
      }
    };

    recorder.onstop = async () => {
      const chunks = blobChunksRef.current;
      if (chunks.length === 0) {
        syncVadState("listening");
        return;
      }

      try {
        const base64 = await blobsToBase64(chunks);
        sendMessage({
          type: "audio_voice",
          session_id: sessionId,
          data: base64,
          mime_type: mimeType.split(";")[0], // "audio/webm"
        });
        // stay in "processing" until turn_complete
      } catch {
        syncVadState("listening");
      }
    };

    recorder.start(RECORDER_TIMESLICE_MS);
  }

  function stopRecording() {
    const recorder = recorderRef.current;
    if (!recorder || recorder.state === "inactive") return;
    syncVadState("processing");
    recorder.stop();
    recorderRef.current = null;
  }

  // ── TTS playback ───────────────────────────────────────────────────────────

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

    // Stop any currently playing audio
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
    audio.play().catch(() => {});
    audio.onended = () => URL.revokeObjectURL(url);

    ttsChunksRef.current = [];
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  const startListening = useCallback(async () => {
    setMicError(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const ctx = new AudioContext();
      audioCtxRef.current = ctx;

      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      syncVadState("listening");
      startVadPolling();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Microphone access denied";
      setMicError(msg);
    }
  }, [sessionId]); // eslint-disable-line react-hooks/exhaustive-deps

  const stopListening = useCallback(() => {
    stopVadPolling();

    // Stop recorder if mid-recording
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.stop();
    }
    recorderRef.current = null;

    // Release mic tracks
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;

    audioCtxRef.current?.close();
    audioCtxRef.current = null;
    analyserRef.current = null;

    // Stop TTS playback
    if (ttsAudioRef.current) {
      ttsAudioRef.current.pause();
      ttsAudioRef.current = null;
    }

    ttsChunksRef.current = [];
    blobChunksRef.current = [];
    syncVadState("idle");
  }, []);

  // When turn_complete arrives and we're in "processing" → resume listening
  const notifyTurnComplete = useCallback(() => {
    if (vadStateRef.current === "processing") {
      syncVadState("listening");
    }
    onProcessingDone();
  }, [onProcessingDone]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopListening();
    };
  }, [stopListening]);

  return {
    vadState,
    audioLevel,
    micError,
    startListening,
    stopListening,
    handleAudioChunk,
    handleTtsEnd,
    notifyTurnComplete,
  };
}
