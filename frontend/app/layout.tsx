import "./globals.css";
import type { Metadata } from "next";
import Link from "next/link";
import { Brain, Database, Home, Network, Upload } from "lucide-react";
import { AmbientParticles } from "@/components/AmbientParticles";
import { SystemStatus } from "@/components/SystemStatus";

export const metadata: Metadata = { title: "MindVault", description: "Your local AI second brain." };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const links = [
    { href: "/", label: "Home", icon: Home },
    { href: "/upload", label: "Upload", icon: Upload },
    { href: "/graph", label: "Graph", icon: Network },
    { href: "/memory", label: "Memory", icon: Database }
  ];

  return (
    <html lang="en" className="dark">
      <body>
        <AmbientParticles />
        <div className="flex min-h-screen text-vault-primary">
          <aside className="glass-panel sticky top-0 hidden h-screen w-64 shrink-0 border-y-0 border-l-0 p-5 md:block">
            <div className="mb-8 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-500/15 text-indigo-300 shadow-[0_0_26px_rgba(99,102,241,0.35)]"><Brain /></div>
              <span className="gradient-heading text-lg font-semibold">MindVault</span>
            </div>
            <nav className="space-y-1">
              {links.map(({ href, label, icon: Icon }) => (
                <Link key={href} href={href} className="group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-vault-secondary transition hover:translate-x-1 hover:bg-white/7 hover:text-white">
                  <span className="absolute left-0 h-6 w-1 rounded-full bg-indigo-400 opacity-0 transition group-hover:opacity-100" />
                  <Icon size={18} />{label}
                </Link>
              ))}
            </nav>
            <SystemStatus />
          </aside>
          <main className="page-shell flex-1 p-4 md:p-8">{children}</main>
        </div>
      </body>
    </html>
  );
}

