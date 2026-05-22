export type ReminderFrequency = "once" | "daily" | "weekly";
type ReminderStatus = "none" | "scheduled" | "due" | "dismissed" | "complete";

export type DocumentItem = {
  id: string;
  title: string;
  source_type: string;
  file_path: string;
  url: string;
  summary: string;
  created_at: string;
  chunk_count: number;
  metadata?: string;
  tags: string[];
  reminder_due_at?: string | null;
  reminder_frequency?: ReminderFrequency | null;
  reminder_status?: ReminderStatus;
  reminder_completed_at?: string | null;
};

export type IngestInput = {
  title?: string;
  tags?: string[];
  reminder_due_at?: string;
  reminder_frequency?: ReminderFrequency;
};

export type IngestResult = {
  document_id: string;
  chunks_stored: number;
  source_type: string;
  title: string;
  summary: string;
  tags: string[];
  suggested_tags: string[];
  reminder_due_at?: string | null;
  reminder_frequency?: ReminderFrequency | null;
};

export type SourceChunk = {
  title: string;
  chunk: string;
  chunk_index: number;
  source_type: string;
  score: number;
};

export type QueryResult = {
  answer: string;
  confidence: number;
  model_used: string;
  sources: string[];
  source_chunks?: SourceChunk[];
  query_type: string;
  issues: string[];
};

export type HealthStatus = {
  status: string;
  ollama: boolean;
  documents: number;
  queries: number;
  connections: number;
  models: string[];
};

export type GraphNode = {
  id: string;
  title: string;
  type: string;
  summary?: string;
  chunk_count?: number;
  created_at?: string;
  tags?: string[];
};

export type GraphLink = { source: string; target: string; weight: number };
export type GraphData = { nodes: GraphNode[]; links: GraphLink[] };
export type TagSummary = { tag: string; count: number };
export type Digest = { period: "daily" | "weekly"; generated_at: string; bullets: string[]; suggested_action: string; is_new: boolean };
