"use client";

import { Bell, Check, Download, Eye, FileText, Image, Link, Mic, MoreHorizontal, Pin, Save, Tag, Trash2, Video, X } from "lucide-react";
import { PointerEvent, useEffect, useRef, useState } from "react";
import type { DocumentItem } from "@/lib/api";
import { updateTags } from "@/lib/api";

const icons = { pdf: FileText, audio: Mic, video: Video, image: Image, url: Link, text: FileText };
const colors: Record<string, string> = { pdf: "#6366f1", audio: "#10b981", video: "#14b8a6", image: "#f97316", url: "#f59e0b", text: "#9ca3af" };

function cleanText(value: string): string {
  return (value || "No summary available.").replace(/\bNone\b\s*/gi, "").replace(/\s+/g, " ").trim() || "No summary available.";
}

export function MemoryCard({ document, onDelete, onTagClick, onUpdated }: { document: DocumentItem; onDelete?: (id: string) => void; onTagClick?: (tag: string) => void; onUpdated?: () => void }) {
  const Icon = icons[document.source_type as keyof typeof icons] || FileText;
  const color = colors[document.source_type] || colors.text;
  const cardRef = useRef<HTMLElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [editingTags, setEditingTags] = useState(false);
  const [tagText, setTagText] = useState((document.tags || []).join(", "));
  const ageDays = Math.max(0, (Date.now() - new Date(document.created_at).getTime()) / 86400000);
  const opacity = Math.max(0.7, 1 - ageDays * 0.018);
  const grayscale = Math.min(0.55, ageDays * 0.012);

  useEffect(() => {
    const close = (event: MouseEvent): void => {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    window.addEventListener("mousedown", close);
    return () => window.removeEventListener("mousedown", close);
  }, []);

  function move(event: PointerEvent<HTMLElement>): void {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    event.currentTarget.style.setProperty("--rx", `${((rect.height / 2 - y) / rect.height) * 8}deg`);
    event.currentTarget.style.setProperty("--ry", `${((x - rect.width / 2) / rect.width) * 10}deg`);
    event.currentTarget.style.setProperty("--sx", `${x}px`);
    event.currentTarget.style.setProperty("--sy", `${y}px`);
    event.currentTarget.style.setProperty("--shine", "1");
  }

  function leave(): void {
    const node = cardRef.current;
    if (!node) return;
    node.style.setProperty("--rx", "0deg");
    node.style.setProperty("--ry", "0deg");
    node.style.setProperty("--shine", "0");
  }

  async function saveTags(): Promise<void> {
    await updateTags(document.id, tagText.split(",").map((tag) => tag.trim()).filter(Boolean));
    setEditingTags(false);
    setMenuOpen(false);
    onUpdated?.();
  }

  return (
    <article ref={cardRef} onPointerMove={move} onPointerLeave={leave} className="holo-card group relative overflow-visible rounded-lg border border-white/10 bg-white/[0.055] p-4 text-vault-primary shadow-[0_20px_60px_rgba(0,0,0,0.28)] backdrop-blur-xl transition duration-300 hover:border-white/20 hover:shadow-[0_22px_70px_rgba(99,102,241,0.20)]" style={{ opacity, filter: `grayscale(${grayscale})` }}>
      <div className="absolute inset-y-0 left-0 w-1 rounded-l-lg" style={{ background: color, boxShadow: `0 0 20px ${color}` }} />
      <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-lg opacity-40" style={{ background: `radial-gradient(circle at 0 0, ${color}33, transparent 14rem)` }} />
      <div className="relative flex gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-white" style={{ background: `${color}24`, boxShadow: `0 0 22px ${color}35` }}><Icon size={21} /></div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <h3 className="truncate font-semibold text-white">{document.title || "Untitled Document"}</h3>
            <div ref={menuRef} className="relative">
              <button onClick={() => setMenuOpen((open) => !open)} className="magnetic rounded-md p-1.5 text-vault-secondary opacity-70 transition hover:bg-white/10 hover:text-white group-hover:opacity-100" aria-label="More actions"><MoreHorizontal size={16} /></button>
              {menuOpen && <div className="absolute right-0 top-8 z-50 w-48 rounded-xl border border-white/10 bg-black/90 p-2 shadow-[0_18px_50px_rgba(0,0,0,.45)] backdrop-blur-xl"><Action icon={<Eye size={15} />} label="Preview" onClick={() => setMenuOpen(false)} /><Action icon={<Tag size={15} />} label="Edit tags" onClick={() => setEditingTags(true)} /><Action icon={<Pin size={15} />} label="Pin" onClick={() => setMenuOpen(false)} /><Action icon={<Download size={15} />} label="Export" onClick={() => setMenuOpen(false)} />{onDelete && <Action danger icon={<Trash2 size={15} />} label="Delete" onClick={() => { setMenuOpen(false); if (window.confirm("Delete this memory?")) onDelete(document.id); }} />}</div>}
            </div>
          </div>
          <p className="mono-data mt-1 text-xs text-vault-secondary">{new Date(document.created_at).toLocaleString()} <span className="mx-1">.</span> <span className="rounded-full border border-white/10 bg-white/7 px-2 py-0.5 text-white shadow-[0_0_16px_rgba(255,255,255,0.08)]">{document.chunk_count} chunks</span></p>
          {document.reminder_due_at && <p className={`mono-data mt-2 inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs ${document.reminder_status === "due" ? "border-amber-300/40 bg-amber-300/10 text-amber-200" : "border-indigo-300/20 bg-indigo-300/10 text-indigo-200"}`}><Bell size={13} /> {document.reminder_status}: {new Date(document.reminder_due_at).toLocaleString()}</p>}
          <p className="mt-3 line-clamp-3 text-sm leading-6 text-vault-secondary group-hover:text-zinc-300">{cleanText(document.summary)}</p>
          <div className="mt-3 flex flex-wrap gap-1.5">{(document.tags || []).map((tag) => <button key={tag} onClick={() => onTagClick?.(tag)} className="rounded-full border border-white/10 bg-white/7 px-2 py-1 text-xs text-indigo-100 transition hover:border-indigo-300/50 hover:bg-indigo-400/10">#{tag}</button>)}</div>
        </div>
      </div>
      {editingTags && <div className="absolute inset-x-3 top-3 z-50 rounded-xl border border-white/10 bg-black/90 p-3 shadow-2xl backdrop-blur-xl"><div className="mb-2 flex items-center justify-between"><span className="text-sm font-medium text-white">Edit tags</span><button onClick={() => setEditingTags(false)} className="text-vault-secondary hover:text-white"><X size={16} /></button></div><input value={tagText} onChange={(event) => setTagText(event.target.value)} className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none" /><button onClick={() => void saveTags()} className="mt-2 inline-flex items-center gap-2 rounded-lg bg-vault-accent px-3 py-2 text-sm text-white"><Save size={14} /> Save tags</button></div>}
    </article>
  );
}

function Action({ icon, label, danger = false, onClick }: { icon: React.ReactNode; label: string; danger?: boolean; onClick: () => void }) {
  return <button onClick={onClick} className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition ${danger ? "text-red-300 hover:bg-red-500/10" : "text-vault-secondary hover:bg-white/10 hover:text-white"}`}>{icon}{label}{label === "Preview" && <Check className="ml-auto opacity-0" size={12} />}</button>;
}
