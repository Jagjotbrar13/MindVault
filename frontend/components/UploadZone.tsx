"use client";

import { ChangeEvent, DragEvent, FormEvent, useMemo, useState } from "react";
import { Bell, FileAudio, FileImage, FileText, FileUp, Link, Sparkles, Tag, Type, Video, type LucideIcon } from "lucide-react";
import { ingestFile, ingestText, ingestURL, type IngestInput, type IngestResult, type ReminderFrequency } from "@/lib/api";

export function UploadZone({ onComplete }: { onComplete: (result: IngestResult) => void }) {
  const modes: { name: "file" | "url" | "text"; Icon: LucideIcon }[] = [{ name: "file", Icon: FileUp }, { name: "url", Icon: Link }, { name: "text", Icon: Type }];
  const [mode, setMode] = useState<"file" | "url" | "text">("file");
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [burst, setBurst] = useState(false);
  const [error, setError] = useState("");
  const [value, setValue] = useState("");
  const [title, setTitle] = useState("");
  const [tagText, setTagText] = useState("");
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderDue, setReminderDue] = useState("");
  const [frequency, setFrequency] = useState<ReminderFrequency>("once");

  const options = useMemo<IngestInput>(() => {
    const tags = tagText.split(",").map((tag) => tag.trim()).filter(Boolean);
    const payload: IngestInput = { tags };
    if (title.trim()) payload.title = title.trim();
    if (reminderEnabled && reminderDue) {
      payload.reminder_due_at = new Date(reminderDue).toISOString();
      payload.reminder_frequency = frequency;
    }
    return payload;
  }, [title, tagText, reminderEnabled, reminderDue, frequency]);

  async function run(task: Promise<IngestResult>): Promise<void> {
    setBusy(true); setError(""); setBurst(false);
    try {
      const result = await task;
      onComplete(result);
      setValue(""); setTitle(""); setTagText(""); setReminderEnabled(false); setReminderDue("");
      setBurst(true); window.setTimeout(() => setBurst(false), 950);
    } catch (exc) { setError(exc instanceof Error ? exc.message : "Upload failed."); } finally { setBusy(false); }
  }
  function onFile(file?: File): void {
    if (!file) return;
    if (file.size > 100 * 1024 * 1024) { setError("File exceeds 100MB."); return; }
    void run(ingestFile(file, options));
  }
  function drop(event: DragEvent<HTMLDivElement>): void { event.preventDefault(); setDragging(false); onFile(event.dataTransfer.files[0]); }
  function submit(event: FormEvent): void {
    event.preventDefault();
    if (!value.trim()) return;
    if (mode === "text" && !title.trim()) { setError("Give this note a title before saving."); return; }
    void run(mode === "url" ? ingestURL(value.trim(), options) : ingestText(value.trim(), { ...options, title: title.trim() }));
  }

  return (
    <section className="glass-panel relative overflow-hidden rounded-xl p-5 text-vault-primary">
      <div className="absolute -right-20 -top-20 h-52 w-52 rounded-full bg-indigo-500/20 blur-3xl" />
      {burst && Array.from({ length: 22 }).map((_, index) => <span key={index} className="burst-dot" style={{ "--angle": `${index * 16.36}deg`, "--distance": `${80 + (index % 5) * 18}px` } as React.CSSProperties} />)}
      <div className="relative mb-4 flex gap-2">
        {modes.map(({ name, Icon }) => <button key={name} onClick={() => { setMode(name); setError(""); }} className={`magnetic flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition hover:-translate-y-0.5 ${mode === name ? "bg-vault-accent text-white shadow-[0_0_24px_rgba(99,102,241,0.35)]" : "bg-white/5 text-vault-secondary hover:bg-white/10"}`}><Icon size={16} />{name.toUpperCase()}</button>)}
      </div>
      <div className="relative mb-4 grid gap-3 md:grid-cols-2">
        <label className="block"><span className="mb-1 block text-xs text-vault-secondary">{mode === "text" ? "Note title required" : "Custom title optional"}</span><input value={title} onChange={(event) => setTitle(event.target.value)} placeholder={mode === "text" ? "Name this thought clearly..." : "Override saved title..."} className="w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 outline-none focus:border-indigo-300/60" /></label>
        <label className="block"><span className="mb-1 flex items-center gap-1 text-xs text-vault-secondary"><Tag size={13} /> Tags</span><input value={tagText} onChange={(event) => setTagText(event.target.value)} placeholder="research, todo, cmput-402" className="w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 outline-none focus:border-indigo-300/60" /></label>
      </div>
      <div className="relative mb-4 rounded-lg border border-white/10 bg-black/15 p-3">
        <label className="flex items-center gap-2 text-sm text-vault-secondary"><input type="checkbox" checked={reminderEnabled} onChange={(event) => setReminderEnabled(event.target.checked)} className="accent-indigo-400" /><Bell size={15} /> Attach reminder</label>
        {reminderEnabled && <div className="mt-3 grid gap-3 md:grid-cols-2"><input type="datetime-local" value={reminderDue} onChange={(event) => setReminderDue(event.target.value)} className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 outline-none" /><select value={frequency} onChange={(event) => setFrequency(event.target.value as ReminderFrequency)} className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 outline-none"><option value="once">Once</option><option value="daily">Daily</option><option value="weekly">Weekly</option></select></div>}
      </div>
      {mode === "file" ? (
        <div onDragOver={(event) => { event.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={drop} className={`relative flex min-h-72 flex-col items-center justify-center rounded-xl border border-dashed p-8 text-center transition ${dragging ? "scale-[1.01] border-indigo-300 bg-indigo-500/10 shadow-[0_0_50px_rgba(99,102,241,0.25)]" : "border-white/15 bg-black/10"}`}>
          <div className="mb-5 grid grid-cols-4 gap-3 text-vault-secondary"><FileText className="animate-pulse" /><FileAudio className="animate-pulse [animation-delay:120ms]" /><Video className="animate-pulse [animation-delay:240ms]" /><FileImage className="animate-pulse [animation-delay:360ms]" /></div>
          <FileUp className="mb-3 text-indigo-200" size={38} />
          <p className="text-lg font-semibold text-white">Drop your first memory</p>
          <p className="mt-2 text-sm text-vault-secondary">PDF, MP3, MP4, WAV, PNG, JPG, TXT, or MD up to 100MB</p>
          <label className="magnetic mt-5 cursor-pointer rounded-lg bg-vault-accent px-4 py-2 text-sm text-white transition hover:scale-105 hover:bg-vault-hover"><input className="sr-only" type="file" onChange={(event: ChangeEvent<HTMLInputElement>) => onFile(event.target.files?.[0])} />Choose file</label>
          {burst && <Sparkles className="absolute right-8 top-8 text-emerald-300 animate-ping" />}
        </div>
      ) : (
        <form onSubmit={submit} className="relative space-y-3">
          {mode === "url" ? <input value={value} onChange={(event) => setValue(event.target.value)} placeholder="Paste a URL to save..." aria-label="URL to save" className="w-full rounded-lg border border-white/10 bg-black/20 p-4 outline-none transition focus:border-indigo-300/60" /> : <textarea value={value} onChange={(event) => setValue(event.target.value)} placeholder="Write the note you want your future self to find..." aria-label="Text or markdown to save" className="min-h-52 w-full rounded-lg border border-white/10 bg-black/20 p-4 outline-none transition focus:border-indigo-300/60" />}
          <button className="magnetic rounded-lg bg-vault-accent px-4 py-2 text-white transition hover:scale-105 hover:bg-vault-hover" disabled={busy}>{busy ? "Processing..." : "Save to MindVault"}</button>
        </form>
      )}
      {busy && <div className="mx-auto mt-5 h-16 w-16 rounded-full border-4 border-white/10 border-t-indigo-300 animate-spin" />}
      {error && <p className="mt-3 text-sm text-red-300">{error}</p>}
    </section>
  );
}
