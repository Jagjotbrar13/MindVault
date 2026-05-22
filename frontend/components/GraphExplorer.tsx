"use client";

import { ArrowRight, Download, Filter, LocateFixed, Network, Search, SlidersHorizontal, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import * as d3 from "d3";
import type { GraphData, GraphLink, GraphNode } from "@/lib/api";

type SimNode = GraphNode & d3.SimulationNodeDatum;
type SimLink = d3.SimulationLinkDatum<SimNode> & { weight: number };
type Physics = { repulsion: number; distance: number; gravity: number };
type Backlink = { node: GraphNode; link: GraphLink; weight: number; explanation: string; sharedTags: string[] };

const colorByType: Record<string, string> = { pdf: "#6366f1", audio: "#10b981", video: "#14b8a6", image: "#f97316", url: "#f59e0b", text: "#9ca3af" };
const endpointId = (value: string | number | SimNode): string => typeof value === "object" ? value.id : String(value);

export function GraphExplorer({ data }: { data: GraphData }) {
  const ref = useRef<SVGSVGElement>(null);
  const [selected, setSelected] = useState<GraphNode | null>(null);
  const [hovered, setHovered] = useState<{ node: GraphNode; x: number; y: number } | null>(null);
  const [query, setQuery] = useState("");
  const [type, setType] = useState("all");
  const [showControls, setShowControls] = useState(false);
  const [physics, setPhysics] = useState<Physics>({ repulsion: -360, distance: 120, gravity: 1 });
  const [context, setContext] = useState<{ node: GraphNode; x: number; y: number } | null>(null);
  const [time, setTime] = useState(100);

  const nodeById = useMemo(() => new Map(data.nodes.map((node) => [node.id, node])), [data.nodes]);
  const backlinks = useMemo(() => selected ? buildBacklinks(selected, data, nodeById) : [], [selected, data, nodeById]);
  const types = useMemo(() => ["all", ...Array.from(new Set(data.nodes.map((node) => node.type || "text")))], [data.nodes]);
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const allowed = new Set(data.nodes.filter((node) => (type === "all" || node.type === type) && (!needle || node.title.toLowerCase().includes(needle))).slice(0, Math.max(1, Math.ceil(data.nodes.length * (time / 100)))).map((node) => node.id));
    return { nodes: data.nodes.filter((node) => allowed.has(node.id)), links: data.links.filter((link) => allowed.has(String(link.source)) && allowed.has(String(link.target))) };
  }, [data, query, type, time]);

  useEffect(() => {
    if (!ref.current) return;
    const svg = d3.select<SVGSVGElement, undefined>(ref.current);
    svg.selectAll("*").remove();
    const width = ref.current.clientWidth || 900;
    const height = ref.current.clientHeight || 650;
    const nodes: SimNode[] = filtered.nodes.map((node) => ({ ...node }));
    const links: SimLink[] = filtered.links.map((link) => ({ ...link })) as SimLink[];

    const defs = svg.append("defs");
    const glow = defs.append("filter").attr("id", "glow");
    glow.append("feGaussianBlur").attr("stdDeviation", "3.5").attr("result", "coloredBlur");
    const merge = glow.append("feMerge");
    merge.append("feMergeNode").attr("in", "coloredBlur");
    merge.append("feMergeNode").attr("in", "SourceGraphic");

    const root = svg.append("g");
    svg.call(d3.zoom<SVGSVGElement, undefined>().scaleExtent([0.35, 4]).on("zoom", (event) => root.attr("transform", event.transform)));

    const link = root.selectAll("line").data(links).enter().append("line")
      .attr("class", "energy-edge")
      .attr("stroke", "#818cf8")
      .attr("stroke-opacity", (d) => Math.max(0.18, d.weight))
      .attr("stroke-width", (d) => 1.2 + d.weight * 2)
      .attr("filter", "url(#glow)");

    const labelGroup = root.selectAll("g.node-label").data(nodes).enter().append("g").attr("class", "node-label").attr("opacity", 0).style("pointer-events", "none");
    labelGroup.append("rect").attr("x", 12).attr("y", -13).attr("height", 22).attr("rx", 11).attr("width", (d) => Math.min(220, Math.max(52, d.title.length * 6.4 + 18))).attr("fill", "rgba(10,10,18,0.68)").attr("stroke", "rgba(255,255,255,0.14)").attr("filter", "url(#glow)");
    labelGroup.append("text").text((d) => d.title.length > 30 ? `${d.title.slice(0, 29)}...` : d.title).attr("font-size", 11).attr("fill", "#f5f5f5").attr("dx", 22).attr("dy", 2);
    labelGroup.transition().delay((_, index) => 260 + index * 80).duration(500).attr("opacity", 1);

    const node = root.selectAll("circle").data(nodes).enter().append("circle")
      .attr("class", "graph-node")
      .attr("r", 0)
      .attr("fill", (d) => colorByType[d.type] || colorByType.text)
      .attr("stroke", (d) => selected?.id === d.id ? "#f5f5f5" : "rgba(255,255,255,0.75)")
      .attr("stroke-width", (d) => selected?.id === d.id ? 3 : 1)
      .attr("filter", "url(#glow)")
      .style("cursor", "pointer")
      .on("mouseenter", (event, active) => {
        setHovered({ node: active, x: event.clientX, y: event.clientY });
        const connected = connectedIds(active.id, links);
        node.attr("opacity", (d) => connected.size === 0 || connected.has(d.id) ? 1 : 0.14);
        labelGroup.attr("opacity", (d) => connected.size === 0 || connected.has(d.id) ? 1 : 0.14);
        link.attr("stroke-opacity", (d) => connected.has(endpointId(d.source)) && connected.has(endpointId(d.target)) ? 0.98 : 0.07).attr("stroke", (d) => connected.has(endpointId(d.source)) && connected.has(endpointId(d.target)) ? "#c4b5fd" : "#818cf8").attr("stroke-width", (d) => connected.has(endpointId(d.source)) && connected.has(endpointId(d.target)) ? 3 : 1.2 + d.weight * 2);
      })
      .on("mousemove", (event, active) => setHovered({ node: active, x: event.clientX, y: event.clientY }))
      .on("mouseleave", () => { setHovered(null); node.attr("opacity", 1); labelGroup.attr("opacity", 1); link.attr("stroke", "#818cf8").attr("stroke-opacity", (d) => Math.max(0.18, d.weight)).attr("stroke-width", (d) => 1.2 + d.weight * 2); })
      .on("contextmenu", (event, d) => { event.preventDefault(); setContext({ node: d, x: event.clientX, y: event.clientY }); })
      .on("click", (_, d) => setSelected(d));

    node.transition().delay((_, index) => index * 80).duration(650).attr("r", (d) => 9 + Math.min(9, Number(d.chunk_count || 0) / 8));

    const simulation = d3.forceSimulation(nodes)
      .alphaDecay(0.035)
      .force("link", d3.forceLink<SimNode, SimLink>(links).id((d) => d.id).distance(physics.distance).strength(0.42))
      .force("charge", d3.forceManyBody().strength(physics.repulsion))
      .force("center", d3.forceCenter(width / 2, height / 2).strength(physics.gravity))
      .force("collision", d3.forceCollide<SimNode>().radius(48));

    simulation.on("tick", () => {
      link.attr("x1", (d) => (d.source as SimNode).x || 0).attr("y1", (d) => (d.source as SimNode).y || 0).attr("x2", (d) => (d.target as SimNode).x || 0).attr("y2", (d) => (d.target as SimNode).y || 0);
      node.attr("cx", (d) => d.x || 0).attr("cy", (d) => d.y || 0);
      labelGroup.attr("transform", (d) => `translate(${d.x || 0}, ${d.y || 0})`);
    });

    return () => { simulation.stop(); };
  }, [filtered, physics, selected]);

  function exportSvg(): void {
    if (!ref.current) return;
    const blob = new Blob([ref.current.outerHTML], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "mindvault-graph.svg";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function isolate(node: GraphNode): void { setQuery(node.title); setSelected(node); setContext(null); }

  return (
    <div className="relative h-[calc(100vh-3rem)] overflow-hidden rounded-xl border border-white/10 bg-black/20 shadow-[0_0_100px_rgba(99,102,241,0.13)] backdrop-blur-xl">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(99,102,241,0.18),transparent_22rem)]" />
      <div className="glass-panel absolute left-4 top-4 z-20 flex flex-wrap items-center gap-2 rounded-xl p-2">
        <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-black/20 px-3 py-2"><Search size={15} className="text-vault-secondary" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Find document..." className="w-44 bg-transparent text-sm outline-none placeholder:text-vault-secondary" /></div>
        <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-black/20 px-3 py-2"><Filter size={15} className="text-vault-secondary" /><select value={type} onChange={(event) => setType(event.target.value)} className="bg-transparent text-sm outline-none">{types.map((item) => <option key={item} value={item} className="bg-zinc-950">{item}</option>)}</select></div>
        <button onClick={() => setShowControls(!showControls)} className="magnetic rounded-lg bg-white/7 p-2 text-vault-secondary hover:text-white" aria-label="Physics controls"><SlidersHorizontal size={17} /></button>
        <button onClick={exportSvg} className="magnetic rounded-lg bg-white/7 p-2 text-vault-secondary hover:text-white" aria-label="Export graph"><Download size={17} /></button>
      </div>
      {showControls && <div className="glass-panel absolute left-4 top-20 z-20 w-72 space-y-3 rounded-xl p-4 text-sm"><Control label="Repulsion" min={-700} max={-80} value={physics.repulsion} onChange={(value) => setPhysics({ ...physics, repulsion: value })} /><Control label="Link distance" min={60} max={220} value={physics.distance} onChange={(value) => setPhysics({ ...physics, distance: value })} /><Control label="Gravity" min={0.1} max={2} step={0.1} value={physics.gravity} onChange={(value) => setPhysics({ ...physics, gravity: value })} /><Control label="Time" min={10} max={100} value={time} onChange={setTime} /></div>}
      <svg ref={ref} className="relative h-full w-full" />
      {hovered && <div className="pointer-events-none fixed z-50 max-w-xs rounded-lg border border-white/10 bg-black/80 p-3 text-xs text-vault-secondary shadow-2xl backdrop-blur-xl" style={{ left: hovered.x + 14, top: hovered.y + 14 }}><p className="font-semibold text-white">{hovered.node.title}</p><p className="mono-data mt-1">{hovered.node.chunk_count ?? 0} chunks · {hovered.node.type}</p><p className="mt-2 line-clamp-3">{hovered.node.summary || "No summary available."}</p></div>}
      {selected && <BacklinkPanel node={selected} backlinks={backlinks} onClose={() => setSelected(null)} onNavigate={setSelected} />}
      {context && <div className="fixed z-50 rounded-xl border border-white/10 bg-black/80 p-2 text-sm shadow-[0_0_38px_rgba(99,102,241,.25)] backdrop-blur-xl" style={{ left: context.x, top: context.y }}><button onClick={() => isolate(context.node)} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-vault-secondary hover:bg-white/10 hover:text-white"><LocateFixed size={15} /> Isolate subgraph</button><button onClick={exportSvg} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-vault-secondary hover:bg-white/10 hover:text-white"><Download size={15} /> Export SVG</button><button onClick={() => setContext(null)} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-red-300 hover:bg-red-500/10"><Trash2 size={15} /> Delete from Memory page</button></div>}
    </div>
  );
}

