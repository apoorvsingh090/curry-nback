/**
 * WCAG AA contrast audit for the Curry Kitchen palette.
 * Run with: node scripts/check-contrast.mjs
 *
 * Text pairs must reach 4.5:1 (WCAG AA). Large text / UI borders need 3:1.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

/** The palette lives in tailwind.config.ts — read it from there. */
const tailwindConfig = readFileSync(join(root, "tailwind.config.ts"), "utf8");
const colors = {};
const colorBlock = tailwindConfig.match(/colors:\s*{([\s\S]*?)\n      },\n      fontFamily/);
if (!colorBlock) {
  console.error("Could not parse the palette from tailwind.config.ts");
  process.exit(1);
}
for (const line of colorBlock[1].split("\n")) {
  const match = line.match(/^\s*(?:"([^"]+)"|([a-zA-Z][\w-]*)):\s*"(#[0-9A-Fa-f]{6})"/);
  if (match) colors[match[1] ?? match[2]] = match[3];
}

function hexToRgb(hex) {
  const value = parseInt(hex.slice(1), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

function relativeLuminance(hex) {
  const [r, g, b] = hexToRgb(hex).map((channel) => {
    const c = channel / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastRatio(a, b) {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const light = Math.max(la, lb);
  const dark = Math.min(la, lb);
  return (light + 0.05) / (dark + 0.05);
}

/** [foreground, background, description, minimum ratio] */
const checks = [
  ["ink", "cream", "body text on the page background", 4.5],
  ["ink-soft", "cream", "secondary text on the page background", 4.5],
  ["ink", "surface", "body text on a card", 4.5],
  ["ink-soft", "surface", "secondary text on a card", 4.5],
  ["brand", "cream", "headings and the app title", 4.5],
  ["brand", "surface", "primary heading on a card", 4.5],
  ["brand", "brand-soft", "text on a tinted surface", 4.5],
  ["ink", "brand-soft", "body text on a tinted surface", 4.5],
  ["surface", "brand", "white label on the primary button", 4.5],
  ["success", "success-soft", "positive feedback text", 4.5],
  ["muted", "surface", "penalty text on a card", 4.5],
  ["muted", "cream", "footer and helper text", 4.5],
  ["amber", "amber-soft", "warning text", 4.5],
  ["line", "surface", "card border (non-text, 3:1)", 3],
  ["line", "cream", "card border on the page background (non-text, 3:1)", 3],
];

let failures = 0;
console.log("Curry Kitchen — contrast audit (WCAG AA)\n");
for (const [fg, bg, description, min] of checks) {
  if (!colors[fg] || !colors[bg]) {
    console.error(`  ?? unknown colour: ${fg} / ${bg}`);
    failures += 1;
    continue;
  }
  const ratio = contrastRatio(colors[fg], colors[bg]);
  const pass = ratio >= min;
  if (!pass) failures += 1;
  const status = pass ? "PASS" : "FAIL";
  console.log(
    `  ${status}  ${ratio.toFixed(2).padStart(5)}:1  (min ${min})  ${fg} on ${bg} — ${description}`
  );
}

console.log("");
if (failures > 0) {
  console.error(`${failures} contrast check(s) failed.`);
  process.exit(1);
}
console.log("All contrast checks passed.");
