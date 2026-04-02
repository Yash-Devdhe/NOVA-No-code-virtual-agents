import React, { useCallback, useEffect, useRef } from "react";
import {
  Background,
  Controls,
  MiniMap,
  addEdge,
  Connection,
  ReactFlow,
  applyEdgeChanges,
  applyNodeChanges,
  useEdgesState,
  useNodesState,
} from "@xyflow/react";

interface AgentCanvasProps {
  nodes?: any[];
  edges?: any[];
  onCanvasChange?: (nodes: any[], edges: any[]) => void;
  agentType?: string;
}

export const AgentCanvas: React.FC<AgentCanvasProps> = ({
  nodes: incomingNodes,
  edges: incomingEdges,
  onCanvasChange,
  agentType,
}) => {
  const canvasRef = useRef<HTMLDivElement>(null);

  const [nodes, setNodes] = useNodesState(
    incomingNodes?.length
      ? incomingNodes
      : [
          {
            id: "1",
            data: { label: "Start node", config: {} },
            position: { x: 250, y: 25 },
            type: "default",
          },
        ]
  );
  const [edges, setEdges] = useEdgesState(incomingEdges || []);

  useEffect(() => {
    canvasRef.current?.focus();
  }, []);

  useEffect(() => {
    if (incomingNodes) {
      setNodes(incomingNodes);
    }
  }, [incomingNodes, setNodes]);

  useEffect(() => {
    if (incomingEdges) {
      setEdges(incomingEdges);
    }
  }, [incomingEdges, setEdges]);

  const handleNodesChange = useCallback(
    (changes: any) => setNodes((currentNodes) => applyNodeChanges(changes, currentNodes)),
    [setNodes]
  );

  const handleEdgesChange = useCallback(
    (changes: any) => setEdges((currentEdges) => applyEdgeChanges(changes, currentEdges)),
    [setEdges]
  );

  const onConnect = useCallback(
    (params: Connection) => setEdges((currentEdges) => addEdge(params, currentEdges)),
    [setEdges]
  );

  useEffect(() => {
    onCanvasChange?.(nodes, edges);
  }, [nodes, edges, onCanvasChange]);

  const nodeTypes = {
    default: ({ data }: any) => (
      <div className="flex min-h-[80px] cursor-grab select-none items-center justify-center rounded-lg border-2 border-gray-200 bg-white p-4 text-center shadow-md transition-all hover:shadow-lg active:cursor-grabbing">
        <div className="text-sm font-semibold text-gray-800">{data.label || "Node"}</div>
      </div>
    ),
  };

  return (
    <div ref={canvasRef} className="relative h-[500px] w-full outline-none" tabIndex={-1}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        fitView
        nodesDraggable
        nodesConnectable
      >
        <Background />
        <Controls />
        <MiniMap />
      </ReactFlow>

      <button
        className="absolute bottom-4 right-4 z-10 flex h-12 w-12 items-center justify-center rounded-full border-0 bg-blue-500 p-3 text-xl font-bold text-white shadow-lg outline-none transition-all hover:bg-blue-600 hover:shadow-xl"
        onClick={() => {
          const newNode = {
            id: `${Date.now()}`,
            data: { label: `${agentType || "Custom"} Tool`, config: {} },
            position: {
              x: Math.random() * 400,
              y: Math.random() * 400,
            },
            type: "default",
          };
          setNodes((currentNodes) => currentNodes.concat(newNode));
        }}
        title="Add node"
      >
        +
      </button>
    </div>
  );
};

export default AgentCanvas;