function BacklinkPanel({ node, backlinks, onClose, onNavigate }: { node: GraphNode; backlinks: Backlink[]; onClose: () => void; onNavigate: (node: GraphNode) => void }) {
  return (
    <aside className="glass-panel absolute right-4 top-4 z-20 flex max-h-[calc(100%-2rem)] w-[26rem] flex-col rounded-lg p-4">
      <button onClick={onClose} className="absolute right-3 top-3 rounded-lg p-1 text-vault-secondary hover:bg-white/10 hover:text-white" aria-label="Close backlinks"><X size={16} /></button>
      <div className="pr-8"><p className="mb-2 inline-flex items-center gap-2 rounded-full border border-indigo-300/20 bg-indigo-300/10 px-2 py-1 text-xs text-indigo-100"><Network size={13} /> Backlinks</p><h2 className="font-semibold text-white">{node.title}</h2><p className="mono-data mt-2 text-xs text-vault-secondary">{node.type} · {node.chunk_count ?? 0} chunks · {backlinks.length} connection{backlinks.length === 1 ? "" : "s"}</p></div>
      <p className="mt-4 text-sm leading-6 text-vault-secondary">{node.summary || "No summary."}</p>
      <div className="mt-4 flex flex-wrap gap-1.5">{(node.tags || []).map((tag) => <span key={tag} className="rounded-full border border-white/10 bg-white/7 px-2 py-1 text-xs text-indigo-100">#{tag}</span>)}</div>
      <div className="mt-5 min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
        {backlinks.length ? backlinks.map((item) => <button key={item.node.id} onClick={() => onNavigate(item.node)} className="w-full rounded-lg border border-white/10 bg-black/20 p-3 text-left transition hover:border-indigo-300/40 hover:bg-indigo-400/10"><div className="flex items-start justify-between gap-3"><div><p className="font-medium text-white">{item.node.title}</p><p className="mono-data mt-1 text-xs text-vault-secondary">{Math.round(item.weight * 100)}% similarity · {item.node.type}</p></div><ArrowRight className="mt-1 text-indigo-200" size={16} /></div><p className="mt-2 text-sm leading-5 text-vault-secondary">{item.explanation}</p>{item.sharedTags.length > 0 && <div className="mt-2 flex flex-wrap gap-1">{item.sharedTags.map((tag) => <span key={tag} className="rounded-full bg-white/7 px-2 py-0.5 text-xs text-indigo-100">#{tag}</span>)}</div>}</button>) : <div className="rounded-lg border border-white/10 bg-black/20 p-4 text-sm text-vault-secondary">No graph-backed memories connect to this node yet. Add related documents and MindVault will form backlinks when the similarity is meaningful.</div>}
      </div>
    </aside>
  );
}

function buildBacklinks(selected: GraphNode, data: GraphData, nodeById: Map<string, GraphNode>): Backlink[] {
  return data.links.flatMap((link) => {
    const source = String(link.source);
    const target = String(link.target);
    const otherId = source === selected.id ? target : target === selected.id ? source : "";
    const other = otherId ? nodeById.get(otherId) : undefined;
    if (!other) return [];
    const sharedTags = (selected.tags || []).filter((tag) => (other.tags || []).includes(tag));
    return [{ node: other, link, weight: link.weight, sharedTags, explanation: relationshipLabel(selected, other, link.weight, sharedTags) }];
  }).sort((a, b) => b.weight - a.weight);
}

function relationshipLabel(left: GraphNode, right: GraphNode, weight: number, sharedTags: string[]): string {
  if (sharedTags.length >= 3) return `Shares ${sharedTags.length} core tags with this memory, including ${sharedTags.slice(0, 3).map((tag) => `#${tag}`).join(", ")}.`;
  if (sharedTags.length > 0) return `Related through ${sharedTags.map((tag) => `#${tag}`).join(", ")} and a ${Math.round(weight * 100)}% semantic match.`;
  if (left.type === right.type) return `Similar ${left.type} memory cluster with a ${Math.round(weight * 100)}% semantic relationship.`;
  const leftDate = left.created_at ? new Date(left.created_at).getTime() : 0;
  const rightDate = right.created_at ? new Date(right.created_at).getTime() : 0;
  if (leftDate && rightDate && Math.abs(leftDate - rightDate) < 1000 * 60 * 60 * 24 * 3) return `Similar topic cluster created within a close time window; semantic match is ${Math.round(weight * 100)}%.`;
  return `Connected by graph similarity: ${Math.round(weight * 100)}% semantic overlap.`;
}

function connectedIds(activeId: string, links: SimLink[]): Set<string> {
  const connected = new Set<string>([activeId]);
  links.forEach((item) => {
    const source = endpointId(item.source);
    const target = endpointId(item.target);
    if (source === activeId || target === activeId) { connected.add(source); connected.add(target); }
  });
  return connected;
}

function Control({ label, min, max, value, step = 1, onChange }: { label: string; min: number; max: number; value: number; step?: number; onChange: (value: number) => void }) {
  return <label className="block"><span className="mb-1 flex justify-between text-vault-secondary"><span>{label}</span><span className="mono-data">{value}</span></span><input type="range" min={min} max={max} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} className="w-full accent-indigo-400" /></label>;
}
