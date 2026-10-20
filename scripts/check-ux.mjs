/**
 * Senior-UX static audit (spec §4):
 *  - body copy must be >= 20px (the root font size is 20px, so text-xs/text-sm
 *    and any explicit rem size below 1rem are violations)
 *  - every <button> must have an explicit height of at least 64px
 *  - groups of buttons must be spaced at least 16px apart
 *
 * Run with: node scripts/check-ux.mjs
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const ROOT_FONT_PX = 20; // html { font-size: 20px }
const MIN_BODY_PX = 20;
const MIN_TAP_PX = 64;
const MIN_GAP_PX = 16;

/** Tailwind v3 default spacing scale, in rem. */
const SPACING_REM = {
  0: 0,
  px: 0.05,
  0.5: 0.125,
  1: 0.25,
  1.5: 0.375,
  2: 0.5,
  2.5: 0.625,
  3: 0.75,
  3.5: 0.875,
  4: 1,
  5: 1.25,
  5.5: 1.375,
  6: 1.5,
  6.5: 1.625,
  7: 1.75,
  7.5: 1.875,
  8: 2,
  8.5: 2.125,
  9: 2.25,
  9.5: 2.375,
  10: 2.5,
  11: 2.75,
  12: 3,
  14: 3.5,
  16: 4,
  20: 5,
  24: 6,
  28: 7,
  32: 8,
  36: 9,
  40: 10,
  44: 11,
  48: 12,
  52: 13,
  56: 14,
  60: 15,
  64: 16,
  72: 18,
  80: 20,
  96: 24,
};

function walk(dir, files = []) {
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry === ".next" || entry === ".git") continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, files);
    else if (/\.(tsx|ts|css)$/.test(entry)) files.push(full);
  }
  return files;
}

/** Removes comments so the audit only looks at real code. */
function stripComments(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n")
    .map((line) => {
      const index = line.indexOf("//");
      if (index === -1) return line;
      const before = line.slice(0, index);
      // keep protocol URLs (https://) intact
      if (before.trimEnd().endsWith(":")) return line;
      return before;
    })
    .join("\n");
}

/** Finds opening tags, ignoring `>` inside JSX braces (e.g. `=>`). */
function findOpeningTags(content, tagName) {
  const results = [];
  const re = new RegExp(`<${tagName}\\b`, "g");
  let match;
  while ((match = re.exec(content)) !== null) {
    let index = match.index + match[0].length;
    let depth = 0;
    while (index < content.length) {
      const char = content[index];
      if (char === "{") depth += 1;
      else if (char === "}") depth -= 1;
      else if (char === ">" && depth === 0) break;
      index += 1;
    }
    results.push({ tag: content.slice(match.index, index + 1), index: match.index });
    re.lastIndex = index + 1;
  }
  return results;
}

/**
 * Resolves the class names used by an element: literal strings inside the
 * className expression plus any module-level constants it references.
 */
function resolveClasses(expression, content, literal = false) {
  if (literal) return expression;
  const classes = [];
  for (const match of expression.matchAll(/["'`]([^"'`]+)["'`]/g)) {
    classes.push(match[1]);
  }
  for (const match of expression.matchAll(/\b([A-Za-z_$][\w$]*)\b/g)) {
    const name = match[1];
    const scalar = content.match(
      new RegExp(`\\bconst\\s+${name}\\s*(?::[^=]+)?=\\s*"([^"]*)"`)
    );
    if (scalar) {
      classes.push(scalar[1]);
      continue;
    }
    const object = content.match(
      new RegExp(
        `\\bconst\\s+${name}\\s*(?::[^=]+)?=\\s*\\{([\\s\\S]*?)\\n\\s*\\};`
      )
    );
    if (object) {
      for (const value of object[1].matchAll(/"([^"]*)"/g)) {
        classes.push(value[1]);
      }
    }
  }
  return classes.join(" ");
}

/** Pulls the className expression out of an opening tag. */
function classNameExpression(tag) {
  const literal = tag.match(/className="([^"]*)"/);
  if (literal) return { expr: literal[1], literal: true };
  const template = tag.match(/className=\{`([^`]*)`\}/);
  if (template) return { expr: template[1], literal: false };
  const array = tag.match(
    /className=\{(\[[\s\S]*?\])\.join\(\s*["'`]\s*["'`]\s*\)\}/
  );
  if (array) return { expr: array[1], literal: false };
  const plain = tag.match(/className=\{([^}]*)\}/);
  if (plain) return { expr: plain[1], literal: false };
  return { expr: "", literal: false };
}

const files = [...walk(join(root, "app")), ...walk(join(root, "components"))];
const problems = [];

