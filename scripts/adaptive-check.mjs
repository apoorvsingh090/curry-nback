/**
 * Plays a perfect 2-back session in a real browser and verifies that the
 * adaptive engine shortened the display duration by 200ms after five
 * perfect trials (spec §8, Phase 2 acceptance criterion).
 *
 * Run with: node scripts/adaptive-check.mjs [baseUrl]
 */
import { chromium } from "playwright";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const baseUrl = process.argv[2] ?? "http://localhost:3000";
const N = 2;

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
const page = await browser.newPage({ viewport: { width: 1024, height: 768 } });

/* Unlock medium by storing one strong Easy session. */
await page.goto(baseUrl, { waitUntil: "domcontentloaded" });
await page.evaluate(async () => {
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
  const session = {
    id: "unlock-easy",
    startedAt: Date.now() - 86400000,
    endedAt: Date.now() - 86400000 + 180000,
    mode: "easy",
    n: 1,
    trials: [],
    brainScore: 92,
    accuracy: 0.92,
    displayDurationStartMs: 3000,
    displayDurationEndMs: 2800,
    points: 1200,
    matchesCaught: 8,
    adjustments: [],
  };
  await new Promise((resolve, reject) => {
    const tx = db.transaction("sessions", "readwrite");
    tx.objectStore("sessions").put(session);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
});

// Visiting home re-syncs the unlocked levels from the stored sessions.
await page.goto(baseUrl, { waitUntil: "networkidle" });
await page.waitForTimeout(1200);
check(
  "medium is unlocked after a strong Easy session",
  await page.getByRole("button", { name: /^Medium/ }).isEnabled()
);

/* Play a perfect 2-back round. */
await page.goto(`${baseUrl}/play?mode=medium`, { waitUntil: "networkidle" });
await page.waitForTimeout(1200);

const label = page.getByTestId("ingredient-label");
const counter = page.getByTestId("trial-counter");
const matchButton = page.getByRole("button", { name: /^Match/i });

const history = [];
let lastTrial = null;
let seen = 0;
const deadline = Date.now() + 180000;

while (Date.now() < deadline && !page.url().includes("/summary")) {
  const counterText = (await counter.textContent().catch(() => null)) ?? "";
  const trialNumber = Number(counterText.replace(/[^0-9]/g, " ").trim().split(" ")[0]);

  if (trialNumber && trialNumber !== lastTrial) {
    lastTrial = trialNumber;
    const text = (await label.textContent().catch(() => null))?.trim() ?? "";
    if (text) {
      history.push(text);
      seen += 1;

      const behind = history[history.length - 1 - N];
      if (behind !== undefined && behind === text) {
        await matchButton.click();
      }
    }
  }
  await page.waitForTimeout(40);
}

check("the 2-back round finished", page.url().includes("/summary"), `(saw ${seen} cards)`);

/* Inspect the stored session record. */
const session = await page.evaluate(async () => {
  const db = await new Promise((resolve, reject) => {
    const request = indexedDB.open("curry-nback", 1);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  return new Promise((resolve, reject) => {
    const request = db.transaction("sessions", "readonly").objectStore("sessions").getAll();
    request.onsuccess = () => {
      const all = request.result.sort((a, b) => b.startedAt - a.startedAt);
      resolve(all[0]);
    };
    request.onerror = () => reject(request.error);
  });
});

check("a session was stored", Boolean(session));
check("the session is 2-back", session?.n === 2 && session?.mode === "medium");
check(
  "the display duration started at 2500ms",
  session?.displayDurationStartMs === 2500,
  `(got ${session?.displayDurationStartMs})`
);
check(
  "the first adjustment shortened the display by 200ms",
  session?.adjustments?.[0]?.previousDurationMs === 2500 &&
    session?.adjustments?.[0]?.newDurationMs === 2300 &&
    session?.adjustments?.[0]?.direction === "faster",
  `(got ${JSON.stringify(session?.adjustments?.[0])})`
);
check(
  "trials 6-10 use the shortened duration",
  session?.trials
    ?.filter((t) => t.index >= 5 && t.index < 10)
    .every((t) => t.displayDurationMs === 2300),
  `(got ${session?.trials?.filter((t) => t.index >= 5 && t.index < 10).map((t) => t.displayDurationMs).join(", ")})`
);
check(
  "every 5-trial block shortened the duration again",
  session?.adjustments?.length === 5 &&
    session.adjustments.every(
      (a, index) => a.newDurationMs === 2500 - 200 * (index + 1)
    ),
  `(got ${session?.adjustments?.map((a) => `${a.previousDurationMs}->${a.newDurationMs}`).join(", ")})`
);
check(
  "the session ended at 1500ms after five perfect blocks",
  session?.displayDurationEndMs === 1500,
  `(got ${session?.displayDurationEndMs})`
);
check(
  "a perfect round scored 100% accuracy",
  session?.accuracy === 1,
  `(got ${session?.accuracy})`
);

await browser.close();

console.log("");
if (failures.length > 0) {
  console.error(`${failures.length} adaptive-engine check(s) failed.`);
  process.exit(1);
}
console.log("All adaptive-engine checks passed.");
