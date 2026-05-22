"use client";

import { useEffect, useState } from "react";
import { getHealth } from "@/lib/api";

export function SystemStatus() {
  const [online, setOnline] = useState(false);
  useEffect(() => {
    let active = true;
    const check = (): void => {
      void getHealth().then((health) => active && setOnline(health.ollama)).catch(() => active && setOnline(false));
    };
    check();
    const id = window.setInterval(check, 15000);
    return () => {
      active = false;
      window.clearInterval(id);
    };
  }, []);
  return <div className="absolute bottom-5 flex items-center gap-2 text-sm text-vault-secondary"><span className={`h-2.5 w-2.5 rounded-full ${online ? "bg-vault-success" : "bg-red-500"}`} />Local AI status</div>;
}
