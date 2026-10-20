/**
 * Seeds IndexedDB with fake sessions and prints the dashboard text, so the
 * 0 / 1 / many-session states can be inspected without playing real rounds.
 *
 * Run with: node scripts/seed-sessions.mjs [baseUrl] [count]
 */
import { chromium } from "playwright";
import { homedir } from "node:os";
import { join } from "node:path";
import { existsSync } from "node:fs";

const baseUrl = process.argv[2] ?? "http://localhost:3000";
const count = Number(process.argv[3] ?? 3);

const cache = join(homedir(), "AppData", "Local", "ms-playwright");
const executablePath = ["chromium-1243/chrome-win64/chrome.exe", "chromium-1234/chrome-win64/chrome.exe"]
  .map((p) => join(cache, p))
  .find((p) => existsSync(p));

const browser = await chromium.launch({ executablePath, args: ["--no-sandbox"] });
const page = await browser.newPage({ viewport: { width: 1024, height: 768 } });

await page.goto(baseUrl, { waitUntil: "domcontentloaded" });

await page.evaluate(async (sessionCount) => {
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

  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;
  const modes = ["easy", "medium", "hard"];
  const sessions = Array.from({ length: sessionCount }, (_, index) => {
    const accuracy = 0.55 + ((index * 7) % 40) / 100;
    const mode = modes[Math.min(modes.length - 1, Math.floor(index / 3))];
    const n = mode === "easy" ? 1 : mode === "medium" ? 2 : 3;
    const startedAt = now - (sessionCount - index) * day;
    return {
      id: `seed-${index}`,
      startedAt,
      endedAt: startedAt + 180000,
      mode,
      n,
      trials: [],
      brainScore: Math.round(accuracy * 100),
      accuracy,
      displayDurationStartMs: 3000,
      displayDurationEndMs: 2600,
      points: 1200,
      matchesCaught: 7,
      adjustments: [],
    };
  });

  await new Promise((resolve, reject) => {
    const tx = db.transaction("sessions", "readwrite");
    const store = tx.objectStore("sessions");
    sessions.forEach((session) => store.put(session));
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}, count);

await page.goto(`${baseUrl}/progress`, { waitUntil: "networkidle" });
await page.waitForTimeout(1200);
console.log(await page.locator("main").innerText());

await page.screenshot({ path: join("screenshots", "06-dashboard-seeded.png"), fullPage: true });
await browser.close();
