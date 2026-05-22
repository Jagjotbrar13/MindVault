"use client";

import { useEffect, useState } from "react";
import { EmptyState } from "@/components/EmptyState";
import { GraphExplorer } from "@/components/GraphExplorer";
import { getGraph, type GraphData } from "@/lib/api";

export default function GraphPage() {
  const [data, setData] = useState<GraphData>({ nodes: [], links: [] });
  const [error, setError] = useState("");
  useEffect(() => { void getGraph().then(setData).catch((exc: Error) => setError(exc.message)); }, []);
  if (error) return <p className="text-red-300">{error}</p>;
  if (data.nodes.length === 0) return <div className="mx-auto mt-20 max-w-xl"><EmptyState title="No graph connections yet" detail="Add related documents to see connections form into a living constellation." /></div>;
  return <div className="space-y-4"><h1 className="gradient-heading text-3xl font-semibold">Knowledge Graph</h1><GraphExplorer data={data} /></div>;
}
