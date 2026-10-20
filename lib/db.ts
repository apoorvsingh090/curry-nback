import { openDB, type IDBPDatabase } from "idb";
import type { Session } from "./types";

const DB_NAME = "curry-nback";
const DB_VERSION = 1;
const SESSION_STORE = "sessions";

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDb(): Promise<IDBPDatabase> {
  if (typeof window === "undefined" || typeof indexedDB === "undefined") {
    return Promise.reject(new Error("IndexedDB is not available in this environment"));
  }
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(SESSION_STORE)) {
          const store = db.createObjectStore(SESSION_STORE, { keyPath: "id" });
          store.createIndex("by-startedAt", "startedAt");
        }
      },
    });
  }
  return dbPromise;
}

export async function saveSession(session: Session): Promise<void> {
  const db = await getDb();
  await db.put(SESSION_STORE, session);
}

export async function getSession(id: string): Promise<Session | undefined> {
  const db = await getDb();
  return db.get(SESSION_STORE, id);
}

export async function getAllSessions(): Promise<Session[]> {
  const db = await getDb();
  const sessions = (await db.getAll(SESSION_STORE)) as Session[];
  return sessions.sort((a, b) => b.startedAt - a.startedAt);
}

/** Oldest → newest, used for charts. */
export async function getSessionsChronological(): Promise<Session[]> {
  const sessions = await getAllSessions();
  return [...sessions].reverse();
}

export async function getSessionCount(): Promise<number> {
  const db = await getDb();
  return db.count(SESSION_STORE);
}

export async function clearSessions(): Promise<void> {
  const db = await getDb();
  await db.clear(SESSION_STORE);
}
