"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnswerStream } from "@/components/AnswerStream";
import { DigestPanel } from "@/components/DigestPanel";
import { EmptyState } from "@/components/EmptyState";
import { MemoryCard } from "@/components/MemoryCard";
import { ReminderCenter } from "@/components/ReminderCenter";
import { SearchBar } from "@/components/SearchBar";
import { StatCard } from "@/components/StatCard";
import { getHealth, getMemory, query as httpQuery, type DocumentItem, type HealthStatus, type QueryResult } from "@/lib/api";
import { WebSocketClient } from "@/lib/websocket";

export default function HomePage() {
  const [answer, setAnswer] = useState("");
  const [metadata, setMetadata] = useState<QueryResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [wsState, setWsState] = useState<"connecting" | "connected" | "disconnected" | "error">("connecting");
  const ws = useMemo(() => new WebSocketClient(), []);
  const activeQuery = useRef("");
  const recoveryStarted = useRef(false);

  const load = (): void => { void getMemory().then(setDocuments).catch(() => setDocuments([])); void getHealth().then(setHealth).catch(() => setHealth(null)); };

  useEffect(() => {
    load();
    ws.connect();
    const unsubToken = ws.onToken((token) => setAnswer((current) => current + token));
    const unsubDone = ws.onDone((result) => { setMetadata(result); setLoading(false); activeQuery.current = ""; recoveryStarted.current = false; });
    const unsubError = ws.onError((message, recoverable) => {
      if (recoverable) { if (activeQuery.current && !recoveryStarted.current) void runHttpRecovery(activeQuery.current); return; }
      setError(message); setLoading(false);
    });
    const unsubState = ws.onState(setWsState);
    return () => { unsubToken(); unsubDone(); unsubError(); unsubState(); ws.disconnect(); };
  }, [ws]);

  useEffect(() => { document.body.classList.toggle("query-active", loading); return () => document.body.classList.remove("query-active"); }, [loading]);

  async function runHttpRecovery(queryText: string): Promise<void> {
    recoveryStarted.current = true;
    try { const result = await httpQuery(queryText); setAnswer(result.answer); setMetadata(result); } catch (caught) { setError(caught instanceof Error ? caught.message : "Query failed."); } finally { setLoading(false); activeQuery.current = ""; }
  }

  async function search(queryText: string): Promise<void> {
    setAnswer(""); setMetadata(null); setError(""); setLoading(true); activeQuery.current = queryText; recoveryStarted.current = false;
    if (!ws.send(queryText)) await runHttpRecovery(queryText);
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <section className="grid gap-3 md:grid-cols-3"><StatCard label="Documents" value={health?.documents ?? 0} /><StatCard label="Queries" value={health?.queries ?? 0} /><StatCard label="Graph connections" value={health?.connections ?? 0} /></section>
      <ReminderCenter onChanged={load} />
      <DigestPanel />
      <section className="pt-2"><div className="mb-5 flex items-end justify-between gap-4"><div><h1 className="gradient-heading text-4xl font-semibold">MindVault</h1><p className="mt-2 text-vault-secondary">Search across everything you have saved locally.</p></div><span className={`mono-data rounded-full border px-3 py-1 text-xs ${wsState === "connected" ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-300" : "border-amber-400/20 bg-amber-400/10 text-amber-300"}`}>WS: {wsState}</span></div><SearchBar onSearch={(q) => void search(q)} loading={loading} /></section>
      <AnswerStream answer={answer} metadata={metadata} loading={loading} error={error} />
      <section><h2 className="gradient-heading mb-3 text-lg font-semibold">Recent memories</h2><div className="grid gap-4 md:grid-cols-3">{documents.slice(0, 3).map((doc) => <MemoryCard key={doc.id} document={doc} onUpdated={load} />)}{documents.length === 0 && <div className="md:col-span-3"><EmptyState title="Drop your first memory" detail="Upload a note, PDF, image, URL, or recording and MindVault will start forming your local knowledge map." /></div>}</div></section>
    </div>
  );
}

