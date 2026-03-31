"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import ToolPalette from "../_components/ToolPalette";
import AgentCanvas from "../_components/AgentCanvas";
import CodeEditor from "../_components/CodeEditor";
import NodePropertiesPanel from "../_components/NodePropertiesPanel";
import AgentPreviewModal from "../_components/AgentPreviewModal";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  Save,
  Play,
  ArrowLeft,
  Settings,
  Check,
  X,
  Loader2,
  PanelLeft,
  PanelRight,
  Code,
} from "lucide-react";

/**
 * ToolNode Interface
 * Defines the structure for nodes in the agent builder canvas
 * Types: start, end, if, while, edge, agent, api, llm, userApproval, workflow
 */
export interface ToolNode {
  id: string;
  type: "if" | "else" | "while" | "agent" | "llm" | "code" | "start" | "end" | "workflow" | "edge" | "api" | "userApproval";
  position: { x: number; y: number };
  config: Record<string, any>;
  createdAt?: number;
}

const AgentBuilderPage = () => {
  const params = useParams();
  const router = useRouter();
  const agentId = params.agentId as string;

  // Fetch agent details from database
  const agentDetails = useQuery(api.agent.GetAgentById, { agentId });
  
  const [agentName, setAgentName] = useState<string>("Loading...");
  const [nodes, setNodes] = useState<ToolNode[]>([
    {
      id: "start-1",
      type: "start",
      position: { x: 250, y: 50 },
      config: { name: "Start" },
    },
  ]);
  const [selectedNode, setSelectedNode] = useState<ToolNode | null>(null);
  const [showCodeEditor, setShowCodeEditor] = useState(false);
  const [customCode, setCustomCode] = useState("// Write your custom agent code here\n");
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(true);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [toolboxOpen, setToolboxOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [codeOpen, setCodeOpen] = useState(false);

  // Update agent name when agent details are fetched
  useEffect(() => {
    if (agentDetails) {
      setAgentName(agentDetails.name || "New Agent");
    }
  }, [agentDetails]);

  useEffect(() => {
    if (!agentId) return;
    const savedConfig = localStorage.getItem(`agent-${agentId}`);
    if (!savedConfig) return;

    try {
      const parsed = JSON.parse(savedConfig);
      if (Array.isArray(parsed.nodes) && parsed.nodes.length > 0) {
        setNodes(parsed.nodes);
      }
      if (typeof parsed.customCode === "string") {
        setCustomCode(parsed.customCode);
      }
      setSaved(true);
    } catch (error) {
      console.error("Failed to load saved agent config:", error);
    }
  }, [agentId]);

  const handleSave = async () => {
    setLoading(true);
    try {
      const config = { nodes, customCode };
      localStorage.setItem(`agent-${agentId}`, JSON.stringify(config));
      
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      alert("Agent saved successfully!");
    } catch (error) {
      console.error("Error saving agent:", error);
      alert("Error saving agent");
    } finally {
      setLoading(false);
    }
  };

  const handleAddNode = (node: ToolNode) => {
    setNodes([...nodes, node]);
    // Auto-select the newly added node
    setSelectedNode(node);
    setSaved(false);
  };

  const handleUpdateNode = (updatedNode: ToolNode) => {
    setNodes(nodes.map((n) => (n.id === updatedNode.id ? updatedNode : n)));
    if (selectedNode?.id === updatedNode.id) {
      setSelectedNode(updatedNode);
    }
    setSaved(false);
  };

  const handleDeleteNode = (nodeId: string) => {
    setNodes(nodes.filter((n) => n.id !== nodeId));
    if (selectedNode?.id === nodeId) {
      setSelectedNode(null);
    }
    setSaved(false);
  };

  const handleNodeSelect = (node: ToolNode | null) => {
    setSelectedNode(node);
  };

  const handlePositionXChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (selectedNode) {
      handleUpdateNode({
        ...selectedNode,
        position: { ...selectedNode.position, x: parseInt(e.target.value) || 0 }
      });
    }
  };

  const handlePositionYChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (selectedNode) {
      handleUpdateNode({
        ...selectedNode,
        position: { ...selectedNode.position, y: parseInt(e.target.value) || 0 }
      });
    }
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold">{agentName}</h1>
            <p className="text-sm text-gray-500">Agent Builder {!saved && <span className="text-orange-500">•</span>}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 md:hidden">
            <Sheet open={toolboxOpen} onOpenChange={setToolboxOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" aria-label="Open toolbox">
                  <PanelLeft className="h-4 w-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0">
                <div className="h-full overflow-y-auto">
                  <ToolPalette onAddNode={handleAddNode} />
                </div>
              </SheetContent>
            </Sheet>
            <Sheet open={settingsOpen} onOpenChange={setSettingsOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" aria-label="Open settings">
                  <PanelRight className="h-4 w-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="p-0">
                <div className="h-full overflow-y-auto bg-white">
                  <NodePropertiesPanel
                    agentId={agentId}
                    onSave={(settings) => {
                      console.log("Agent settings:", settings);
                    }}
                  />
                </div>
              </SheetContent>
            </Sheet>
            <Sheet open={codeOpen} onOpenChange={setCodeOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" aria-label="Open code editor">
                  <Code className="h-4 w-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="p-0 sm:max-w-full">
                <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b">
                  <span className="text-white text-sm font-medium">Custom Code</span>
                </div>
                <CodeEditor
                  code={customCode}
                  agentName={agentName}
                  nodes={nodes}
                  onChange={(code: string) => {
                    setCustomCode(code);
                    setSaved(false);
                  }}
                />
              </SheetContent>
            </Sheet>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowCodeEditor(!showCodeEditor)}
            className="hidden md:inline-flex"
          >
            <Settings className="h-4 w-4 mr-2" />
            {showCodeEditor ? "Hide Code" : "Custom Code"}
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setPreviewOpen(true)}
          >
            <Play className="h-4 w-4 mr-2" />
            Preview
          </Button>
          <Button size="sm" onClick={handleSave} disabled={loading}>
            {loading ? (
              <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : saved ? (
              <Check className="h-4 w-4 mr-2" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            {loading ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Tool Palette - Left Sidebar */}
        <div className="hidden md:block w-64 bg-white border-r overflow-y-auto flex-shrink-0">
          <ToolPalette onAddNode={handleAddNode} />
        </div>

        {/* Canvas Area */}
        <div className={`flex-1 overflow-hidden ${showCodeEditor ? 'md:w-3/5' : 'w-full'}`}>
          <AgentCanvas
            nodes={nodes}
            selectedNode={selectedNode}
            onNodeSelect={handleNodeSelect}
            onUpdateNode={handleUpdateNode}
            onDeleteNode={handleDeleteNode}
          />
        </div>

        {/* Code Editor Panel */}
        {showCodeEditor && (
          <div className="hidden md:flex w-2/5 border-l flex-shrink-0">
            <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b">
              <span className="text-white text-sm font-medium">Custom Code</span>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setShowCodeEditor(false)}
                className="h-6 w-6 text-gray-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <CodeEditor
              code={customCode}
              agentName={agentName}
              nodes={nodes}
              onChange={(code: string) => {
                setCustomCode(code);
                setSaved(false);
              }}
            />
          </div>
        )}

        {/* Agent Settings Panel - Right Sidebar - Always visible */}
        <div className="hidden md:block w-72 bg-white border-l overflow-y-auto flex-shrink-0">
          <NodePropertiesPanel
            agentId={agentId}
            onSave={(settings) => {
              console.log("Agent settings:", settings);
            }}
          />
        </div>
      </div>

      {/* Preview Modal */}
      <AgentPreviewModal
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        agentId={agentId}
        agentName={agentName}
        nodes={nodes}
      />
    </div>
  );
};

export default AgentBuilderPage;
