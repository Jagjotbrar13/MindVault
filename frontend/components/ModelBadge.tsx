"use client";

import { Brain, Eye, Zap } from "lucide-react";
import clsx from "clsx";

export function ModelBadge({ model }: { model: string }) {
  const lower = model.toLowerCase();
  const Icon = lower.includes("phi") ? Zap : lower.includes("llava") ? Eye : Brain;
  const color = lower.includes("llama") ? "bg-indigo-500/15 text-indigo-300 border-indigo-500/30" : lower.includes("mistral") ? "bg-purple-500/15 text-purple-300 border-purple-500/30" : lower.includes("phi") ? "bg-teal-500/15 text-teal-300 border-teal-500/30" : "bg-orange-500/15 text-orange-300 border-orange-500/30";
  return <span className={clsx("inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs", color)}><Icon size={13} />{model}</span>;
}
