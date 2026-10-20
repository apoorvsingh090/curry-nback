/**
 * Generates the small WAV sound effects used by the game.
 * Run with: node scripts/generate-audio.mjs
 *
 * Everything is synthesized locally so the app ships with no third-party
 * media and works fully offline.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, "..", "public", "audio");
const SAMPLE_RATE = 44100;

function encodeWav(samples) {
  const data = Buffer.alloc(samples.length * 2);
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    data.writeInt16LE(Math.round(s * 32767), i * 2);
  }

  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + data.length, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(1, 22); // mono
  header.writeUInt32LE(SAMPLE_RATE, 24);
  header.writeUInt32LE(SAMPLE_RATE * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write("data", 36);
  header.writeUInt32LE(data.length, 40);

  return Buffer.concat([header, data]);
}

/** Simple envelope: fade in/out to avoid clicks. */
function envelope(t, duration, attack = 0.02, release = 0.12) {
  if (t < attack) return t / attack;
  if (t > duration - release) return Math.max(0, (duration - t) / release);
  return 1;
}

function tone({ freq, start, duration, gain = 0.6, type = "sine" }) {
  const n = Math.floor(duration * SAMPLE_RATE);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SAMPLE_RATE;
    const phase = 2 * Math.PI * freq * t;
    let wave;
    if (type === "triangle") {
      wave = 2 / Math.PI * Math.asin(Math.sin(phase));
    } else if (type === "square") {
      wave = Math.sign(Math.sin(phase)) * 0.5;
    } else {
      wave = Math.sin(phase);
    }
    out[i] = wave * gain * envelope(t, duration);
  }
  return out;
}

function mix(...layers) {
  const length = Math.max(...layers.map((l) => l.length));
  const out = new Float32Array(length);
  for (const layer of layers) {
    for (let i = 0; i < layer.length; i++) out[i] += layer[i];
  }
  // soft clip
  for (let i = 0; i < out.length; i++) {
    out[i] = Math.tanh(out[i] * 1.2);
  }
  return out;
}

function silence(duration) {
  return new Float32Array(Math.floor(duration * SAMPLE_RATE));
}

function concat(...parts) {
  const length = parts.reduce((sum, p) => sum + p.length, 0);
  const out = new Float32Array(length);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

const C5 = 523.25;
const E5 = 659.25;
const G5 = 783.99;
const C6 = 1046.5;
const A4 = 440.0;
const F4 = 349.23;
const D4 = 293.66;

const files = {
  // Rising two-note "Nice!"
  "correct.wav": concat(
    tone({ freq: C5, start: 0, duration: 0.14, gain: 0.5, type: "triangle" }),
    tone({ freq: E5, start: 0, duration: 0.16, gain: 0.5, type: "triangle" }),
    tone({ freq: G5, start: 0, duration: 0.3, gain: 0.45, type: "triangle" })
  ),
  // Soft falling two-note "not quite"
  "incorrect.wav": concat(
    tone({ freq: E5, start: 0, duration: 0.13, gain: 0.32, type: "sine" }),
    tone({ freq: A4, start: 0, duration: 0.28, gain: 0.3, type: "sine" })
  ),
  // Short muted tap
  "tap.wav": mix(
    tone({ freq: 660, start: 0, duration: 0.06, gain: 0.3, type: "square" }),
    silence(0.06)
  ),
  // Little jingle for the end of a session
  "complete.wav": concat(
    tone({ freq: C5, start: 0, duration: 0.12, gain: 0.4, type: "triangle" }),
    tone({ freq: E5, start: 0, duration: 0.12, gain: 0.4, type: "triangle" }),
    tone({ freq: G5, start: 0, duration: 0.12, gain: 0.4, type: "triangle" }),
    tone({ freq: C6, start: 0, duration: 0.4, gain: 0.42, type: "triangle" })
  ),
};

mkdirSync(OUT_DIR, { recursive: true });
for (const [name, samples] of Object.entries(files)) {
  const path = join(OUT_DIR, name);
  writeFileSync(path, encodeWav(samples));
  console.log("wrote", path);
}
