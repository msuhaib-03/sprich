'use client'
import { create } from 'zustand'

/**
 * Ephemeral, cross-tree UI state that a page needs to push up into the app
 * shell (`app/(app)/layout.tsx`). Not persisted — it only ever reflects the
 * view that's mounted right now.
 *
 * `immersive`: a full-screen focus mode (currently the /speak conversation).
 * While true the shell unmounts the mobile header + bottom tab bar so the
 * soft keyboard can't squish the chat, and stops <main> from being its own
 * scroll container — the view manages its own 100dvh layout.
 */
interface UiState {
  immersive: boolean
  setImmersive: (value: boolean) => void
}

export const useUiStore = create<UiState>((set) => ({
  immersive: false,
  setImmersive: (immersive) => set({ immersive }),
}))
