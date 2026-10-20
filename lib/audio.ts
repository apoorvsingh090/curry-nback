"use client";

import type { Howl } from "howler";

export type SfxName = "correct" | "incorrect" | "tap" | "complete";

let howls: Record<string, Howl> | null = null;

async function ensureHowls(): Promise<Record<string, Howl> | null> {
  if (typeof window === "undefined") return null;
  if (howls) return howls;
  try {
    const { Howl: HowlCtor } = await import("howler");
    howls = {
      correct: new HowlCtor({ src: ["/audio/correct.wav"], volume: 0.45, format: ["wav"] }),
      incorrect: new HowlCtor({ src: ["/audio/incorrect.wav"], volume: 0.35, format: ["wav"] }),
      tap: new HowlCtor({ src: ["/audio/tap.wav"], volume: 0.3, format: ["wav"] }),
      complete: new HowlCtor({ src: ["/audio/complete.wav"], volume: 0.45, format: ["wav"] }),
    };
    return howls;
  } catch {
    return null;
  }
}

/** Plays a short sound effect. Never throws, never blocks. */
export function playSfx(name: SfxName, enabled = true): void {
  if (!enabled) return;
  void ensureHowls().then((bank) => {
    const sound = bank?.[name];
    if (sound) sound.play();
  });
}

/** Speaks a phrase with the Web Speech API (narration + spoken feedback). */
export function speak(text: string, enabled = true): void {
  if (!enabled) return;
  if (typeof window === "undefined" || typeof window.speechSynthesis === "undefined") return;

  const synth = window.speechSynthesis;
  try {
    synth.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95;
    utterance.pitch = 1;
    utterance.volume = 1;
    const voices = synth.getVoices();
    const english = voices.find((v) => v.lang?.toLowerCase().startsWith("en"));
    if (english) utterance.voice = english;
    synth.speak(utterance);
  } catch {
    /* Speech is a progressive enhancement; ignore failures silently. */
  }
}

export function stopSpeech(): void {
  if (typeof window === "undefined" || typeof window.speechSynthesis === "undefined") return;
  try {
    window.speechSynthesis.cancel();
  } catch {
    /* no-op */
  }
}
