/*
 * Browser verification for the QA fixes (B-1..B-7) from the
 * curry-kitchen QA report. Run against a local server:
 *
 *   node scripts/qa-fixes.mjs
 */
import { chromium } from "playwright";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";

function findChromium() {
  const cache = join(homedir(), "AppData", "Local", "ms-playwright");
  if (!existsSync(cache)) return undefined;
  const candidates = [
    "chromium-1243/chrome-win64/chrome.exe",
    "chromium-1234/chrome-win64/chrome.exe",
    "chromium-1161/chrome-win/chrome.exe",
  ];
  for (const candidate of candidates) {
    const full = join(cache, candidate);
    if (existsSync(full)) return full;
  }
  return undefined;
}

const results = [];
const check = (name, ok, note = "") => {
  results.push({ name, ok });
  console.log(`${ok ? "  PASS" : "  FAIL"}  ${name}${ok || !note ? "" : ` — ${note}`}`);
};

const browser = await chromium.launch({
  executablePath: findChromium(),
  args: ["--no-sandbox"],
});

async function freshPage(seedUnlock = false) {
  const context = await browser.newContext({ viewport: { width: 1024, height: 768 } });
  await context.addInitScript(
    (seed) => {
      localStorage.removeItem("curry-nback-settings");
      if (seed) {
        localStorage.setItem(
          "curry-nback-settings",
          JSON.stringify({
            state: {
              voiceEnabled: false,
              briefingSeen: true,
              unlockedMode: "hard",
              lastMode: "easy",
            },
            version: 1,
          })
        );
      }
    },
    seedUnlock
  );
  await context.grantPermissions([]);
  return context;
}

/* --- B-2: /summary without ?s= must not dead-end on Loading… ----------- */
{
  const ctx = await freshPage();
  const page = await ctx.newPage();
  await page.goto(`${BASE}/summary`, { waitUntil: "networkidle" });
  const msg = await page.getByText("We could not find that session").isVisible();
  const btn = await page.getByRole("link", { name: "Back to the kitchen" }).isVisible();
  check("B-2 summary without ?s= shows a way out", msg && btn);
  await ctx.close();
}

/* --- B-5/B-4: bogus + locked URLs redirect home ------------------------- */
{
  const ctx = await freshPage();
  const page = await ctx.newPage();
  await page.goto(`${BASE}/play?mode=bogus`, { waitUntil: "domcontentloaded" });
  await page.waitForURL(`${BASE}/`, { timeout: 5000 }).catch(() => {});
  check("B-5 /play?mode=bogus redirects home", page.url() === `${BASE}/`);

  await page.goto(`${BASE}/brief?mode=bogus`, { waitUntil: "domcontentloaded" });
  await page.waitForURL(`${BASE}/`, { timeout: 5000 }).catch(() => {});
  check("B-5 /brief?mode=bogus redirects home", page.url() === `${BASE}/`);

  await page.goto(`${BASE}/brief?mode=hard`, { waitUntil: "domcontentloaded" });
  await page.waitForURL(`${BASE}/`, { timeout: 5000 }).catch(() => {});
  check("B-4 locked /brief?mode=hard redirects home", page.url() === `${BASE}/`);
  await ctx.close();
}

/* --- B-4b: an unlocked mode may stay on /brief -------------------------- */
{
  const ctx = await freshPage(true); // unlockedMode: hard
  const page = await ctx.newPage();
  await page.goto(`${BASE}/brief?mode=medium`, { waitUntil: "networkidle" });
  const still = page.url().includes("/brief");
  const heading = await page.getByText("Easy round — 1-back").or(page.getByText("Medium round — 2-back")).first().isVisible();
  check("B-4 unlocked /brief stays", still && heading);
  await ctx.close();
}

/* --- B-1: easy example strip demonstrates 1-back correctly -------------- */
{
  const ctx = await freshPage();
  const page = await ctx.newPage();
  await page.goto(`${BASE}/brief?mode=easy`, { waitUntil: "networkidle" });
  const emojis = await page.locator('[data-testid="example-strip"] span').allTextContents();
  await ctx.close();
  const stripOk = JSON.stringify(emojis) === JSON.stringify(["🧅", "🍅", "🍅", "🥕"]);
  check("B-1 easy strip is Onion Tomato Tomato Carrot", stripOk, emojis.join(" "));
}

{
  const ctx = await freshPage(true);
  const page = await ctx.newPage();
  await page.goto(`${BASE}/brief?mode=medium`, { waitUntil: "networkidle" });
  const strip = await page.locator('[data-testid="example-strip"]').textContent();
  await ctx.close();
  check("B-1 medium strip keeps Tomato Onion Tomato Carrot", strip?.trim() === "🍅🧅🍅🥕");
}

/* --- B-7: quit control + confirm dialog -------------------------------- */
{
  const ctx = await freshPage();
  const page = await ctx.newPage();
  await page.goto(`${BASE}/play?mode=easy`, { waitUntil: "networkidle" });
  await page.locator('[data-testid="ingredient-emoji"]').waitFor({ timeout: 8000 });

  // B-6: the bar starts above zero and rises.
  const w1 = await page
    .locator('header div.h-2 div')
    .evaluate((el) => el.style.width);
  check("B-6 progress bar shows 4% after the first card", w1 === "4%", w1);

  await page.getByRole("button", { name: "Quit round" }).click();
  const dialog = await page.getByText("Quit this round?").isVisible();
  const keep = await page.getByRole("button", { name: "Keep playing" }).isVisible();
  const quitBtn = await page.getByRole("button", { name: "Quit round" }).nth(1).isVisible();
  check("B-7 quit opens a confirm dialog with two options", dialog && keep && quitBtn);

  // Keep playing resumes the same card (B-3 resume path via dialog).
  await page.getByRole("button", { name: "Keep playing" }).click();
  await page.locator('[data-testid="ingredient-emoji"]').waitFor({ timeout: 8000 });
  check("B-7 Keep playing resumes the round", true);

  // B-3: hidden tab pauses the round behind an overlay.
  await page.evaluate(() => {
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      get: () => "hidden",
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await page.getByText("Round paused").waitFor({ timeout: 5000 });
  check("B-3 hiding the tab pauses the round", true);

  await page.getByRole("button", { name: "Continue cooking" }).click();
  await page.locator('[data-testid="ingredient-emoji"]').waitFor({ timeout: 8000 });
  check("B-3 tapping Continue restarts the current card", true);

  // Exit without saving.
  await page.getByRole("button", { name: "Quit round" }).click();
  await page.getByRole("button", { name: "Quit round" }).nth(1).click();
  await page.waitForURL(`${BASE}/`, { timeout: 5000 }).catch(() => {});
  check("B-7 Quit round returns home", page.url() === `${BASE}/`);
  await ctx.close();
}

await browser.close();

const failed = results.filter((r) => !r.ok);
console.log(failed.length === 0 ? "\nAll QA-fix checks passed." : `\n${failed.length} QA-fix check(s) failed.`);
process.exit(failed.length === 0 ? 0 : 1);
