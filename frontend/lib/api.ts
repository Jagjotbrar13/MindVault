export type {
  Digest,
  DocumentItem,
  GraphData,
  GraphLink,
  GraphNode,
  HealthStatus,
  IngestInput,
  IngestResult,
  QueryResult,
  ReminderFrequency,
  SourceChunk,
  TagSummary,
} from "./types";

import type { Digest, DocumentItem, GraphData, HealthStatus, IngestInput, IngestResult, QueryResult, TagSummary } from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, init);
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail || response.statusText);
  }
  return response.json() as Promise<T>;
}

function appendIngestOptions(form: FormData, options?: IngestInput): void {
  if (!options) return;
  if (options.title) form.append("title", options.title);
  if (options.tags?.length) form.append("tags", options.tags.join(","));
  if (options.reminder_due_at) form.append("reminder_due_at", options.reminder_due_at);
  if (options.reminder_frequency) form.append("reminder_frequency", options.reminder_frequency);
}

export function ingestFile(file: File, options?: IngestInput): Promise<IngestResult> {
  const form = new FormData();
  form.append("file", file);
  appendIngestOptions(form, options);
  return request<IngestResult>("/ingest", { method: "POST", body: form });
}

export function ingestURL(url: string, options?: IngestInput): Promise<IngestResult> {
  const form = new FormData();
  form.append("url", url);
  appendIngestOptions(form, options);
  return request<IngestResult>("/ingest", { method: "POST", body: form });
}

export function ingestText(text: string, options: IngestInput & { title: string }): Promise<IngestResult> {
  const form = new FormData();
  form.append("text", text);
  appendIngestOptions(form, options);
  return request<IngestResult>("/ingest", { method: "POST", body: form });
}

export const getDocuments = (): Promise<DocumentItem[]> => request<DocumentItem[]>("/ingest/documents");
export const deleteDocument = async (id: string): Promise<void> => { await request<{ deleted: boolean }>(`/ingest/${id}`, { method: "DELETE" }); };
export const query = (q: string): Promise<QueryResult> => request<QueryResult>("/query", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ query: q }) });
export const getGraph = (): Promise<GraphData> => request<GraphData>("/graph");
export const getMemory = (): Promise<DocumentItem[]> => request<DocumentItem[]>("/memory");
export const getHealth = (): Promise<HealthStatus> => request<HealthStatus>("/health");
export const getTags = (): Promise<TagSummary[]> => request<TagSummary[]>("/memory/tags");
export const updateTags = (id: string, tags: string[]): Promise<DocumentItem> => request<DocumentItem>(`/memory/${id}/tags`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tags }) });
export const getDueReminders = (): Promise<DocumentItem[]> => request<DocumentItem[]>("/memory/reminders/due");
export const dismissReminder = (id: string): Promise<DocumentItem> => request<DocumentItem>(`/memory/${id}/reminder/dismiss`, { method: "POST" });
export const completeReminder = (id: string): Promise<DocumentItem> => request<DocumentItem>(`/memory/${id}/reminder/complete`, { method: "POST" });
export const getDigest = (period: "daily" | "weekly"): Promise<Digest> => request<Digest>(`/memory/digest?period=${period}`);
export const markDigestRead = (period: "daily" | "weekly"): Promise<{ ok: boolean }> => request<{ ok: boolean }>("/memory/digest/read", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ period }) });
