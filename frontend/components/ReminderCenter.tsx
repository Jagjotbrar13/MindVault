"use client";

import { Bell, CheckCircle2, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { completeReminder, dismissReminder, getDueReminders, type DocumentItem } from "@/lib/api";

export function ReminderCenter({ onChanged }: { onChanged?: () => void }) {
  const [due, setDue] = useState<DocumentItem[]>([]);
  const [error, setError] = useState("");

  async function load(): Promise<void> {
    try {
      const reminders = await getDueReminders();
      setDue(reminders);
      if (reminders.length && "Notification" in window) {
        if (Notification.permission === "default") await Notification.requestPermission();
        if (Notification.permission === "granted") {
          reminders.slice(0, 3).forEach((item) => new Notification(`MindVault reminder: ${item.title}`, { body: item.summary || "Reminder due now." }));
        }
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not load reminders.");
    }
  }

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(), 60000);
    return () => window.clearInterval(timer);
  }, []);

  async function dismiss(id: string): Promise<void> {
    await dismissReminder(id);
    await load();
    onChanged?.();
  }

  async function complete(id: string): Promise<void> {
    await completeReminder(id);
    await load();
    onChanged?.();
  }

  if (!due.length && !error) return null;
  return (
    <section className="glass-panel rounded-xl border-amber-300/20 p-4">
      <div className="mb-3 flex items-center gap-2 text-amber-200"><Bell size={18} /><h2 className="font-semibold">Due reminders</h2></div>
      {error && <p className="text-sm text-red-300">{error}</p>}
      <div className="space-y-3">
        {due.map((item) => <div key={item.id} className="rounded-lg border border-white/10 bg-black/20 p-3"><div className="flex items-start justify-between gap-3"><div><p className="font-medium text-white">{item.title}</p><p className="mt-1 text-sm text-vault-secondary">{item.summary}</p><p className="mono-data mt-2 text-xs text-amber-200">{item.reminder_due_at ? new Date(item.reminder_due_at).toLocaleString() : "Due now"} · {item.reminder_frequency || "once"}</p></div><div className="flex shrink-0 gap-2"><button onClick={() => void dismiss(item.id)} className="rounded-lg border border-white/10 p-2 text-vault-secondary hover:bg-white/10 hover:text-white" aria-label="Dismiss"><XCircle size={17} /></button><button onClick={() => void complete(item.id)} className="rounded-lg border border-emerald-300/20 bg-emerald-300/10 p-2 text-emerald-200 hover:bg-emerald-300/20" aria-label="Mark complete"><CheckCircle2 size={17} /></button></div></div></div>)}
      </div>
    </section>
  );
}
