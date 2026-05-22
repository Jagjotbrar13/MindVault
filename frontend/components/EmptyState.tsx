"use client";

import { UploadCloud } from "lucide-react";

export function EmptyState({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="glass-panel flex min-h-44 flex-col items-center justify-center rounded-md p-6 text-center">
      <div className="mb-4 rounded-full border border-indigo-400/30 bg-indigo-500/10 p-4 text-indigo-300 shadow-[0_0_42px_rgba(99,102,241,0.28)]" style={{ animation: "pulse-node 2s ease-in-out infinite" }}>
        <UploadCloud size={28} />
      </div>
      <h3 className="text-lg font-semibold text-white">{title}</h3>
      <p className="mt-2 max-w-sm text-sm leading-6 text-vault-secondary">{detail}</p>
    </div>
  );
}
