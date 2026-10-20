/**
 * Generates the PWA icons and iOS splash screens.
 * Run with: node scripts/generate-icons.mjs
 *
 * Everything is drawn programmatically (no binary assets checked in), so the
 * icon set can be regenerated or restyled at any time.
 */
import zlib from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

/* ---------------------------------------------------------------- PNG ---- */

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}

function encodePng(width, height, rgba) {
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0; // filter: none
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // colour type RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

/* -------------------------------------------------------------- shapes --- */

const BRAND = [0x9a, 0x34, 0x12, 255];
const CREAM = [0xff, 0xf6, 0xec, 255];
const AMBER = [0xf5, 0x9e, 0x0b, 255];
const WHITE = [0xff, 0xff, 0xff, 255];
const STEAM = [0xff, 0xf6, 0xec, 210];

function inEllipse(x, y, cx, cy, rx, ry) {
  const dx = (x - cx) / rx;
  const dy = (y - cy) / ry;
  return dx * dx + dy * dy <= 1;
}

/** Colour of the icon artwork at normalised coordinates (0..1), or null. */
function artwork(x, y, scale) {
  // scale: 1 = full bleed artwork, <1 = smaller centred artwork (maskable)
  const u = (x - 0.5) / scale + 0.5;
  const v = (y - 0.5) / scale + 0.5;
  if (u < 0 || u > 1 || v < 0 || v > 1) return null;

  // Steam: three wavy strokes above the bowl.
  for (const [sx, phase] of [
    [0.36, 0.0],
    [0.5, 0.6],
    [0.64, 1.2],
  ]) {
    const wobble = 0.035 * Math.sin((v - 0.08) * 16 + phase);
    if (v > 0.1 && v < 0.38 && Math.abs(u - (sx + wobble)) < 0.022) {
      return STEAM;
    }
  }

  // Curry surface inside the bowl (drawn first so the cream rim shows around it).
  if (inEllipse(u, v, 0.5, 0.55, 0.33, 0.085)) return AMBER;

  // Rim of the bowl.
  if (inEllipse(u, v, 0.5, 0.55, 0.4, 0.115)) return CREAM;

  // Bowl body (lower half of a disc).
  const dx = u - 0.5;
  const dy = v - 0.55;
  if (dy >= 0 && dx * dx + dy * dy <= 0.4 * 0.4) return CREAM;

  return null;
}

function renderIcon(size, { artworkScale = 1, background = BRAND } = {}) {
  const buf = Buffer.alloc(size * size * 4);
  const SS = 3; // supersampling factor
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const x = (px + (sx + 0.5) / SS) / size;
          const y = (py + (sy + 0.5) / SS) / size;
          const c = artwork(x, y, artworkScale) ?? background;
          r += c[0];
          g += c[1];
          b += c[2];
          a += c[3];
        }
      }
      const n = SS * SS;
      const i = (py * size + px) * 4;
      buf[i] = Math.round(r / n);
      buf[i + 1] = Math.round(g / n);
      buf[i + 2] = Math.round(b / n);
      buf[i + 3] = Math.round(a / n);
    }
  }
  return encodePng(size, size, buf);
}

function renderSplash(width, height) {
  const buf = Buffer.alloc(width * height * 4);
  const iconSize = Math.round(Math.min(width, height) * 0.36);
  const ox = Math.round((width - iconSize) / 2);
  const oy = Math.round((height - iconSize) / 2);
  const SS = 3;

  for (let py = 0; py < height; py++) {
    for (let px = 0; px < width; px++) {
      const i = (py * width + px) * 4;
      const inIcon =
        px >= ox && px < ox + iconSize && py >= oy && py < oy + iconSize;

      if (!inIcon) {
        buf[i] = CREAM[0];
        buf[i + 1] = CREAM[1];
        buf[i + 2] = CREAM[2];
        buf[i + 3] = 255;
        continue;
      }

      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const x = (px - ox + (sx + 0.5) / SS) / iconSize;
          const y = (py - oy + (sy + 0.5) / SS) / iconSize;
          const c = artwork(x, y, 1) ?? BRAND;
          r += c[0];
          g += c[1];
          b += c[2];
          a += c[3];
        }
      }
      const n = SS * SS;
      buf[i] = Math.round(r / n);
      buf[i + 1] = Math.round(g / n);
      buf[i + 2] = Math.round(b / n);
      buf[i + 3] = Math.round(a / n);
    }
  }
  return encodePng(width, height, buf);
}

/* ---------------------------------------------------------------- write -- */

const iconsDir = join(ROOT, "public", "icons");
mkdirSync(iconsDir, { recursive: true });

const iconJobs = [
  [join(iconsDir, "icon-192.png"), 192, { artworkScale: 0.82 }],
  [join(iconsDir, "icon-512.png"), 512, { artworkScale: 0.82 }],
  [join(iconsDir, "maskable-512.png"), 512, { artworkScale: 0.58 }],
  [join(iconsDir, "apple-touch-icon.png"), 180, { artworkScale: 0.82 }],
  [join(ROOT, "app", "icon.png"), 64, { artworkScale: 0.82 }],
  [join(ROOT, "app", "apple-icon.png"), 180, { artworkScale: 0.82 }],
];

for (const [path, size, opts] of iconJobs) {
  writeFileSync(path, renderIcon(size, opts));
  console.log("wrote", path);
}

const splashJobs = [
  [640, 1136],
  [750, 1334],
  [828, 1792],
  [1125, 2436],
  [1170, 2532],
  [1242, 2688],
  [1290, 2796],
];

for (const [w, h] of splashJobs) {
  const path = join(iconsDir, `splash-${w}x${h}.png`);
  writeFileSync(path, renderSplash(w, h));
  console.log("wrote", path);
}
