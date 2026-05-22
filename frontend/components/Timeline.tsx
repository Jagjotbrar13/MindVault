"use client";

import type { DocumentItem } from "@/lib/api";
import { MemoryCard } from "./MemoryCard";

function groupLabel(date: Date): string {
  const today = new Date();
  const diff = today.getTime() - date.getTime();
  if (diff < 86400000 && today.getDate() === date.getDate()) return "Today";
  if (diff < 172800000) return "Yesterday";
  if (diff < 604800000) return "This Week";
  return "Earlier";
}

export function Timeline({ documents, onDelete, onTagClick, onUpdated }: { documents: DocumentItem[]; onDelete: (id: string) => void; onTagClick?: (tag: string) => void; onUpdated?: () => void }) {
  const groups = documents.reduce<Record<string, DocumentItem[]>>((acc, doc) => {
    const reminderLabel = doc.reminder_due_at && doc.reminder_status !== "none" ? "Reminders" : null;
    const label = reminderLabel || groupLabel(new Date(doc.created_at));
    acc[label] = [...(acc[label] || []), doc];
    return acc;
  }, {});
  return <div className="space-y-8">{Object.entries(groups).map(([label, docs]) => <section key={label}><h2 className="gradient-heading mb-3 text-sm font-semibold">{label}</h2><div className="space-y-4 border-l border-white/10 pl-4">{docs.map((doc) => <MemoryCard key={doc.id} document={doc} onDelete={onDelete} onTagClick={onTagClick} onUpdated={onUpdated} />)}</div></section>)}</div>;
}
