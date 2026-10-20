"use client";

import { useSettings } from "@/lib/store";

/**
 * Persistent voice toggle. Top-right of every screen (spec §4.5).
 * Tap target is well above the 64x64px minimum.
 */
export default function SpeakerToggle() {
  const voiceEnabled = useSettings((s) => s.voiceEnabled);
  const toggleVoice = useSettings((s) => s.toggleVoice);

  return (
    <button
      type="button"
      onClick={toggleVoice}
      aria-pressed={voiceEnabled}
      aria-label={voiceEnabled ? "Turn voice narration off" : "Turn voice narration on"}
      className="inline-flex min-h-[64px] min-w-[64px] items-center gap-2 rounded-full border-2 border-brand bg-surface px-5 text-ink transition-colors hover:bg-brand-soft active:bg-brand-soft"
    >
      <span aria-hidden="true" className="text-2xl leading-none">
        {voiceEnabled ? "🔊" : "🔇"}
      </span>
      <span className="text-[1rem] font-bold leading-tight">
        Voice {voiceEnabled ? "on" : "off"}
      </span>
    </button>
  );
}
