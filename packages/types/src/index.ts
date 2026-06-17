// ─── German Language Levels ────────────────────────────────────────────────
export type GermanLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2'

export type Gender = 'masculine' | 'feminine' | 'neuter'
export type Article = 'der' | 'die' | 'das'
export type GrammaticalCase = 'nominative' | 'accusative' | 'dative' | 'genitive'

// ─── User & Auth ────────────────────────────────────────────────────────────
export type UserGoal =
  | 'get_job_germany'
  | 'study_germany'
  | 'live_comfortably'
  | 'citizenship'
  | 'fun_learning'

export type UserProfile =
  | 'bachelors_student'
  | 'masters_student'
  | 'working_person'
  | 'complete_beginner'

export interface User {
  id: string
  email: string
  name: string
  avatarUrl?: string
  level: GermanLevel
  profile: UserProfile
  goal: UserGoal
  dailyMinutes: number
  streak: number
  longestStreak: number
  xp: number
  isPremium: boolean
  createdAt: Date
}

// ─── Curriculum ─────────────────────────────────────────────────────────────
export interface Lesson {
  id: string
  level: GermanLevel
  chapter: number
  order: number
  title: string
  subtitle: string
  estimatedMinutes: number
  xpReward: number
  isLocked: boolean
  type: LessonType
}

export type LessonType =
  | 'vocabulary'
  | 'grammar'
  | 'listening'
  | 'speaking'
  | 'scenario'
  | 'review'
  | 'assessment'

export interface LessonContent {
  hook: string          // surprising fact / story (30 sec)
  explain: string       // the WHY — never just the rule
  examples: Example[]
  exercises: Exercise[]
  vocabulary: VocabWord[]
}

export interface Example {
  german: string
  english: string
  breakdown: GrammarBreakdown[]
  audioUrl?: string
}

export interface GrammarBreakdown {
  word: string
  role: string          // e.g. "subject (Nominative)", "direct object (Accusative)"
  color: string         // for color-coded UI
}

export interface Exercise {
  id: string
  type: ExerciseType
  prompt: string
  options?: string[]
  correctAnswer: string
  explanation: string   // WHY this answer is correct
  hint?: string
}

export type ExerciseType =
  | 'multiple_choice'
  | 'fill_blank'
  | 'arrange_words'
  | 'translate'
  | 'speak_response'
  | 'listen_select'

// ─── Vocabulary ──────────────────────────────────────────────────────────────
export interface VocabWord {
  id: string
  german: string
  english: string
  article?: Article
  gender?: Gender
  plural?: string
  audioUrl?: string
  exampleSentence: string
  exampleTranslation: string
  memoryHook?: string   // mnemonic / pattern rule
  level: GermanLevel
}

// ─── Spaced Repetition (SM-2 algorithm) ─────────────────────────────────────
export interface SRSCard {
  vocabId: string
  userId: string
  easeFactor: number    // starts at 2.5
  interval: number      // days until next review
  repetitions: number
  nextReview: Date
  lastReview?: Date
}

// ─── Speaking & AI ───────────────────────────────────────────────────────────
export interface SpeakingSession {
  id: string
  userId: string
  scenario: SpeakingScenario
  transcript: string
  score: SpeakingScore
  createdAt: Date
}

export type SpeakingScenario =
  | 'introduce_yourself'
  | 'job_interview'
  | 'train_station'
  | 'supermarket'
  | 'doctors_appointment'
  | 'neighbour_chat'
  | 'workplace_smalltalk'
  | 'free_conversation'

export interface SpeakingScore {
  overall: number         // 0-100
  pronunciation: number
  grammar: number
  vocabulary: number
  fluency: number
  hesitationCount: number
  wordsPerMinute: number
  feedback: string        // AI-generated specific feedback
}

// ─── Progress ────────────────────────────────────────────────────────────────
export interface UserProgress {
  userId: string
  lessonId: string
  completedAt: Date
  score: number
  timeSpentSeconds: number
  xpEarned: number
}

export interface WeeklyReport {
  userId: string
  weekStart: Date
  lessonsCompleted: number
  vocabularyLearned: number
  speakingMinutes: number
  hesitationImprovement: number  // % change from last week
  xpEarned: number
  streakDays: number
  onTrackMessage: string         // motivational AI-generated message
}

// ─── Subscription ────────────────────────────────────────────────────────────
export type PlanType = 'free' | 'premium_monthly' | 'premium_annual'

export interface Subscription {
  userId: string
  stripeCustomerId: string
  stripeSubscriptionId: string
  plan: PlanType
  status: 'active' | 'canceled' | 'past_due' | 'trialing'
  currentPeriodEnd: Date
}
