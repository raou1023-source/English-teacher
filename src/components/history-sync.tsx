import { useEffect, useRef } from "react";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { listCloudSessions, pushCloudSessions } from "@/lib/history-api";
import { useFolio } from "@/lib/store";

export function HistorySync() {
  const { user, isPending } = useCurrentUserState();
  const sessions = useFolio((s) => s.sessions);
  const speakTurns = useFolio((s) => s.speakTurns);
  const mergeRemoteSessions = useFolio((s) => s.mergeRemoteSessions);
  const pulled = useRef(false);

  useEffect(() => {
    pulled.current = false;
  }, [user?.id]);

  useEffect(() => {
    if (isPending || !user) return;
    if (pulled.current) return;
    pulled.current = true;
    void listCloudSessions()
      .then((remote) => mergeRemoteSessions(remote))
      .catch(() => {
        pulled.current = false;
      });
  }, [isPending, user, mergeRemoteSessions]);

  useEffect(() => {
    if (isPending || !user) return;
    const timer = window.setTimeout(() => {
      const snapshot = useFolio.getState().sessions;
      if (!snapshot.length) return;
      void pushCloudSessions({ data: { sessions: snapshot } }).catch(() => undefined);
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [sessions, speakTurns, isPending, user]);

  return null;
}
