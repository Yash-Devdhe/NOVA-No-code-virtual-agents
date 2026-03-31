"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState, use } from "react";
import { Background, BackgroundVariant, Controls, MiniMap, Position, ReactFlow, addEdge, applyEdgeChanges, applyNodeChanges, Handle, type Connection } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useMutation, useQuery } from "convex/react";
import { ArrowLeft, Bot, Braces, Check, Copy, Download, Eye, GitBranch, Globe, Play, RefreshCw, Save, Settings2, Sparkles, Square, Workflow, Wrench, Zap } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { api } from "@/convex/_generated/api";
import { generateAgentCode } from "@/lib/codeGenerator";
import type { CustomTool, RFEdge, RFNode } from "@/types/agent-builder";
import CustomToolsManager from "../../dashboard/_components/CustomToolsManager";
import DragApiKeyDropdown from "../_components/DragApiKeyDropdown";
import AgentTestModal from "../../dashboard/_components/AgentTestModal";

type AgentType = "assistant" | "workflow" | "custom";
type OutputFormat = "text" | "json";
type CodeLanguage = "javascript" | "typescript";
type BuilderSettings = { agentName: string; instructions: string; includeChatHistory: boolean; model: string; outputFormat: OutputFormat };
type AgentConfig = { nodes?: RFNode[]; edges?: RFEdge[]; agentType?: AgentType; settings?: BuilderSettings };
type NodeKind = RFNode["data"]["type"];
type Tool = { type: NodeKind; label: string; description: string; icon: React.ComponentType<{ className?: string }>; accent: string; config?: Record<string, unknown> };