/* ---------------------------------------------------------- font sizes --- */

const FORBIDDEN_FONT_CLASSES = /\btext-(xs|sm)\b/;
const ARBITRARY_FONT = /text-\[\s*([0-9.]+)rem\s*\]/g;

for (const file of files) {
  const content = stripComments(readFileSync(file, "utf8"));
  const relative = file.slice(root.length + 1);

  content.split("\n").forEach((line, index) => {
    if (FORBIDDEN_FONT_CLASSES.test(line)) {
      problems.push(
        `${relative}:${index + 1} — uses text-xs/text-sm (below the 20px body minimum)`
      );
    }
    let match;
    ARBITRARY_FONT.lastIndex = 0;
    while ((match = ARBITRARY_FONT.exec(line)) !== null) {
      const px = Number(match[1]) * ROOT_FONT_PX;
      if (px < MIN_BODY_PX) {
        problems.push(
          `${relative}:${index + 1} — text-[${match[1]}rem] is ${px}px, below ${MIN_BODY_PX}px`
        );
      }
    }
  });
}

/* --------------------------------------------------------- tap targets --- */

const HEIGHT_CLASS = /(?:^|\s)(min-)?h-(\[[^\]]+\]|[0-9]+(?:\.[0-9]+)?)(?=\s|$)/g;

function heightPx(classes) {
  let min = Infinity;
  let match;
  HEIGHT_CLASS.lastIndex = 0;
  while ((match = HEIGHT_CLASS.exec(classes)) !== null) {
    const value = match[2];
    let px;
    if (value.startsWith("[")) {
      px = Number(value.slice(1, -1).replace("px", ""));
    } else {
      px = (SPACING_REM[value] ?? 0) * ROOT_FONT_PX;
    }
    if (!Number.isFinite(px)) continue;
    min = Math.min(min, px);
  }
  return min;
}

for (const file of files) {
  const raw = readFileSync(file, "utf8");
  const content = stripComments(raw);
  const relative = file.slice(root.length + 1);

  for (const { tag, index } of findOpeningTags(content, "button")) {
    const { expr, literal } = classNameExpression(tag);
    const classes = resolveClasses(expr, content, literal);
    const line = content.slice(0, index).split("\n").length;
    const px = heightPx(classes);
    if (!Number.isFinite(px)) {
      problems.push(`${relative}:${line} — <button> has no explicit height class`);
    } else if (px < MIN_TAP_PX) {
      problems.push(
        `${relative}:${line} — <button> height is ${px}px, below the ${MIN_TAP_PX}px minimum`
      );
    }
  }
}

/* --------------------------------------------------------------- gaps ---- */

/**
 * Only containers that group buttons matter here, and they are marked with
 * the `btn-group` class so the check stays simple and explicit.
 */
const GAP_CLASS = /(?:^|\s)(?:gap|space-y)-(\[[^\]]+\]|[0-9]+(?:\.[0-9]+)?)(?=\s|$)/g;

for (const file of files) {
  const content = stripComments(readFileSync(file, "utf8"));
  const relative = file.slice(root.length + 1);

  for (const { tag, index } of findOpeningTags(content, "div")) {
    const { expr, literal } = classNameExpression(tag);
    const classes = resolveClasses(expr, content, literal);
    if (!/\bbtn-group\b/.test(classes)) continue;

    const line = content.slice(0, index).split("\n").length;
    let gapMatch;
    GAP_CLASS.lastIndex = 0;
    let found = false;
    while ((gapMatch = GAP_CLASS.exec(classes)) !== null) {
      found = true;
      const value = gapMatch[1];
      const px = value.startsWith("[")
        ? Number(value.slice(1, -1).replace("px", ""))
        : (SPACING_REM[value] ?? 0) * ROOT_FONT_PX;
      if (px < MIN_GAP_PX) {
        problems.push(
          `${relative}:${line} — button group spacing is ${px}px, below the ${MIN_GAP_PX}px minimum`
        );
      }
    }
    if (!found) {
      problems.push(
        `${relative}:${line} — btn-group has no explicit gap/space-y class`
      );
    }
  }
}

/* ------------------------------------------------------------- report ---- */

console.log("Curry Kitchen — senior UX audit");
console.log(`  minimum body font : ${MIN_BODY_PX}px`);
console.log(`  minimum tap target : ${MIN_TAP_PX}px`);
console.log(`  minimum button gap : ${MIN_GAP_PX}px`);
console.log("");

if (problems.length > 0) {
  for (const problem of problems) console.log(`  FAIL  ${problem}`);
  console.log("");
  console.error(`${problems.length} senior-UX violation(s) found.`);
  process.exit(1);
}

console.log("  All senior-UX checks passed.");
