"use client";

import { useCallback, useRef, useState } from "react";
import { api } from "@/lib/api";
import { getTtsUrl } from "@/lib/tts";
import {
  isPlaceholder,
  type Message,
  type Panel,
  type SessionResult,
  type TurnMeta,
} from "@/lib/speaking";

type TurnResponse = { response: string; meta: TurnMeta };

/**
 * The whole Speaking-practice conversation state machine: picking a scenario,
 * exchanging AI turns, the per-message translate / explain panels, autoplaying
 * replies through server TTS, and finishing the session for a score.
 *
 * `level` is the learner's CEFR level, forwarded to every AI call.
 */
export function useSpeakingSession(level: string) {
  const [scenario, setScenario] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [autoplay, setAutoplay] = useState(true);
  const [ttsNote, setTtsNote] = useState("");

  const [finishing, setFinishing] = useState(false);
  const [sessionResult, setSessionResult] = useState<SessionResult | null>(null);
  // Set when a scenario starts; read when it finishes to compute duration.
  const sessionStartRef = useRef<number>(0);
  // Synchronous "an AI turn is in flight" latch. `loading` state can't guard
  // re-entry on its own — a second Enter fired in the same frame sees the
  // stale `loading: false` and double-sends. This flips immediately.
  const turnInFlightRef = useRef(false);

  // Hidden-by-default translation + on-demand explanation, keyed by msg index.
  const [tPanels, setTPanels] = useState<Record<number, Panel>>({});
  const [ePanels, setEPanels] = useState<Record<number, Panel>>({});
  const clearPanels = () => {
    setTPanels({});
    setEPanels({});
  };

  // ── Audio: play a piece of German through server TTS (memory + disk cached).
  const play = useCallback(async (text: string) => {
    const url = await getTtsUrl(text);
    if (!url) {
      setTtsNote("Audio unavailable — is ELEVENLABS_API_KEY set on the API?");
      return;
    }
    setTtsNote("");
    new Audio(url).play().catch(() => {});
  }, []);

  // ── Send one turn. `visible: false` skips echoing the user message (used for
  // the invisible "open the conversation" kick-off).
  const sendTurn = useCallback(
    async (userMessage: string, opts: { visible?: boolean } = {}) => {
      if (turnInFlightRef.current) return;
      turnInFlightRef.current = true;
      const visible = opts.visible ?? true;
      const history = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));
      if (visible) {
        setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
      }
      setLoading(true);
      try {
        const res = await api.post<TurnResponse>("/ai/speaking/turn", {
          scenario,
          userMessage,
          history,
          level,
        });
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: res.response, meta: res.meta },
        ]);
        if (autoplay && res.response) play(res.response);
      } catch {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: "(Entschuldigung — something went wrong. Try again.)",
          },
        ]);
      } finally {
        setLoading(false);
        turnInFlightRef.current = false;
      }
    },
    [messages, scenario, level, autoplay, play],
  );

  // ── Start (or restart) a scenario. Kicks off the AI's opening line. The
  // scenario id is passed to the API explicitly since the state update above
  // may not have flushed yet.
  const startScenario = useCallback(
    async (id: string) => {
      if (turnInFlightRef.current) return;
      turnInFlightRef.current = true;
      setScenario(id);
      setMessages([]);
      clearPanels();
      setSessionResult(null);
      sessionStartRef.current = Date.now();
      setLoading(true);
      try {
        const res = await api.post<TurnResponse>("/ai/speaking/turn", {
          scenario: id,
          userMessage: "Beginne das Gespräch. Bitte fang du an.",
          history: [],
          level,
        });
        setMessages([
          { role: "assistant", content: res.response, meta: res.meta },
        ]);
        if (autoplay && res.response) play(res.response);
      } catch {
        setMessages([
          {
            role: "assistant",
            content: "(Could not start — please try again.)",
          },
        ]);
      } finally {
        setLoading(false);
        turnInFlightRef.current = false;
      }
    },
    [level, autoplay, play],
  );

  // ── Leave the conversation / summary and go back to the scenario list.
  const exitToScenarios = useCallback(() => {
    setScenario(null);
    setMessages([]);
    setSessionResult(null);
    clearPanels();
  }, []);

  // ── Finish: score the transcript, store the session, award XP.
  const finishSession = useCallback(async () => {
    if (!scenario || finishing) return;
    setFinishing(true);
    try {
      const res = await api.post<SessionResult>("/speaking/sessions", {
        scenario,
        messages: messages
          .filter((m) => !isPlaceholder(m.content))
          .map((m) => ({ role: m.role, content: m.content })),
        durationSeconds: Math.max(
          0,
          Math.round((Date.now() - sessionStartRef.current) / 1000),
        ),
        level,
      });
      setSessionResult(res);
    } catch {
      setTtsNote("Could not save the session — please try again.");
    } finally {
      setFinishing(false);
    }
  }, [scenario, finishing, messages, level]);

  // ── Translation panel (hidden until requested). The AI usually ships the
  // translation in its meta — instant and free; otherwise fetch it.
  const toggleTranslation = useCallback(
    async (i: number, m: Message) => {
      const cur = tPanels[i];
      if (cur?.open) {
        setTPanels((p) => ({ ...p, [i]: { ...cur, open: false } }));
        return;
      }
      if (cur?.text) {
        setTPanels((p) => ({ ...p, [i]: { ...cur, open: true } }));
        return;
      }
      const fromMeta = m.meta?.translation;
      if (fromMeta) {
        setTPanels((p) => ({ ...p, [i]: { text: fromMeta, open: true } }));
        return;
      }
      setTPanels((p) => ({ ...p, [i]: { open: true, loading: true } }));
      try {
        const res = await api.post<{ translation: string }>("/ai/translate", {
          text: m.content,
        });
        setTPanels((p) => ({
          ...p,
          [i]: { text: res.translation, open: true },
        }));
      } catch {
        setTPanels((p) => ({
          ...p,
          [i]: { text: "(Could not translate right now.)", open: true },
        }));
      }
    },
    [tPanels],
  );

  // ── Sentence-explanation panel (always fetched on demand).
  const toggleExplain = useCallback(
    async (i: number, m: Message) => {
      const cur = ePanels[i];
      if (cur?.open) {
        setEPanels((p) => ({ ...p, [i]: { ...cur, open: false } }));
        return;
      }
      if (cur?.text) {
        setEPanels((p) => ({ ...p, [i]: { ...cur, open: true } }));
        return;
      }
      setEPanels((p) => ({ ...p, [i]: { open: true, loading: true } }));
      try {
        const res = await api.post<{ explanation: string }>(
          "/ai/sentence/explain",
          { sentence: m.content, level },
        );
        setEPanels((p) => ({
          ...p,
          [i]: { text: res.explanation, open: true },
        }));
      } catch {
        setEPanels((p) => ({
          ...p,
          [i]: { text: "(Could not explain right now.)", open: true },
        }));
      }
    },
    [ePanels, level],
  );

  return {
    // state
    scenario,
    messages,
    loading,
    autoplay,
    ttsNote,
    finishing,
    sessionResult,
    tPanels,
    ePanels,
    // actions
    setAutoplay,
    setTtsNote,
    startScenario,
    exitToScenarios,
    sendTurn,
    finishSession,
    play,
    toggleTranslation,
    toggleExplain,
  };
}
