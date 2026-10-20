/**
 * End-to-end smoke test: plays one full session in a real browser and checks
 * that the whole loop works (home -> briefing -> gameplay -> summary ->
 * dashboard).
 *
 * Run with: node scripts/smoke-test.mjs [baseUrl]
 */
import { chromium } from "playwright";
import { existsSync, mkdirSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SHOTS = join(__dirname, "..", "screenshots");
const baseUrl = process.argv[2] ?? "http://localhost:3000";

mkdirSync(SHOTS, { recursive: true });

/** Uses a browser that is already in the local Playwright cache, if any. */
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

const failures = [];
function check(name, condition, detail = "") {
  if (condition) {
    console.log(`  PASS  ${name}`);
  } else {
    console.log(`  FAIL  ${name} ${detail}`);
    failures.push(name);
  }
}

const browser = await chromium.launch({
  executablePath: findChromium(),
  args: ["--no-sandbox"],
});
const context = await browser.newContext({
  viewport: { width: 1024, height: 768 },
  deviceScaleFactor: 1,
});
const page = await context.newPage();

const consoleErrors = [];
page.on("console", (message) => {
  if (message.type() === "error") consoleErrors.push(message.text());
});
page.on("pageerror", (error) => consoleErrors.push(String(error)));

console.log(`\nCurry Kitchen — smoke test against ${baseUrl}\n`);

/* ------------------------------------------------------------- home ----- */
await page.goto(baseUrl, { waitUntil: "networkidle" });
check("home page loads", (await page.title()).includes("Curry Kitchen"));
check(
  "home shows the app title",
  await page.getByRole("heading", { name: "Curry Kitchen" }).isVisible()
);
check(
  "home shows the primary CTA",
  await page.getByRole("button", { name: /Start Cooking/i }).isVisible()
);
check(
  "speaker toggle is present and at least 64px tall",
  (await page.getByRole("button", { name: /voice narration/i }).boundingBox()).height >= 64
);
await page.screenshot({ path: join(SHOTS, "01-home.png") });

/* --------------------------------------------------------- briefing ----- */
await page.getByRole("button", { name: /Start Cooking/i }).click();
await page.waitForURL(/\/brief/);
check(
  "briefing explains the rule",
  await page.getByText(/Tap MATCH when you see the same ingredient/i).isVisible()
);
check(
  "briefing has a single primary CTA",
  await page.getByRole("button", { name: /let's cook/i }).isVisible()
);
await page.screenshot({ path: join(SHOTS, "02-briefing.png") });

/* --------------------------------------------------------- gameplay ----- */
await page.getByRole("button", { name: /let's cook/i }).click();
await page.waitForURL(/\/play/);
await page.waitForTimeout(1500);

const matchButton = page.getByRole("button", { name: /^Match/i });
check(
  "MATCH button is visible and at least 64px tall",
  (await matchButton.boundingBox()).height >= 64
);
check(
  "MATCH button is full width",
  (await matchButton.boundingBox()).width >= 900
);
const card = page.locator("main .rounded-\\[2rem\\]").first();
check("an ingredient card is shown", await card.isVisible());
const emoji = await card.locator("span").first().innerText();
check("the card shows an emoji ingredient", emoji.length > 0, `(got "${emoji}")`);
await page.screenshot({ path: join(SHOTS, "03-gameplay.png") });

// Tap MATCH on every card that appears, so the session records a mix of
// hits and misses and produces a realistic score.
const deadline = Date.now() + 150000;
let tapped = 0;
while (Date.now() < deadline) {
  if (page.url().includes("/summary")) break;
  const visible = await card.isVisible().catch(() => false);
  if (visible) {
    await matchButton.click();
    tapped += 1;
  }
  await page.waitForTimeout(400);
}
check("the session played through", tapped >= 10, `(tapped ${tapped} times)`);

await page.waitForURL(/\/summary/, { timeout: 30000 });
await page.waitForTimeout(600);
const brainScoreText = await page
  .getByText("Brain Score")
  .locator("xpath=following-sibling::*[1]")
  .innerText()
  .catch(() => "");
check("the summary shows a Brain Score", /\d+/.test(brainScoreText), `(got "${brainScoreText}")`);
check(
  "the summary offers Play Again",
  await page.getByRole("link", { name: /Play Again/i }).isVisible()
);
await page.screenshot({ path: join(SHOTS, "04-summary.png") });

/* -------------------------------------------------------- dashboard ----- */
await page.getByRole("link", { name: /See Progress/i }).click();
await page.waitForURL(/\/progress/);
await page.waitForTimeout(800);
check(
  "the dashboard shows the Brain Score chart",
  await page.getByRole("heading", { name: "Brain Score" }).isVisible()
);
check(
  "the dashboard shows the accuracy chart",
  await page.getByRole("heading", { name: "Accuracy trend" }).isVisible()
);
check(
  "the dashboard has a PDF export button",
  await page.getByRole("button", { name: /Download PDF report/i }).isVisible()
);
await page.screenshot({ path: join(SHOTS, "05-dashboard.png"), fullPage: true });

/* ------------------------------------------------------- PDF export ------ */
const downloadPromise = page.waitForEvent("download", { timeout: 30000 });
await page.getByRole("button", { name: /Download PDF report/i }).click();
let pdfName = "";
try {
  const download = await downloadPromise;
  pdfName = download.suggestedFilename();
  const pdfPath = join(SHOTS, "report.pdf");
  await download.saveAs(pdfPath);
  const { size } = statSync(pdfPath);
  check("the PDF report downloads", pdfName.endsWith(".pdf") && size > 2000, `(${pdfName}, ${size} bytes)`);
} catch (error) {
  check("the PDF report downloads", false, `(${String(error).slice(0, 80)})`);
}

/* --------------------------------------------------------- offline ------- */
await context.setOffline(true);
let offlineOk = false;
try {
  await page.goto(baseUrl, { waitUntil: "domcontentloaded", timeout: 20000 });
  offlineOk = (await page.getByRole("heading", { name: "Curry Kitchen" }).isVisible());
} catch {
  offlineOk = false;
}
check("the app still loads with the network off", offlineOk);
await context.setOffline(false);

/* --------------------------------------------------------- console ------ */
check(
  "no console errors",
  consoleErrors.length === 0,
  consoleErrors.slice(0, 3).join(" | ")
);

await browser.close();

console.log("");
if (failures.length > 0) {
  console.error(`${failures.length} smoke-test check(s) failed.`);
  process.exit(1);
}
console.log("All smoke-test checks passed.");
