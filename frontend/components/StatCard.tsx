"use client";

import { useEffect, useState } from "react";

export function StatCard({ label, value }: { label: string; value: number }) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const start = performance.now();
    const duration = 700;
    const tick = (now: number): void => {
      const progress = Math.min(1, (now - start) / duration);
      setDisplay(Math.round(value * progress));
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [value]);

  return (
    <div className="glass-panel rounded-lg p-5 transition duration-300 hover:-translate-y-1 hover:border-indigo-300/40 hover:shadow-[0_20px_60px_rgba(99,102,241,0.18)]">
      <p className="text-sm text-vault-secondary">{label}</p>
      <p className="mono-data mt-3 text-3xl font-semibold text-white">{display}</p>
    </div>
  );
}
