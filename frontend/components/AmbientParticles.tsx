"use client";

import { useEffect, useState } from "react";

export function AmbientParticles() {
  const [mouse, setMouse] = useState({ x: 50, y: 50 });

  useEffect(() => {
    const move = (event: PointerEvent): void => {
      const x = (event.clientX / window.innerWidth) * 100;
      const y = (event.clientY / window.innerHeight) * 100;
      setMouse({ x, y });
      document.documentElement.style.setProperty("--mx", `${x}%`);
      document.documentElement.style.setProperty("--my", `${y}%`);
      document.documentElement.style.setProperty("--grid-x", `${(x - 50) * 0.35}px`);
      document.documentElement.style.setProperty("--grid-y", `${(y - 50) * 0.35}px`);
    };
    window.addEventListener("pointermove", move);
    return () => window.removeEventListener("pointermove", move);
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden="true">
      {Array.from({ length: 30 }).map((_, index) => {
        const left = (index * 37) % 100;
        const top = (index * 53) % 100;
        const attractionX = (mouse.x - left) * 0.09;
        const attractionY = (mouse.y - top) * 0.09;
        const delay = (index % 9) * 0.7;
        const size = 2 + (index % 4);
        return (
          <span
            key={index}
            className="absolute rounded-full bg-cyan-200/40 shadow-[0_0_18px_rgba(125,211,252,0.45)]"
            style={{ left: `${left}%`, top: `${top}%`, width: size, height: size, transform: `translate(${attractionX}px, ${attractionY}px)`, animation: `floatParticle ${9 + (index % 7)}s ease-in-out ${delay}s infinite alternate` }}
          />
        );
      })}
    </div>
  );
}
