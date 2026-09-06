"use client";

import { useCallback, useRef, useState } from "react";

const API_BASE = "/api/v1"; // same-origin proxy — see apps/web/next.config.ts

interface Options {
  /** Called with the transcribed German text once STT succeeds. */
  onTranscript: (text: string) => void;
  /** Called with a user-facing status/error line (or "" to clear it). */
  onNote: (note: string) => void;
}

/**
 * Records a reply with MediaRecorder and transcribes it server-side via Groq
 * Whisper (`POST /speaking/stt`). The browser Web Speech API streams audio to
 * Google and fails silently on many setups — this path is reliable everywhere.
 *
 * `micLevel` is a live RMS level (0..~1) so the UI can show the mic is hearing
 * the user; if the whole take stays under the noise floor we skip the upload
 * and tell them to check their input device.
 */
export function useMicRecorder({ onTranscript, onNote }: Options) {
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [micLevel, setMicLevel] = useState(0);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const meterRafRef = useRef(0);
  const peakLevelRef = useRef(0);

  const toggleMic = useCallback(async () => {
    if (recording) {
      recorderRef.current?.stop();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        // autoGainControl boosts quiet laptop mics; the others clean up noise.
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      const mime = MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : MediaRecorder.isTypeSupported("audio/mp4")
          ? "audio/mp4"
          : "";
      const rec = mime
        ? new MediaRecorder(stream, { mimeType: mime })
        : new MediaRecorder(stream);
      chunksRef.current = [];
      rec.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      // Volume meter: sample the stream so the user sees their voice register.
      const ctx = new AudioContext();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      ctx.createMediaStreamSource(stream).connect(analyser);
      const samples = new Uint8Array(analyser.fftSize);
      peakLevelRef.current = 0;
      const tick = () => {
        analyser.getByteTimeDomainData(samples);
        let sum = 0;
        for (let i = 0; i < samples.length; i++) {
          const v = (samples[i] - 128) / 128;
          sum += v * v;
        }
        const rms = Math.sqrt(sum / samples.length);
        peakLevelRef.current = Math.max(peakLevelRef.current, rms);
        setMicLevel(rms);
        meterRafRef.current = requestAnimationFrame(tick);
      };
      tick();
      audioCtxRef.current = ctx;

      rec.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        cancelAnimationFrame(meterRafRef.current);
        audioCtxRef.current?.close().catch(() => {});
        audioCtxRef.current = null;
        setMicLevel(0);
        setRecording(false);
        const blob = new Blob(chunksRef.current, {
          type: rec.mimeType || "audio/webm",
        });
        // If the whole take never rose above the noise floor, the OS is
        // feeding us a silent/wrong input device — don't even send it.
        if (peakLevelRef.current < 0.01) {
          onNote(
            "Your microphone recorded only silence. Windows is likely using the wrong input device — check Settings → System → Sound → Input, pick your real mic, and watch its test bar move while you speak.",
          );
          return;
        }
        if (blob.size < 1000) {
          onNote("Recording too short — tap the mic, speak, then tap ⏹.");
          return;
        }
        setTranscribing(true);
        try {
          const form = new FormData();
          form.append("audio", blob, "speech.webm");
          const res = await fetch(`${API_BASE}/speaking/stt`, {
            method: "POST",
            credentials: "include",
            body: form,
          });
          if (!res.ok) throw new Error();
          const data = (await res.json()) as { text?: string };
          if (data.text) {
            onTranscript(data.text);
            onNote("");
          } else {
            onNote(
              "Didn't catch any speech — speak closer to the mic, and check the green bar moves while you talk.",
            );
          }
        } catch {
          onNote("Could not transcribe — check the API terminal for details.");
        } finally {
          setTranscribing(false);
        }
      };
      recorderRef.current = rec;
      rec.start();
      setRecording(true);
      onNote("");
    } catch {
      onNote(
        "Microphone blocked — allow mic access for this site in your browser.",
      );
    }
  }, [recording, onTranscript, onNote]);

  return { recording, transcribing, micLevel, toggleMic };
}