const DEFAULT_SETTINGS: BuilderSettings = { agentName: "Welcome Agent", instructions: "Help the user clearly and use tools only when needed.", includeChatHistory: true, model: "gpt-5", outputFormat: "text" };
const TOOLS: Tool[] = [
  { type: "start", label: "Start", description: "Starting point of the workflow", icon: Play, accent: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  { type: "end", label: "End", description: "Ending point of the workflow", icon: Square, accent: "bg-rose-100 text-rose-700 border-rose-200" },
  { type: "if", label: "If/Else", description: "Conditional branching", icon: GitBranch, accent: "bg-violet-100 text-violet-700 border-violet-200", config: { condition: "input.ok === true" } },
  { type: "while", label: "While Loop", description: "Repeat until a condition is met", icon: RefreshCw, accent: "bg-blue-100 text-blue-700 border-blue-200", config: { condition: "context.shouldContinue === true", maxIterations: 3 } },
  { type: "for", label: "For Loop", description: "Iterative loop with index", icon: RefreshCw, accent: "bg-blue-100 text-blue-700 border-blue-200", config: { initializer: "let i=0", condition: "i < 10", increment: "i++" } },
  { type: "api", label: "API", description: "Call an external API endpoint", icon: Globe, accent: "bg-cyan-100 text-cyan-700 border-cyan-200", config: { apiUrl: "https://api.example.com/data", method: "GET" } },
  { type: "userApproval", label: "User Approval", description: "Pause for human confirmation", icon: Bot, accent: "bg-pink-100 text-pink-700 border-pink-200", config: { approvalMessage: "Please confirm before continuing." } },
  { type: "workflow", label: "Sub-Workflow", description: "Call another workflow", icon: Workflow, accent: "bg-orange-100 text-orange-700 border-orange-200", config: { workflowName: "sub-workflow" } },
];

const slug = (v: string) => v.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
const nodeClass = (type: string) => ({ start: "border-emerald-300 bg-emerald-50", end: "border-rose-300 bg-rose-50", api: "border-cyan-300 bg-cyan-50", llm: "border-amber-300 bg-amber-50", if: "border-violet-300 bg-violet-50", while: "border-blue-300 bg-blue-50", for: "border-blue-300 bg-blue-50", workflow: "border-orange-300 bg-orange-50", userApproval: "border-pink-300 bg-pink-50" }[type] || "border-slate-300 bg-white");
const subtitle = (type: string) => ({ start: "Entry point", end: "Exit point", api: "External request", llm: "Model reasoning", if: "Conditional branch", while: "Loop step", for: "Index-based iteration", workflow: "Nested workflow", userApproval: "Human review" }[type] || "Workflow step");
const shouldForceGetMethod = (value: string) =>
  /api\.exchangerate-api\.com\/v4\/latest|worldtimeapi\.org\/api\/timezone|restcountries\.com\/v3\.1\/name|coingecko\.com\/api\/v3\/simple\/price|official-joke-api|numbersapi\.com|ipapi\.co/i.test(value);

function makeNode(tool: Tool, count: number, customTool?: CustomTool, position?: { x: number; y: number }): RFNode {
  const label = customTool?.name || tool.label;
  const nodePosition = position ?? { x: 140 + (count % 3) * 220, y: 90 + Math.floor(count / 3) * 140 };
  return {
    id: `${slug(label)}-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    type: "default",
    position: nodePosition,
    data: {
      label,
      type: customTool ? "custom" : tool.type,
      config: customTool
        ? { toolId: customTool.id, apiUrl: customTool.apiUrl || "", method: customTool.method || "GET", paramsSchema: customTool.paramsSchema || {} }
        : { ...(tool.config || {}) },
    },
  };
}


const FlowNode = ({ data, selected }: { data: RFNode["data"]; selected?: boolean }) => {
  const type = String(data?.type || "default");
  return (
    <div className={`min-w-[184px] rounded-2xl border p-4 shadow-sm ${nodeClass(type)} ${selected ? "ring-2 ring-sky-300 shadow-lg" : ""}`}>
      <Handle type="target" position={Position.Top} className="h-3 w-3 !border-2 !border-white !bg-sky-500" />
      <div className="space-y-1">
        <div className="text-lg font-semibold text-slate-900">{String(data?.label || "Node")}</div>
        <div className="text-sm text-slate-600">{subtitle(type)}</div>
      </div>
      <Handle type="source" position={Position.Bottom} className="h-3 w-3 !border-2 !border-white !bg-sky-500" />
    </div>
  );
};

interface AgentBuilderPageProps { params: Promise<{ agentId: string }> }

export default function AgentBuilderPage({ params }: AgentBuilderPageProps) {
  const { agentId } = use(params);
  const router = useRouter();
  const { toast } = useToast();
  const hydrated = useRef(false);
  const agent = useQuery(api.agent.GetAgentById, { agentId });
  const customTools = (useQuery(api.agent.GetAgentCustomTools, { agentId }) || []) as CustomTool[];
  const saveConfig = useMutation(api.agent.UpdateAgentConfig);
  const [agentType, setAgentType] = useState<AgentType>("assistant");
  const [settings, setSettings] = useState<BuilderSettings>(DEFAULT_SETTINGS);
  const [nodes, setNodes] = useState<RFNode[]>(INITIAL_NODES);
  const [edges, setEdges] = useState<RFEdge[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>("start-node");
  const [showCode, setShowCode] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [codeLanguage, setCodeLanguage] = useState<CodeLanguage>("javascript");
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [dragDropdown, setDragDropdown] = useState<{
    isOpen: boolean;
    toolType: Tool['type'] | null;
    toolLabel: string;
    position: { x: number; y: number } | null;
  }>({
    isOpen: false,
    toolType: null,
    toolLabel: '',
    position: null,
  });

  useEffect(() => {
    if (!agent) return;
    const cfg = agent.config || {};
    if (cfg.nodes?.length) setNodes(cfg.nodes);
    else setNodes(INITIAL_NODES);
    if (cfg.edges) setEdges(cfg.edges);
    if (cfg.agentType) setAgentType(cfg.agentType);
    if (cfg.settings) setSettings((c) => ({ ...c, ...cfg.settings })); else if (agent.name) setSettings((c) => ({ ...c, agentName: agent.name }));
    hydrated.current = true;
  }, [agent]);

  useEffect(() => {
    console.log("Agent data", agent);
  }, [agent]);

  const selectedNode = useMemo(() => nodes.find((n) => n.id === selectedNodeId) || null, [nodes, selectedNodeId]);
  const generatedCode = useMemo(() => generateAgentCode(nodes, edges, agentType, { agentId, agentName: settings.agentName || agent?.name, customTools, settings: { ...settings, codeLanguage } }), [agent?.name, agentId, agentType, codeLanguage, customTools, edges, nodes, settings]);
  const nodeTypes = useMemo(() => ({ default: FlowNode }), []);

  const persist = useCallback(async () => {
    setSaveState("saving");
    await saveConfig({ agentId, config: { nodes, edges, agentType, settings, generatedCode } });
    setSaveState("saved");
  }, [agentId, agentType, edges, generatedCode, nodes, saveConfig, settings]);

  useEffect(() => {
    if (!agent || !hydrated.current) return;
    const id = setTimeout(() => void persist().catch(() => setSaveState("error")), 800);
    return () => clearTimeout(id);
  }, [agent, persist]);

  const addTool = useCallback((tool: Tool, customTool?: CustomTool) => {
    const node = makeNode(tool, nodes.length, customTool);
    setNodes((c) => [...c, node]);
    setSelectedNodeId(node.id);
  }, [nodes.length]);

  const patchSelected = useCallback((fn: (node: RFNode) => RFNode) => {
    if (!selectedNodeId) return;
    setNodes((current) => current.map((node) => node.id === selectedNodeId ? fn(node) : node));
  }, [selectedNodeId]);

  const removeSelected = useCallback(() => {
    if (!selectedNodeId || selectedNodeId === "start-node") return;
    setNodes((c) => c.filter((n) => n.id !== selectedNodeId));
    setEdges((c) => c.filter((e) => e.source !== selectedNodeId && e.target !== selectedNodeId));
    setSelectedNodeId("start-node");
  }, [selectedNodeId]);

  const handleToolDragStart = useCallback((event: React.DragEvent<HTMLButtonElement>, toolType: Tool['type']) => {
    event.dataTransfer.setData("application/reactflow", toolType);
    event.dataTransfer.effectAllowed = "move";
  }, []);

  const handleDropOnCanvas = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const toolType = event.dataTransfer.getData("application/reactflow") as Tool['type'];
    const draggedTool = TOOLS.find((t) => t.type === toolType);
    if (!draggedTool) return;

    const bounds = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const position = { x: event.clientX - bounds.left, y: event.clientY - bounds.top };

    // Show dropdown for API key configuration
    setDragDropdown({
      isOpen: true,
      toolType,
      toolLabel: draggedTool.label,
      position,
    });
  }, []);

  const handleDragOverCanvas = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const handleDragDropdownConfirm = useCallback((apiKeyConfig: any) => {
    if (!dragDropdown.toolType || !dragDropdown.position) return;

    const draggedTool = TOOLS.find((t) => t.type === dragDropdown.toolType);
    if (!draggedTool) return;

    // Create node with merged config (tool defaults + api key config)
    const node = makeNode(draggedTool, nodes.length, undefined, dragDropdown.position);
    node.data.config = {
      ...node.data.config, // Keep tool defaults
      apiKeyConfig,       // Add API key config
    };

    setNodes((current) => [...current, node]);
    setSelectedNodeId(node.id);

    // Reset dropdown state
    setDragDropdown({
      isOpen: false,
      toolType: null,
      toolLabel: '',
      position: null,
    });
  }, [dragDropdown, nodes.length]);

  const handleDragDropdownClose = useCallback(() => {
    setDragDropdown({
      isOpen: false,
      toolType: null,
      toolLabel: '',
      position: null,
    });
  }, []);

  const copyCode = useCallback(async () => {
    try { await navigator.clipboard.writeText(generatedCode); toast({ title: "Code copied", description: "The generated runtime is ready to paste anywhere." }); }
    catch { toast({ title: "Copy failed", description: "Clipboard access was blocked.", variant: "destructive" }); }
  }, [generatedCode, toast]);

  const downloadCode = useCallback(() => {
    const blob = new Blob([generatedCode], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${slug(settings.agentName || agent?.name || "nova-agent")}.${codeLanguage === "typescript" ? "ts" : "js"}`;
    a.click();
    URL.revokeObjectURL(url);
  }, [agent?.name, codeLanguage, generatedCode, settings.agentName]);

  const manualSave = useCallback(async () => {
    try { await persist(); toast({ title: "Saved", description: "Agent workflow and settings were saved." }); }
    catch { toast({ title: "Save failed", description: "The agent could not be saved right now.", variant: "destructive" }); }
  }, [persist, toast]);

  const apiCard = TOOLS.find((t) => t.type === "api")!;

  return (
    <div className="min-h-screen bg-[#f6f7fb] text-slate-900">
      <div className="border-b border-slate-200 bg-white"><div className="flex items-center justify-between gap-4 px-6 py-5">
        <div className="flex items-center gap-4"><Button variant="ghost" size="icon" onClick={() => router.push("/dashboard")}><ArrowLeft className="h-5 w-5" /></Button><div><h1 className="text-2xl font-bold">{settings.agentName || agent?.name || "Agent Builder"}</h1><p className="text-sm text-slate-500">Agent Builder</p></div></div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="gap-2 rounded-xl" onClick={() => setShowCode((v) => !v)}><Settings2 className="h-4 w-4" />{showCode ? "Hide Code" : "Custom Code"}</Button>
          <Button variant="outline" className="gap-2 rounded-xl" onClick={() => setShowPreview(true)}><Eye className="h-4 w-4" />Preview</Button>
          <Button className="gap-2 rounded-xl bg-slate-950 text-white hover:bg-slate-800" onClick={() => void manualSave()}><Check className="h-4 w-4" />Save</Button>
        </div>
      </div></div>

      <div className="grid min-h-[calc(100vh-89px)] grid-cols-[320px_minmax(0,1fr)_360px]">
        <aside className="border-r border-slate-200 bg-white"><div className="h-[calc(100vh-89px)] overflow-y-auto p-5">
          <div className="mb-6"><h2 className="text-2xl font-bold">Toolbox</h2><p className="mt-2 text-sm text-slate-500">Click tools to add them to the canvas.</p></div>
          <div className="space-y-3">{TOOLS.map((tool) => <button key={tool.type} type="button" draggable={tool.type !== 'edge'} onDragStart={(e) => handleToolDragStart(e, tool.type)} onClick={() => addTool(tool)} className="w-full rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-sky-300 hover:shadow-md"><div className="flex items-start gap-4"><div className={`rounded-2xl border px-3 py-3 ${tool.accent}`}><tool.icon className="h-5 w-5" /></div><div><div className="text-lg font-semibold">{tool.label}</div><div className="text-sm text-slate-500">{tool.description}</div></div></div></button>)}</div>
          <div className="mt-8 space-y-4 rounded-3xl border border-slate-200 bg-slate-50 p-4">
            <div>
              <div className="text-lg font-semibold text-slate-900">Custom Tools</div>
              <p className="mt-1 text-sm text-slate-500">Add your real-time APIs here, then drop them into the canvas. Generated code will expose them in terminal chat.</p>
            </div>
            <CustomToolsManager
              agentId={agentId}
              triggerButton={
                <Button type="button" className="w-full rounded-2xl bg-slate-950 text-white hover:bg-slate-800">
                  <Wrench className="h-4 w-4" />
                  Manage Custom Tools
                </Button>
              }
            />
            <div className="space-y-3">
              {customTools.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-500">
                  No custom APIs added yet. Add tools like Joke, Weather, Currency, Country, Crypto, IP, Time, or Number Facts.
                </div>
              ) : (
                customTools.map((tool) => (
                  <button
                    key={tool.id}
                    type="button"
                    onClick={() => addTool(apiCard, tool)}
                    className="w-full rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-sky-300 hover:shadow-md"
                  >
                    <div className="flex items-start gap-4">
                      <div className="rounded-2xl border bg-cyan-100 px-3 py-3 text-cyan-700 border-cyan-200">
                        <Globe className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-base font-semibold text-slate-900">{tool.name}</div>
                        <div className="text-sm text-slate-500">{tool.description}</div>
                        <div className="mt-2 truncate text-xs text-slate-400">{tool.apiUrl || "No URL configured"}</div>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div></aside>

        <main className="relative overflow-hidden bg-[#f8fafc]"><div className="relative h-[calc(100vh-89px)]">
          <ReactFlow nodes={nodes} edges={edges} nodeTypes={nodeTypes} fitView onNodesChange={(c: any) => setNodes((n) => applyNodeChanges(c, n))} onEdgesChange={(c: any) => setEdges((e) => applyEdgeChanges(c, e))} onConnect={(connection: Connection) => setEdges((e) => addEdge({ ...connection, animated: true, type: "smoothstep", style: { stroke: "#0ea5e9", strokeWidth: 3 } }, e))} onNodeClick={(_event: any, node: RFNode) => setSelectedNodeId(node.id)} onDrop={handleDropOnCanvas} onDragOver={handleDragOverCanvas}>
            <Background variant={BackgroundVariant.Dots} gap={18} size={1.5} color="#d7deea" />
            <Controls />
            <MiniMap pannable zoomable />
          </ReactFlow>
          {showCode && <div className="absolute inset-y-4 right-4 z-20 w-[60%] max-w-4xl overflow-hidden rounded-3xl border border-slate-700 bg-slate-900 text-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
              <div className="flex items-center gap-4"><div className="flex gap-2"><span className="h-3 w-3 rounded-full bg-rose-500" /><span className="h-3 w-3 rounded-full bg-amber-400" /><span className="h-3 w-3 rounded-full bg-emerald-500" /></div><div><div className="font-semibold">custom-agent.{codeLanguage === "typescript" ? "ts" : "js"}</div><div className="text-sm text-slate-400">Live generated runtime code</div></div></div>
              <div className="flex items-center gap-2">
                <Select value={codeLanguage} onValueChange={(v) => setCodeLanguage(v as CodeLanguage)}><SelectTrigger className="w-[160px] border-slate-700 bg-slate-800 text-white"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="javascript">JavaScript</SelectItem><SelectItem value="typescript">TypeScript</SelectItem></SelectContent></Select>
                <Button variant="outline" className="border-slate-700 bg-slate-800 text-white hover:bg-slate-700" onClick={() => setShowCode(true)}><RefreshCw className="h-4 w-4" />Generate</Button>
                <Button variant="ghost" size="icon" className="text-slate-300 hover:bg-slate-800 hover:text-white" onClick={() => void copyCode()}><Copy className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" className="text-slate-300 hover:bg-slate-800 hover:text-white" onClick={downloadCode}><Download className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" className="text-slate-300 hover:bg-slate-800 hover:text-white" onClick={() => setShowCode(false)}><Square className="h-4 w-4" /></Button>
              </div>
            </div>
            <div className="grid h-[calc(100%-73px)] grid-rows-[1fr_180px]">
              <div className="overflow-auto px-6 py-5"><pre className="whitespace-pre-wrap font-mono text-sm leading-6 text-slate-100">{generatedCode}</pre></div>
              <div className="border-t border-slate-800 bg-slate-950/60 px-6 py-5"><div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-300"><Braces className="h-4 w-4" />Available runtime surfaces</div><div className="grid grid-cols-2 gap-3 text-sm text-slate-300"><div>`runAgent(prompt)` returns the workflow result and model reply.</div><div>`OPENAI_API_KEY` enables live model output.</div><div>API and custom tools execute with native `fetch`.</div><div>Download or copy the file and run it in Node 20+.</div></div></div>
            </div>
          </div>}
          <div className="pointer-events-none absolute bottom-4 left-4 rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 text-sm shadow-sm backdrop-blur"><div className="font-semibold text-slate-900">{nodes.length} nodes · {edges.length} connections</div><div className="text-slate-500">Save state: {saveState}</div></div>
        </div></main>

        <aside className="border-l border-slate-200 bg-white"><div className="h-[calc(100vh-89px)] overflow-y-auto p-5">
          <div className="mb-6"><h2 className="text-4xl font-bold tracking-tight">My Agent</h2><p className="mt-2 text-sm text-slate-500">Configure behavior, tools, and exported code.</p></div>
          <Tabs defaultValue="settings" className="w-full">
            <TabsList className="grid w-full grid-cols-3 rounded-2xl bg-slate-100 p-1"><TabsTrigger value="settings" className="rounded-xl">Settings</TabsTrigger><TabsTrigger value="api-keys" className="rounded-xl">API Keys</TabsTrigger><TabsTrigger value="limits" className="rounded-xl">Limits</TabsTrigger></TabsList>
            <TabsContent value="settings" className="mt-6 space-y-6">
              <div className="space-y-2"><label className="text-sm font-medium text-slate-700">Agent Name</label><Input value={settings.agentName} onChange={(e) => setSettings((c) => ({ ...c, agentName: e.target.value }))} placeholder="Welcome Agent" className="h-12 rounded-2xl" /></div>
              <div className="space-y-2"><label className="text-sm font-medium text-slate-700">Instructions</label><Textarea value={settings.instructions} onChange={(e) => setSettings((c) => ({ ...c, instructions: e.target.value }))} placeholder="Describe how the agent should behave." className="min-h-[120px] rounded-2xl" /></div>
              <div className="flex items-center justify-between rounded-2xl border border-slate-200 p-4"><div><div className="font-medium text-slate-900">Include chat history</div><div className="text-sm text-slate-500">Expose prior messages to the exported runtime.</div></div><Switch checked={settings.includeChatHistory} onCheckedChange={(checked) => setSettings((c) => ({ ...c, includeChatHistory: checked }))} /></div>
              <div className="space-y-2"><label className="text-sm font-medium text-slate-700">Model</label><Select value={settings.model} onValueChange={(v) => setSettings((c) => ({ ...c, model: v }))}><SelectTrigger className="h-12 rounded-2xl"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="gpt-5">GPT-5</SelectItem><SelectItem value="gpt-5-mini">GPT-5 Mini</SelectItem><SelectItem value="gpt-4.1">GPT-4.1</SelectItem></SelectContent></Select></div>
              <div className="space-y-3 rounded-2xl border border-slate-200 p-4"><div className="font-medium text-slate-900">Output format</div><div className="grid grid-cols-2 gap-3"><button type="button" className={`rounded-2xl border px-4 py-3 text-left ${settings.outputFormat === "text" ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white"}`} onClick={() => setSettings((c) => ({ ...c, outputFormat: "text" }))}>Text</button><button type="button" className={`rounded-2xl border px-4 py-3 text-left ${settings.outputFormat === "json" ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white"}`} onClick={() => setSettings((c) => ({ ...c, outputFormat: "json" }))}>JSON</button></div></div>
              <div className="space-y-3 rounded-2xl border border-slate-200 p-4"><div className="flex items-center justify-between"><div className="font-medium text-slate-900">Builder type</div><Zap className="h-4 w-4 text-slate-500" /></div><Select value={agentType} onValueChange={(v) => setAgentType(v as AgentType)}><SelectTrigger className="h-12 rounded-2xl"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="assistant">Assistant</SelectItem><SelectItem value="workflow">Workflow</SelectItem><SelectItem value="custom">Custom Runtime</SelectItem></SelectContent></Select></div>
            </TabsContent>
            <TabsContent value="api-keys" className="mt-6">
              <div className="space-y-6">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                  Exported code reads credentials from environment variables such as <code className="bg-slate-100 px-1 py-0.5 rounded text-xs font-mono">OPENAI_API_KEY</code>. 
                  Keep secrets out of the canvas and inject them where you deploy.
                </div>
                
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-slate-900">Get API Keys</h3>
                  
                  <div className="grid gap-4">
                    {/* OpenAI API Key */}
                    <div className="rounded-2xl border border-slate-200 bg-white p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-semibold text-slate-900">OpenAI API Key</h4>
                          <p className="text-sm text-slate-600 mt-1">Required for LLM tools and AI-powered features</p>
                        </div>
                        <a 
                          href="https://platform.openai.com/api-keys" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-3 py-2 text-sm font-medium text-white hover:bg-green-700 transition-colors"
                        >
                          Get OpenAI Key
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </a>
                      </div>
                    </div>

                    {/* Popular Free API Keys */}
                    <div className="rounded-2xl border border-slate-200 bg-white p-4">
                      <h4 className="font-semibold text-slate-900 mb-3">Popular Free API Keys</h4>
                      <div className="grid gap-3">
                        <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                          <div>
                            <div className="font-medium text-slate-900">Weather API</div>
                            <div className="text-sm text-slate-600">OpenWeatherMap, WeatherAPI</div>
                          </div>
                          <div className="flex gap-2">
                            <a href="https://openweathermap.org/api" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 text-sm font-medium">OpenWeatherMap</a>
                            <a href="https://www.weatherapi.com/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 text-sm font-medium">WeatherAPI</a>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                          <div>
                            <div className="font-medium text-slate-900">Currency Converter</div>
                            <div className="text-sm text-slate-600">ExchangeRate-API, CurrencyAPI</div>
                          </div>
                          <div className="flex gap-2">
                            <a href="https://exchangerate-api.com/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 text-sm font-medium">ExchangeRate</a>
                            <a href="https://currencyapi.com/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 text-sm font-medium">CurrencyAPI</a>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                          <div>
                            <div className="font-medium text-slate-900">Maps & Geocoding</div>
                            <div className="text-sm text-slate-600">Mapbox, OpenStreetMap</div>
                          </div>
                          <div className="flex gap-2">
                            <a href="https://account.mapbox.com/access-tokens/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 text-sm font-medium">Mapbox</a>
                            <a href="https://www.openstreetmap.org/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 text-sm font-medium">OpenStreetMap</a>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                          <div>
                            <div className="font-medium text-slate-900">News API</div>
                            <div className="text-sm text-slate-600">NewsAPI, CurrentsAPI</div>
                          </div>
                          <div className="flex gap-2">
                            <a href="https://newsapi.org/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 text-sm font-medium">NewsAPI</a>
                            <a href="https://currentsapi.services/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 text-sm font-medium">CurrentsAPI</a>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                          <div>
                            <div className="font-medium text-slate-900">IP Geolocation</div>
                            <div className="text-sm text-slate-600">IP-API, IPInfo</div>
                          </div>
                          <div className="flex gap-2">
                            <a href="http://ip-api.com/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 text-sm font-medium">IP-API</a>
                            <a href="https://ipinfo.io/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 text-sm font-medium">IPInfo</a>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
            <TabsContent value="limits" className="mt-6"><div className="space-y-3 rounded-2xl border border-slate-200 p-4 text-sm text-slate-600"><div>Canvas nodes: {nodes.length}</div><div>Connections: {edges.length}</div><div>Generated code size: {generatedCode.length.toLocaleString()} characters</div></div></TabsContent>
          </Tabs>
          <div className="mt-8 rounded-3xl border border-slate-200 p-4">
            <div className="mb-4 flex items-center justify-between"><div className="font-semibold text-slate-900">Selected Tool</div>{selectedNode && selectedNode.id !== "start-node" && <Button variant="ghost" size="sm" className="text-rose-600 hover:text-rose-700" onClick={removeSelected}>Remove</Button>}</div>
            {selectedNode ? <div className="space-y-4">
              <div className="space-y-2"><label className="text-sm font-medium text-slate-700">Label</label><Input value={String(selectedNode.data.label || "")} onChange={(e) => patchSelected((node) => ({ ...node, data: { ...node.data, label: e.target.value } }))} className="rounded-2xl" /></div>
              {['api'].includes(String(selectedNode.data.type)) && <>
                <div className="space-y-2"><label className="text-sm font-medium text-slate-700">API Call Name</label><Input value={String(selectedNode.data.config?.apiCallName || "")} onChange={(e) => patchSelected((node) => ({ ...node, data: { ...node.data, config: { ...node.data.config, apiCallName: e.target.value } } }))} placeholder="Enter API call name" className="rounded-2xl" /></div>
                <div className="space-y-2"><label className="text-sm font-medium text-slate-700">API URL</label><Input value={String(selectedNode.data.config?.apiUrl || "")} onChange={(e) => patchSelected((node) => ({ ...node, data: { ...node.data, config: { ...node.data.config, apiUrl: e.target.value, method: shouldForceGetMethod(e.target.value) ? "GET" : (node.data.config?.method || "GET") } } }))} className="rounded-2xl" /></div>
                <div className="space-y-2"><label className="text-sm font-medium text-slate-700">Method</label><Select value={String(selectedNode.data.config?.method || "GET")} onValueChange={(v) => patchSelected((node) => ({ ...node, data: { ...node.data, config: { ...node.data.config, method: v } } }))}><SelectTrigger className="rounded-2xl"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="GET">GET</SelectItem><SelectItem value="POST">POST</SelectItem><SelectItem value="PUT">PUT</SelectItem><SelectItem value="DELETE">DELETE</SelectItem></SelectContent></Select></div>
                <div className="space-y-2"><label className="text-sm font-medium text-slate-700">API Key (Optional)</label><Input type="password" value={String(selectedNode.data.config?.apiKey || "")} onChange={(e) => patchSelected((node) => ({ ...node, data: { ...node.data, config: { ...node.data.config, apiKey: e.target.value } } }))} placeholder="Enter API Key" className="rounded-2xl" /></div>
              </>}
              {String(selectedNode.data.type) === "if" && <div className="space-y-2"><label className="text-sm font-medium text-slate-700">Condition</label><Textarea value={String(selectedNode.data.config?.condition || "")} onChange={(e) => patchSelected((node) => ({ ...node, data: { ...node.data, config: { ...node.data.config, condition: e.target.value } } }))} className="min-h-[100px] rounded-2xl" /></div>}
              {String(selectedNode.data.type) === "while" && <>
                <div className="space-y-2"><label className="text-sm font-medium text-slate-700">Loop condition</label><Textarea value={String(selectedNode.data.config?.condition || "")} onChange={(e) => patchSelected((node) => ({ ...node, data: { ...node.data, config: { ...node.data.config, condition: e.target.value } } }))} className="min-h-[100px] rounded-2xl" /></div>
                <div className="space-y-2"><label className="text-sm font-medium text-slate-700">Max iterations</label><Input type="number" value={String(selectedNode.data.config?.maxIterations || 3)} onChange={(e) => patchSelected((node) => ({ ...node, data: { ...node.data, config: { ...node.data.config, maxIterations: Number(e.target.value || 0) } } }))} className="rounded-2xl" /></div>
              </>}
              {String(selectedNode.data.type) === "for" && <>
                <div className="space-y-2"><label className="text-sm font-medium text-slate-700">Initializer</label><Input value={String(selectedNode.data.config?.initializer || "let i = 0")} onChange={(e) => patchSelected((node) => ({ ...node, data: { ...node.data, config: { ...node.data.config, initializer: e.target.value } } }))} className="rounded-2xl" /></div>
                <div className="space-y-2"><label className="text-sm font-medium text-slate-700">Condition</label><Input value={String(selectedNode.data.config?.condition || "i < 10")} onChange={(e) => patchSelected((node) => ({ ...node, data: { ...node.data, config: { ...node.data.config, condition: e.target.value } } }))} className="rounded-2xl" /></div>
                <div className="space-y-2"><label className="text-sm font-medium text-slate-700">Increment</label><Input value={String(selectedNode.data.config?.increment || "i++")} onChange={(e) => patchSelected((node) => ({ ...node, data: { ...node.data, config: { ...node.data.config, increment: e.target.value } } }))} className="rounded-2xl" /></div>
              </>}            </div> : <div className="rounded-2xl border border-dashed border-slate-300 p-4 text-sm text-slate-500">Select a node on the canvas to edit its settings.</div>}
          </div>
          <Button className="mt-8 h-12 w-full rounded-2xl bg-slate-950 text-white hover:bg-slate-800" onClick={() => void manualSave()}><Save className="h-4 w-4" />Save</Button>
        </div></aside>
      </div>

      {/* Drag API Key Dropdown */}
      <DragApiKeyDropdown
        toolType={dragDropdown.toolType || 'api'}
        toolLabel={dragDropdown.toolLabel}
        isOpen={dragDropdown.isOpen}
        onClose={handleDragDropdownClose}
        onConfirm={handleDragDropdownConfirm}
      />
      <AgentTestModal
        open={showPreview}
        onOpenChange={setShowPreview}
        agentId={agentId}
        agentName={settings.agentName || agent?.name || "Agent"}
        nodes={nodes.map((node) => ({
          id: node.id,
          type: String(node.data?.type || "workflow"),
          position: node.position,
          config: (node.data?.config as Record<string, any> | undefined) || {},
        }))}
      />
    </div>
  );
}

const INITIAL_NODES: RFNode[] = [{
  id: "start-node",
  type: "default",
  position: { x: 280, y: 100 },
  data: { label: "Start", type: "start", config: {} }
}];

