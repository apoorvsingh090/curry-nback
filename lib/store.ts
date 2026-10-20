"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { evaluateUnlockedMode } from "./progression";
import type { DifficultyMode, Settings, Session } from "./types";

interface SettingsStore extends Settings {
  toggleVoice: () => void;
  markBriefingSeen: () => void;
  setLastMode: (mode: DifficultyMode) => void;
  setUnlockedMode: (mode: DifficultyMode) => void;
  syncUnlocks: (sessions: Session[]) => void;
}

export const useSettings = create<SettingsStore>()(
  persist(
    (set) => ({
      voiceEnabled: true,
      briefingSeen: false,
      unlockedMode: "easy",
      lastMode: "easy",
      toggleVoice: () => set((s) => ({ voiceEnabled: !s.voiceEnabled })),
      markBriefingSeen: () => set({ briefingSeen: true }),
      setLastMode: (mode) => set({ lastMode: mode }),
      setUnlockedMode: (mode) => set({ unlockedMode: mode }),
      syncUnlocks: (sessions) => {
        const unlockedMode = evaluateUnlockedMode(sessions);
        set((state) =>
          state.unlockedMode === unlockedMode
            ? state
            : { unlockedMode }
        );
      },
    }),
    {
      name: "curry-nback-settings",
      storage: createJSONStorage(() => localStorage),
      version: 1,
    }
  )
);

/**
 * The most recently finished session, kept in memory so the summary screen
 * can render instantly (and as a fallback if IndexedDB is unavailable).
 */
interface LastSessionStore {
  lastSession: Session | null;
  setLastSession: (session: Session | null) => void;
}

export const useLastSession = create<LastSessionStore>()((set) => ({
  lastSession: null,
  setLastSession: (session) => set({ lastSession: session }),
}));
