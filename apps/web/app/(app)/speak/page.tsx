"use client";

import { useState } from "react";
import { useAuthStore } from "@/store/auth";
import { scenarioById } from "@/lib/speaking";
import { useSpeakingSession } from "@/hooks/use-speaking-session";
import { useEdgeShadow } from "@/hooks/use-edge-shadow";
import { useMicRecorder } from "@/hooks/use-mic-recorder";
import {
  Composer,
  ConversationHeader,
  MessageList,
  ScenarioPicker,
  ScrollbarHideStyle,
  SessionSummary,
} from "@/components/speak";

/**
 * Speaking practice: pick a real-life scenario, then hold a German
 * conversation with an AI partner — type or speak, hear replies read aloud,
 * reveal translations / explanations, and finish for a scored session.
 *
 * All state lives in three hooks (`useSpeakingSession`, `useEdgeShadow`,
 * `useMicRecorder`); this file just wires them to the view components.
 */
export default function SpeakPage() {
  const { user } = useAuthStore();
  const level = user?.level ?? "A1";

  const session = useSpeakingSession(level);
  const { scrollRef, shadow, sync } = useEdgeShadow();
  const [input, setInput] = useState("");

  const mic = useMicRecorder({
    onTranscript: setInput,
    onNote: session.setTtsNote,
  });

  const currentScenario = scenarioById(session.scenario);

  // ── Session summary (after Finish) ──
  if (session.sessionResult) {
    return (
      <SessionSummary
        result={session.sessionResult}
        scenario={currentScenario}
        onPracticeAgain={() => session.startScenario(session.scenario!)}
        onAllScenarios={session.exitToScenarios}
      />
    );
  }

  // ── Scenario picker ──
  if (!session.scenario) {
    return <ScenarioPicker onSelect={session.startScenario} />;
  }

  // ── Conversation view ──
  const send = () => {
    const text = input.trim();
    if (!text || session.loading) return;
    setInput("");
    session.sendTurn(text);
  };

  return (
    // Fixed-height column: fills <main> exactly and never grows it.
    // overflow-hidden is the safety net — only the chat list scrolls.
    <div className="flex flex-col h-full w-full overflow-hidden">
      <ConversationHeader
        scenario={currentScenario}
        level={level}
        autoplay={session.autoplay}
        onToggleAutoplay={() => session.setAutoplay((a) => !a)}
        canFinish={session.messages.some((m) => m.role === "user")}
        finishing={session.finishing}
        onFinish={session.finishSession}
        onBack={session.exitToScenarios}
      />

      <MessageList
        messages={session.messages}
        loading={session.loading}
        scrollRef={scrollRef}
        shadow={shadow}
        onSync={sync}
        tPanels={session.tPanels}
        ePanels={session.ePanels}
        onPlay={session.play}
        onToggleTranslation={session.toggleTranslation}
        onToggleExplanation={session.toggleExplain}
      />

      <Composer
        input={input}
        onInputChange={setInput}
        onSend={send}
        recording={mic.recording}
        transcribing={mic.transcribing}
        micLevel={mic.micLevel}
        ttsNote={session.ttsNote}
        loading={session.loading}
        onToggleMic={mic.toggleMic}
      />

      <ScrollbarHideStyle />
    </div>
  );
}
