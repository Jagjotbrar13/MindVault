"use client";

import { Check, Copy, X } from "lucide-react";
import { useMemo, useState } from "react";
import type { QueryResult, SourceChunk } from "@/lib/api";
import { ModelBadge } from "./ModelBadge";

type AnswerObject = {
  answer?: string;
  summary?: string;
  response?: string;
  content?: string;
  refined_answer?: string;
  "Lab 1 Summary"?: string;
};

const answerKeys: (keyof AnswerObject)[] = ["answer", "summary", "response", "content", "refined_answer", "Lab 1 Summary"];

function isAnswerObject(value: object | null): value is AnswerObject {
  if (value === null) return false;
  const candidate = value as AnswerObject;
  return answerKeys.some((key) => typeof candidate[key] === "string");
}

function cleanAnswer(answer: string): string {
  const text = (answer || "").trim();
  if (!text) return "";
  if (text.startsWith("{") || text.startsWith("[")) {
    try {
      const parsed = JSON.parse(text) as object | null;
      if (isAnswerObject(parsed)) return answerKeys.map((key) => parsed[key]).find((value): value is string => typeof value === "string") || text;
    } catch {
      return text;
    }
  }
  return text;
}

function renderInline(line: string): React.ReactNode[] {
  return line.split(/(`[^`]+`|\*\*[^*]+\*\*)/g).map((part, index) => {
    if (part.startsWith("`") && part.endsWith("`")) return <code key={index} className="rounded bg-white/10 px-1.5 py-0.5 mono-data text-indigo-100">{part.slice(1, -1)}</code>;
    if (part.startsWith("**") && part.endsWith("**")) return <strong key={index} className="text-white">{part.slice(2, -2)}</strong>;
    return part;
  });
}

function MarkdownLite({ text }: { text: string }) {
  return (
    <div className="space-y-2 leading-7 text-zinc-100">
      {text.split("\n").map((line, index) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={index} className="h-2" />;
        if (/^#{1,3}\s/.test(trimmed)) return <h3 key={index} className="gradient-heading mt-4 text-lg font-semibold">{trimmed.replace(/^#{1,3}\s/, "")}</h3>;
        if (/^[-*]\s/.test(trimmed)) return <p key={index} className="pl-4 text-vault-secondary"><span className="mr-2 text-indigo-300">•</span>{renderInline(trimmed.replace(/^[-*]\s/, ""))}</p>;
        if (/^\d+\.\s/.test(trimmed)) return <p key={index} className="pl-4 text-vault-secondary">{renderInline(trimmed)}</p>;
        return <p key={index}>{renderInline(trimmed)}</p>;
      })}
    </div>
  );
}

export function AnswerStream({ answer, metadata, loading, error }: { answer: string; metadata: QueryResult | null; loading: boolean; error?: string }) {
  const [copied, setCopied] = useState(false);
  const [preview, setPreview] = useState<SourceChunk | null>(null);
  const displayAnswer = useMemo(() => cleanAnswer(answer || metadata?.answer || ""), [answer, metadata]);
  const confidence = metadata?.confidence ?? 0;
  const label = confidence > 0.8 ? "High confidence" : confidence >= 0.5 ? "Medium confidence" : "Low confidence - verify sources";
  const segments = Math.round(confidence * 10);
  const chunks = metadata?.source_chunks || [];
  if (!displayAnswer && !loading && !error) return null;

  async function copy(): Promise<void> {
    await navigator.clipboard.writeText(displayAnswer);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  }

  return (
    <section className="glass-panel relative rounded-xl p-5 text-vault-primary">
      {error && <p className="mb-3 text-red-300">{error}</p>}
      {loading && !displayAnswer && <div className="space-y-3"><div className="scan-skeleton h-5 w-11/12 rounded" /><div className="scan-skeleton h-5 w-9/12 rounded" /><div className="scan-skeleton h-5 w-7/12 rounded" /></div>}
      {displayAnswer && <MarkdownLite text={displayAnswer} />}
      {loading && <span className="ml-1 animate-pulse text-indigo-200">|</span>}
      {displayAnswer && <button onClick={() => void copy()} className="magnetic absolute right-4 top-4 rounded-lg border border-white/10 bg-white/7 p-2 text-vault-secondary hover:text-white focus-visible:ring-2 focus-visible:ring-indigo-500" aria-label="Copy answer">{copied ? <Check size={17} /> : <Copy size={17} />}</button>}
      {metadata && (
        <div className="mt-5 space-y-4 border-t border-white/10 pt-4">
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full border border-white/10 bg-white/7 px-3 py-1 text-xs text-white">{label}</span>
            <span className="mono-data text-xs text-vault-secondary">{Array.from({ length: 10 }).map((_, index) => <span key={index} className={index < segments ? "text-indigo-300" : "text-white/15"}>¦</span>)} {Math.round(confidence * 100)}%</span>
            <ModelBadge model={metadata.model_used} />
          </div>
          <div className="flex flex-wrap gap-2">
            {(chunks.length ? chunks : metadata.sources.map((source, index) => ({ title: source, chunk: "Preview unavailable for this source.", chunk_index: index, source_type: "text", score: 0 }))).map((source) => <button key={`${source.title}-${source.chunk_index}`} onClick={() => setPreview(source)} className="magnetic mono-data rounded-full border border-white/10 bg-white/7 px-2 py-1 text-xs text-vault-secondary hover:border-indigo-300/40 hover:text-white">{source.title}</button>)}
          </div>
        </div>
      )}
      {preview && <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md border-l border-white/10 bg-black/75 p-5 shadow-[0_0_80px_rgba(99,102,241,0.18)] backdrop-blur-2xl"><button onClick={() => setPreview(null)} className="absolute right-4 top-4 rounded-lg p-2 text-vault-secondary hover:bg-white/10 hover:text-white" aria-label="Close source preview"><X size={18} /></button><h3 className="gradient-heading pr-10 text-lg font-semibold">{preview.title}</h3><p className="mono-data mt-2 text-xs text-vault-secondary">Chunk {preview.chunk_index + 1} · {preview.source_type} · score {preview.score.toFixed(2)}</p><div className="mt-5 rounded-lg border border-white/10 bg-white/5 p-4 text-sm leading-7 text-zinc-200">{preview.chunk}</div></div>}
    </section>
  );
}

