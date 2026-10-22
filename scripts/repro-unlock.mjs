/**
 * Reproduction of the user report: finished Easy, did not go to Medium.
 *
 * Plays a full Easy session in a fresh browser profile (no seeding) with a
 * configurable perfect-rate, then reports the session accuracy and the Home
 * screen's Medium button state.
 *
 * Usage: node scripts/repro-unlock.mjs [baseUrl] [correctOdds 0..1]
 */
import { chromium } from "playwright";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const baseUrl = process.argv[2] ?? "http://localhost:3000";
const correctOdds = process.argv[3] ? Number(process.argv[3]) : 1;

const cache = join(homedir(), "AppData", "Local", "ms-playwright");
const executablePath = ["chromium-1243/chrome-win64/chrome.exe", "chromium-1234/chrome-win64/chrome.exe"]
  .map((p) => join(cache, p))
  .find((p) => existsSync(p));

const browser = await chromium.launch({ executablePath, args: ["--no-sandbox"] });
const page = await browser.newPage({ viewport: { width: 1024, height: 768 } });

/* Fresh profile: go to home and click through Start Cooking. */
await page.goto(baseUrl, { waitUntil: "networkidle" });
await page.getByRole("button", { name: /Start Cooking/i }).click();

/* Briefing: confirm the rule. */
await page.getByRole("button", { name: /let's cook/i }).click();
await page.goto(`${baseUrl}/play?mode=easy`, { waitUntil: "networkidle" });
await page.waitForTimeout(1500);

const label = page.getByTestId("ingredient-label");
const counter = page.getByTestId("trial-counter");
const matchButton = page.getByRole("button", { name: /Match/i });

const history = [];
let lastTrial = null;
let taps = 0;
const deadline = Date.now() + 180000;

while (Date.now() < deadline && !page.url().includes("/summary")) {
  const counterText = (await counter.textContent().catch(() => null)) ?? "";
  const m = counterText.match(/(\d+)\s*of/);
  const trialNumber = m ? Number(m[1]) : 0;

  if (trialNumber && trialNumber !== lastTrial) {
    lastTrial = trialNumber;
    const text = (await label.textContent().catch(() => null))?.trim() ?? "";
    if (text) {
      history.push(text);
      const behind = history[history.length - 2];
      if (behind !== undefined && behind === text) {
        const willGetItRight = Math.random() < correctOdds;
        if (willGetItRight) {
          await matchButton.click();
          taps += 1;
        }
        /* Missed matches simply no-op; false alarms are not simulated. */
      } else if (Math.random() < (1 - correctOdds) * 0.6) {
        await matchButton.click(); /* false alarm on a non-match */
        taps += 1;
      }
    }
  }
  await page.waitForTimeout(40);
}

const finished = page.url().includes("/summary");
const headline = finished ? await page.getByRole("heading").first().textContent().catch(() => null) : null;
const unlockAnnouncement = finished
  ? await page.getByRole("status").textContent().catch(() => null)
  : null;

const data = await page.evaluate(async () => {
  const db = await new Promise((resolve, reject) => {
    const request = indexedDB.open("curry-nback", 1);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains("sessions")) {
        const store = database.createObjectStore("sessions", { keyPath: "id" });
        store.createIndex("by-startedAt", "startedAt");
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  return new Promise((resolve, reject) => {
    const req = db.transaction("sessions", "readonly").objectStore("sessions").getAll();
    req.onsuccess = () => {
      const all = (req.result ?? []).sort((a, b) => b.startedAt - a.startedAt);
      resolve(all[0] ? { accuracy: all[0].accuracy, mode: all[0].mode } : null);
    };
    req.onerror = () => reject(req.error);
  });
});

/* Read the Home screen the player would see next. */
await page.goto(baseUrl, { waitUntil: "networkidle" });
await page.waitForTimeout(1200);
const pickerText = await page
  .locator("section[aria-labelledby='difficulty-heading']")
  .innerText()
  .catch(() => "(no picker)");
const mediumButton = page.getByRole("button", { name: /Medium/ });
const mediumEnabled = await mediumButton.isEnabled().catch(() => null);
const mediumLabel = await mediumButton.textContent().catch(() => () => "");
const selectedDifficulty = await page
  .locator("button[aria-pressed=true]")
  .textContent()
  .catch(() => null);

console.log("---");
console.log(`odds=${correctOdds}  finished=${finished}  headline=${headline?.trim()}`);
console.log(`summary announcement: ${unlockAnnouncement?.trim() ?? "(none)"}`);
console.log(`session: ${data ? `${data.mode} accuracy=${data.accuracy * 100}%` : "none stored"}`);
console.log(`home: mediumEnabled=${mediumEnabled}  label=${mediumLabel?.trim()}`);
console.log(`home picker says: ${pickerText.replace(/\s+/g, " ")}`);
console.log(`home: selected difficulty=${selectedDifficulty?.trim()}`);

await browser.close();
