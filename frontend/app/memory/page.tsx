"use client";

import { Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { EmptyState } from "@/components/EmptyState";
import { Timeline } from "@/components/Timeline";
import { deleteDocument, getMemory, getTags, type DocumentItem, type TagSummary } from "@/lib/api";

const filters = ["All", "PDF", "Audio", "Video", "Image", "URL", "Text"];

export default function MemoryPage() {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [tags, setTags] = useState<TagSummary[]>([]);
  const [filter, setFilter] = useState("All");
  const [activeTag, setActiveTag] = useState("");
  const [search, setSearch] = useState("");

  const load = (): void => {
    void getMemory().then(setDocuments).catch(() => setDocuments([]));
    void getTags().then(setTags).catch(() => setTags([]));
  };

  useEffect(load, []);

  const visible = useMemo(
    () => documents.filter((doc) => {
      const matchesType = filter === "All" || doc.source_type === filter.toLowerCase();
      const matchesTag = !activeTag || doc.tags?.includes(activeTag);
      const haystack = `${doc.title} ${doc.summary} ${(doc.tags || []).join(" ")}`.toLowerCase();
      return matchesType && matchesTag && haystack.includes(search.toLowerCase());
    }),
    [documents, filter, activeTag, search],
  );

  async function remove(id: string): Promise<void> {
    await deleteDocument(id);
    load();
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <h1 className="gradient-heading text-3xl font-semibold">Memory Timeline</h1>
      <div className="glass-panel flex flex-wrap items-center gap-2 rounded-xl p-3">
        {filters.map((item) => (
          <button
            key={item}
            onClick={() => setFilter(item)}
            className={`magnetic rounded-lg px-3 py-2 text-sm transition hover:-translate-y-0.5 ${filter === item ? "bg-vault-accent text-white" : "bg-white/5 text-vault-secondary hover:bg-white/10"}`}
          >
            {item}
          </button>
        ))}
        <div className="ml-auto flex min-w-64 items-center gap-2 rounded-lg border border-white/10 bg-black/20 px-3 py-2">
          <Search size={16} className="text-vault-secondary" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search your memories..."
            aria-label="Search your memories"
            className="w-full bg-transparent text-sm outline-none placeholder:text-vault-secondary"
          />
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {tags.map(({ tag, count }) => (
          <button
            key={tag}
            onClick={() => setActiveTag(activeTag === tag ? "" : tag)}
            className={`rounded-full border px-3 py-1 text-xs transition ${activeTag === tag ? "border-indigo-300/50 bg-indigo-400/20 text-white" : "border-white/10 bg-white/7 text-vault-secondary hover:text-white"}`}
          >
            #{tag} <span className="mono-data">{count}</span>
          </button>
        ))}
      </div>
      {visible.length ? (
        <Timeline documents={visible} onDelete={(id) => void remove(id)} onTagClick={setActiveTag} onUpdated={load} />
      ) : (
        <EmptyState
          title={documents.length ? "No matching memories" : "Drop your first memory"}
          detail={documents.length ? "Try a different title, tag, type filter, or upload a related document." : "Your timeline will fill with cards that age, glow, and connect as you add documents."}
        />
      )}
    </div>
  );
}
