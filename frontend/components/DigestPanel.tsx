"use client";

import { Check, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { getDigest, markDigestRead, type Digest } from "@/lib/api";

export function DigestPanel() {
  const [period, setPeriod] = useState<"daily" | "weekly">("daily");
  const [digest, setDigest] = useState<Digest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    void getDigest(period).then((data) => { setDigest(data); setError(""); }).catch((caught: Error) => setError(caught.message)).finally(() => setLoading(false));
  }, [period]);

  async function read(): Promise<void> {
    await markDigestRead(period);
    setDigest((current) => current ? { ...current, is_new: false } : current);
  }

  return (
    <section className="glass-panel rounded-xl p-5">
      <div className="mb-4 flex items-center justify-between gap-3"><div className="flex items-center gap-2"><Sparkles className="text-indigo-200" size={18} /><h2 className="gradient-heading font-semibold">AI Reflection</h2>{digest?.is_new && <span className="rounded-full bg-indigo-400/20 px-2 py-0.5 text-xs text-indigo-100">new</span>}</div><div className="rounded-lg border border-white/10 bg-black/20 p-1"><button onClick={() => setPeriod("daily")} className={`rounded-md px-3 py-1 text-xs ${period === "daily" ? "bg-vault-accent text-white" : "text-vault-secondary"}`}>Daily</button><button onClick={() => setPeriod("weekly")} className={`rounded-md px-3 py-1 text-xs ${period === "weekly" ? "bg-vault-accent text-white" : "text-vault-secondary"}`}>Weekly</button></div></div>
      {loading && <div className="space-y-2"><div className="scan-skeleton h-4 w-11/12 rounded" /><div className="scan-skeleton h-4 w-10/12 rounded" /><div className="scan-skeleton h-4 w-8/12 rounded" /></div>}
      {error && <p className="text-sm text-red-300">{error}</p>}
      {digest && !loading && <><ul className="space-y-2 text-sm leading-6 text-vault-secondary">{digest.bullets.map((item) => <li key={item} className="flex gap-2"><span className="text-indigo-300">•</span><span>{item}</span></li>)}</ul><p className="mt-4 rounded-lg border border-indigo-300/20 bg-indigo-300/10 p-3 text-sm text-indigo-100">{digest.suggested_action}</p><button onClick={() => void read()} className="magnetic mt-4 inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/7 px-3 py-2 text-sm text-vault-secondary hover:text-white"><Check size={15} /> Mark as read</button></>}
    </section>
  );
}
