// Shared types + data for the Speaking practice feature.
// The AI conversation turn and session-scoring shapes mirror the API's
// /ai/speaking/* and /speaking/sessions responses.

export interface Scenario {
  id: string;
  icon: string;
  title: string;
  sub: string;
}

// Must match the backend SpeakingScenario enum.
export const SCENARIOS: Scenario[] = [
  {
    id: "introduce_yourself",
    icon: "👋",
    title: "Introduce yourself",
    sub: "Talk about who you are",
  },
  {
    id: "job_interview",
    icon: "💼",
    title: "Job interview",
    sub: "Practice for a real Vorstellungsgespräch",
  },
  {
    id: "train_station",
    icon: "🚉",
    title: "At the train station",
    sub: "Buy a ticket, ask about platforms",
  },
  {
    id: "supermarket",
    icon: "🛒",
    title: "Supermarket",
    sub: "Shopping and small problems",
  },
  {
    id: "doctors_appointment",
    icon: "🩺",
    title: "Doctor's appointment",
    sub: "Describe symptoms, understand advice",
  },
  {
    id: "neighbour_chat",
    icon: "🏠",
    title: "Chat with a neighbour",
    sub: "Everyday small talk",
  },
  {
    id: "workplace_smalltalk",
    icon: "☕",
    title: "Workplace small talk",
    sub: "Coffee-break German",
  },
  {
    id: "free_conversation",
    icon: "💬",
    title: "Free conversation",
    sub: "Talk about anything",
  },
];

export const scenarioById = (id: string | null): Scenario | undefined =>
  SCENARIOS.find((s) => s.id === id);

export interface TurnMeta {
  translation?: string;
  corrections?: { original: string; corrected: string; explanation: string }[];
  vocabulary?: { german: string; english: string }[];
  encouragement?: string;
}

export interface Message {
  role: "user" | "assistant";
  content: string;
  meta?: TurnMeta;
}

// A message whose content is a "(…)" placeholder is a local error notice, not
// a real AI turn — it's excluded from the transcript sent for scoring and it
// hides the Play / Translate / Explain tools.
export const isPlaceholder = (content: string) => content.startsWith("(");

// On-demand translation / explanation panel under an assistant message.
export interface Panel {
  text?: string;
  open: boolean;
  loading?: boolean;
}

// Returned by POST /speaking/sessions when a practice session is finished.
export interface SessionResult {
  overallScore: number;
  grammarScore: number;
  vocabularyScore: number;
  fluencyScore: number;
  wordsPerMinute: number;
  aiFeedback: string;
  xpEarned: number;
}
