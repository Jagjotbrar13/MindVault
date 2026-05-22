"use client";

import { useEffect, useState } from "react";
import { UploadZone } from "@/components/UploadZone";
import { deleteDocument, getDocuments, type DocumentItem, type IngestResult } from "@/lib/api";
import { MemoryCard } from "@/components/MemoryCard";
import { EmptyState } from "@/components/EmptyState";

export default function UploadPage() {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [result, setResult] = useState<IngestResult | null>(null);
  const load = (): void => { void getDocuments().then(setDocuments).catch(() => setDocuments([])); };
  useEffect(load, []);
  async function remove(id: string): Promise<void> { await deleteDocument(id); load(); }
  return <div className="mx-auto max-w-5xl space-y-6"><UploadZone onComplete={(res) => { setResult(res); load(); }} />{result && <div className="glass-panel rounded-xl border-emerald-500/30 p-4 text-emerald-300">Saved {result.title} with <span className="mono-data">{result.chunks_stored}</span> chunks.<div className="mt-2 flex flex-wrap gap-2">{result.tags.map((tag) => <span key={tag} className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-2 py-1 text-xs">#{tag}</span>)}</div>{result.reminder_due_at && <p className="mono-data mt-2 text-xs">Reminder set for {new Date(result.reminder_due_at).toLocaleString()} · {result.reminder_frequency}</p>}</div>}<section className="space-y-4"><h1 className="gradient-heading text-xl font-semibold">Uploaded documents</h1>{documents.map((doc) => <MemoryCard key={doc.id} document={doc} onDelete={(id) => void remove(id)} onUpdated={load} />)}{documents.length === 0 && <EmptyState title="Drop your first memory" detail="Upload a file, paste text, or save a URL. MindVault will chunk it, embed it, tag it, and light up the graph." />}</section></div>;
}
