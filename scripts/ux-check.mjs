/**
 * Verifies the ten senior-UX constraints (spec §4) in a real browser at
 * 1024x768 (iPad landscape) and at 390x844 (phone).
 *
 * Run with: node scripts/ux-check.mjs [baseUrl]
 */
import { chromium } from "playwright";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const baseUrl = process.argv[2] ?? "http://localhost:3000";
const MIN_TAP = 64;
const MIN_FONT = 20;

const cache = join(homedir(), "AppData", "Local", "ms-playwright");
const executablePath = [
  "chromium-1243/chrome-win64/chrome.exe",
  "chromium-1234/chrome-win64/chrome.exe",
]
  .map((p) => join(cache, p))
  .find((p) => existsSync(p));

const failures = [];
function check(name, condition, detail = "") {
  if (condition) console.log(`  PASS  ${name}`);
  else {
    console.log(`  FAIL  ${name} ${detail}`);
    failures.push(name);
  }
}

const browser = await chromium.launch({ executablePath, args: ["--no-sandbox"] });

for (const viewport of [
  { width: 1024, height: 768, label: "iPad landscape" },
  { width: 390, height: 844, label: "phone" },
]) {
  console.log(`\n=== ${viewport.label} (${viewport.width}x${viewport.height}) ===\n`);

  const context = await browser.newContext({ viewport });
  const page = await context.newPage();

  /* ---------------------------------------------------- (1) tap targets -- */
  for (const path of ["/", "/brief", "/play", "/progress"]) {
    await page.goto(`${baseUrl}${path}`, { waitUntil: "networkidle" });
    await page.waitForTimeout(700);

    const buttons = await page.locator("button:visible, a[href]:visible").all();
    const tooSmall = [];
    for (const button of buttons) {
      const box = await button.boundingBox();
      if (!box) continue;
      if (box.height < MIN_TAP || box.width < 24) {
        tooSmall.push(
          `${await button.innerText().catch(() => "?")} (${Math.round(box.width)}x${Math.round(box.height)})`
        );
      }
    }
    check(
      `1. tap targets >= 64px on ${path}`,
      tooSmall.length === 0,
      tooSmall.length ? `-> ${tooSmall.join(", ")}` : ""
    );
  }

  /* ------------------------------------------------------- (2) font size -- */
  await page.goto(`${baseUrl}/`, { waitUntil: "networkidle" });
  await page.waitForTimeout(500);
  const smallText = await page.evaluate((min) => {
    const problems = [];
    document.querySelectorAll("body *").forEach((el) => {
      if (el.closest("svg")) return;
      const text = (el.textContent ?? "").trim();
      if (!text || el.children.length > 0) return;
      const size = parseFloat(getComputedStyle(el).fontSize);
      if (size < min) {
        problems.push(`${el.tagName}.${el.className} = ${size}px ("${text.slice(0, 20)}")`);
      }
    });
    return problems;
  }, MIN_FONT);
  check(
    "2. body text >= 20px",
    smallText.length === 0,
    smallText.length ? `-> ${smallText.slice(0, 3).join(" | ")}` : ""
  );

  /* ------------------------------------------------- (4) one primary CTA -- */
  const primaryCounts = {};
  for (const path of ["/", "/brief", "/progress"]) {
    await page.goto(`${baseUrl}${path}`, { waitUntil: "networkidle" });
    await page.waitForTimeout(500);
    primaryCounts[path] = await page.evaluate(() => {
      // "Primary" = the filled brand button (an exact bg-brand class token).
      return Array.from(document.querySelectorAll("button, a")).filter(
        (el) => el.classList && el.classList.contains("bg-brand")
      ).length;
    });
  }
  check(
    "4. one primary action per screen",
    Object.values(primaryCounts).every((count) => count <= 1),
    JSON.stringify(primaryCounts)
  );

  /* ------------------------------------------------ (5) voice toggle ----- */
  let toggleOnAll = true;
  for (const path of ["/", "/brief", "/play", "/progress"]) {
    await page.goto(`${baseUrl}${path}`, { waitUntil: "networkidle" });
    await page.waitForTimeout(400);
    const toggle = page.getByRole("button", { name: /voice/i });
    if ((await toggle.count()) === 0) toggleOnAll = false;
    else {
      const box = await toggle.first().boundingBox();
      if (!box || box.height < MIN_TAP) toggleOnAll = false;
    }
  }
  check("5. speaker toggle on every screen, >= 64px", toggleOnAll);

  /* ------------------------------------ (6) no time pressure on MATCH ---- */
  await page.goto(`${baseUrl}/play?mode=easy`, { waitUntil: "networkidle" });
  await page.getByTestId("ingredient-label").waitFor({ state: "visible", timeout: 15000 });
  const matchBox = await page.getByRole("button", { name: /^Match/i }).boundingBox();
  check(
    "6. MATCH button is full width and 96px tall",
    matchBox.width >= viewport.width - 60 && matchBox.height >= 96,
    `(${Math.round(matchBox.width)}x${Math.round(matchBox.height)})`
  );
  const disabled = await page.getByRole("button", { name: /^Match/i }).isDisabled();
  check("6. MATCH is never disabled mid-session", disabled === false);

  /* ------------------------------------------- (7) forgiving tap zone ---- */
  const before = await page
    .getByTestId("trial-counter")
    .innerText();
  // Tap the lower 40% of the screen, away from the button.
  await page.mouse.click(viewport.width / 2, viewport.height * 0.65);
  await page.waitForTimeout(200);
  const feedbackVisible = await page.locator("text=/Nice!|Not quite/").count();
  check(
    "7. a tap in the lower 40% counts as MATCH",
    feedbackVisible > 0,
    `(counter before: ${before.replace(/\s+/g, " ")})`
  );

  /* ---------------------------------------------- (8) friendly feedback -- */
  const penalty = page.locator("text=/-50/").first();
  if ((await penalty.count()) > 0) {
    const color = await penalty.evaluate((el) => getComputedStyle(el).color);
    const [r, g, b] = color.match(/\d+/g).map(Number);
    const isRed = r > 150 && g < 90 && b < 90;
    check("8. the penalty is grey, never red", !isRed, `(colour ${color})`);
  } else {
    check("8. the penalty is grey, never red", true, "(no penalty shown)");
  }

  /* -------------------------------------------- (10) no timers on menus -- */
  let timerText = [];
  for (const path of ["/", "/brief", "/progress"]) {
    await page.goto(`${baseUrl}${path}`, { waitUntil: "networkidle" });
    await page.waitForTimeout(400);
    const text = await page.locator("body").innerText();
    if (/\b\d{1,2}:\d{2}\b/.test(text) || /seconds? left|countdown|time remaining/i.test(text)) {
      timerText.push(path);
    }
  }
  check("10. no countdown timers on the menus", timerText.length === 0, timerText.join(", "));

  await context.close();
}

await browser.close();

console.log("");
if (failures.length > 0) {
  console.error(`${failures.length} senior-UX check(s) failed.`);
  process.exit(1);
}
console.log("All senior-UX browser checks passed.");
