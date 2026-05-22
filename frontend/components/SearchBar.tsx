"use client";

import { FormEvent, PointerEvent, useEffect, useRef, useState } from "react";
import { Loader2, Search, Sparkles } from "lucide-react";

export function SearchBar({ onSearch, loading = false, placeholder = "Ask anything you've ever saved..." }: { onSearch: (query: string) => void; loading?: boolean; placeholder?: string }) {
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        ref.current?.focus();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  function submit(event: FormEvent): void {
    event.preventDefault();
    if (query.trim()) onSearch(query.trim());
  }

  function magnet(event: PointerEvent<HTMLFormElement>): void {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width - 0.5) * 8;
    const y = ((event.clientY - rect.top) / rect.height - 0.5) * 5;
    event.currentTarget.style.setProperty("--mag-x", `${x}px`);
    event.currentTarget.style.setProperty("--mag-y", `${y}px`);
  }

  return (
    <div className="relative">
      <div className="absolute -inset-8 rounded-full bg-indigo-500/20 blur-3xl" />
      <form onPointerMove={magnet} onPointerLeave={(event) => { event.currentTarget.style.setProperty("--mag-x", "0px"); event.currentTarget.style.setProperty("--mag-y", "0px"); }} onSubmit={submit} className={`magnetic glass-panel relative flex w-full items-center gap-3 rounded-xl p-2 text-vault-primary transition duration-300 focus-within:scale-[1.01] focus-within:border-indigo-300/50 focus-within:shadow-[0_0_70px_rgba(99,102,241,0.28)] ${loading ? "animate-[pulseGlow_1.8s_ease-in-out_infinite]" : ""}`}>
        <Search className="ml-4 text-indigo-200" size={24} />
        <input ref={ref} value={query} onChange={(event) => setQuery(event.target.value)} placeholder={placeholder} aria-label={placeholder} className="min-h-16 flex-1 bg-transparent text-lg outline-none placeholder:text-vault-secondary" />
        <button className="magnetic mr-1 flex h-12 w-12 items-center justify-center rounded-lg bg-vault-accent text-white shadow-[0_0_24px_rgba(99,102,241,0.4)] transition hover:scale-105 hover:bg-vault-hover disabled:cursor-wait disabled:opacity-80" disabled={loading} aria-label="Search">
          {loading ? <Loader2 className="animate-spin" size={20} /> : <Sparkles size={20} />}
        </button>
      </form>
    </div>
  );
}
