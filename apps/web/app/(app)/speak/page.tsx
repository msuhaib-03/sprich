"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/auth";
import { useUiStore } from "@/store/ui";
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

  // The live conversation runs full-screen: tell the app shell to drop the
  // mobile header + bottom tab bar so the keyboard can't squish the chat. The
  // scenario picker and the score summary keep the normal chrome.
  const inConversation = !!session.scenario && !session.sessionResult;
  const setImmersive = useUiStore((s) => s.setImmersive);
  useEffect(() => {
    setImmersive(inConversation);
    return () => setImmersive(false);
  }, [inConversation, setImmersive]);

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
    // Fill the immersive <main> exactly (it's already sized to the dynamic
    // viewport, which shrinks for the soft keyboard). overflow-hidden pins the
    // header/footer so only the chat body scrolls; the dot grid is a faint
    // texture behind the transcript.
    <div className="flex flex-col h-full w-full overflow-hidden bg-[var(--bg)]">
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
