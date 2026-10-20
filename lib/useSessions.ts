"use client";

import { useCallback, useEffect, useState } from "react";
import { getAllSessions } from "./db";
import type { Session } from "./types";

/**
 * Loads the session history from IndexedDB. Runs on the client only.
 */
export function useSessions() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const loaded = await getAllSessions();
      setSessions(loaded);
    } catch {
      setSessions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { sessions, loading, refresh };
}
