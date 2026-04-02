"use client";

import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Send, RotateCcw, X, GripVertical, MessageSquare, Workflow, Bot, ArrowRight, Play, Square, GitBranch, RefreshCw, Globe, CheckCircle, Code, AlertTriangle } from "lucide-react";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface ToolNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  config: Record<string, any>;
}

interface AgentTestModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agentId: string;
  agentName: string;
  nodes: ToolNode[];
}

function extractCurrencyCode(value: string) {
  const trimmed = value.trim().toUpperCase();
  if (/^[A-Z]{3}$/.test(trimmed)) return trimmed;
  return trimmed.match(/\b[A-Z]{3}\b/)?.[0] || null;
}

function extractNumber(value: string) {
  const match = value.match(/\d+/);
  return match?.[0] || null;
}

function extractWeatherLocation(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return trimmed;
  return trimmed
    .replace(/^(what(?:'s| is)?\s+the\s+)?weather\s+(?:like\s+)?(?:for|in)\s+/i, "")
    .replace(/^weather\s+/i, "")
    .trim();
}

function normalizeConfiguredCurrencyUrl(rawUrl: string, prompt: string) {
  const inputCode = extractCurrencyCode(prompt);
  const configuredCode = rawUrl.match(/\/([A-Z]{3})\/?$/i)?.[1]?.toUpperCase() || "INR";
  const base = rawUrl.replace(/\/[A-Z]{3}\/?$/i, "");
  return `${base}/${inputCode || configuredCode}`;
}

function formatApiResponse(data: any) {
  if (data?.text) return data.text;

  if (data?.rates && data?.base) {
    const sample = Object.entries(data.rates)
      .slice(0, 10)
      .map(([code, rate]) => `${data.base} -> ${code}: ${rate}`)
      .join("\n");
    return [`Base currency: ${data.base}`, sample].filter(Boolean).join("\n");
  }

  if (data?.convertedAmount && data?.from && data?.to) {
    return `${data.amount} ${data.from} = ${data.convertedAmount} ${data.to}`;
  }

  if (data?.setup || data?.punchline) {
    return [data.setup, data.punchline].filter(Boolean).join("\n");
  }

  return typeof data === "string" ? data : JSON.stringify(data, null, 2);
}

async function runPreviewApiNode(node: ToolNode, prompt: string) {
  const apiUrl = String(node.config?.apiUrl || "");
  const configuredMethod = String(node.config?.method || "GET").toUpperCase();
  const weatherLocation = extractWeatherLocation(prompt);
  const isInternal = apiUrl.startsWith("/");
  const isExchangeRateApi = /api\.exchangerate-api\.com\/v4\/latest/i.test(apiUrl);
  const isWorldTimeApi = /worldtimeapi\.org\/api\/timezone/i.test(apiUrl);
  const isCountryApi = /restcountries\.com\/v3\.1\/name/i.test(apiUrl);
  const isCryptoApi = /coingecko\.com\/api\/v3\/simple\/price/i.test(apiUrl);
  const isIpApi = /ipapi\.co/i.test(apiUrl);
  const isJokeApi = /official-joke-api/i.test(apiUrl);
  const isNumbersApi = /numbersapi\.com/i.test(apiUrl);

  let method = configuredMethod;
  let url = apiUrl;
  let body: Record<string, unknown> | undefined;

  if (isExchangeRateApi) {
    method = "GET";
    url = normalizeConfiguredCurrencyUrl(apiUrl, prompt);
  } else if (isWorldTimeApi) {
    method = "GET";
    const timezone = prompt.trim() || "Asia/Kolkata";
    url = apiUrl.replace(/\/[A-Za-z_]+(?:\/[A-Za-z_]+)*$/i, "") + `/${timezone}`;
  } else if (isCountryApi) {
    method = "GET";
    const country = prompt.trim() || "india";
    url = apiUrl.replace(/\/[^/]+$/i, "") + `/${encodeURIComponent(country)}`;
  } else if (isCryptoApi) {
    method = "GET";
    const coin = prompt.trim().split(/\s+/)[0] || "bitcoin";
    const targetUrl = new URL(apiUrl);
    targetUrl.searchParams.set("ids", coin.toLowerCase());
    if (!targetUrl.searchParams.get("vs_currencies")) {
      targetUrl.searchParams.set("vs_currencies", "usd,inr");
    }
    url = targetUrl.toString();
  } else if (isIpApi) {
    method = "GET";
    const ip = prompt.trim() || "json";
    url = /\/json\/?$/i.test(apiUrl)
      ? (prompt.trim() ? `https://ipapi.co/${ip}/json/` : "https://ipapi.co/json/")
      : apiUrl;
  } else if (isJokeApi) {
    method = "GET";
  } else if (isNumbersApi) {
    method = "GET";
    const value = extractNumber(prompt) || "300";
    url = apiUrl.replace(/\/\d+(?:\/date)?$/i, "") + `/${value}`;
  } else if (configuredMethod !== "GET") {
    body = {
      prompt,
      input: prompt,
      city: prompt,
      location: prompt,
      country: prompt,
      timezone: prompt,
      coin: prompt,
      base: extractCurrencyCode(prompt),
      currency: extractCurrencyCode(prompt),
      number: extractNumber(prompt),
    };
  }

  const response = isInternal
      ? await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: method === "GET" ? undefined : JSON.stringify(body || {
          prompt,
          input: prompt,
          city: weatherLocation || prompt,
          location: weatherLocation || prompt,
          country: weatherLocation || prompt,
          timezone: prompt,
          coin: prompt,
          base: extractCurrencyCode(prompt),
          currency: extractCurrencyCode(prompt),
          number: extractNumber(prompt),
        }),
      })
      : await fetch("/api/custom-api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url,
          method,
          apiKey: node.config?.apiKey,
          apiKeyConfig: node.config?.apiKeyConfig,
          city: weatherLocation || undefined,
          body,
          contentType: "application/json",
        }),
      });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload?.error || payload?.details || "Failed to call API");
  }

  return formatApiResponse(payload.data ?? payload);
}

const getToolIcon = (type: string) => {
  switch (type) {
    case "start":
      return Play;
    case "end":
      return Square;
    case "if":
      return GitBranch;
    case "while":
      return RefreshCw;
    case "edge":
      return ArrowRight;
    case "agent":
      return Bot;
    case "api":
      return Globe;
    case "llm":
      return MessageSquare;
    case "userApproval":
      return CheckCircle;
    case "workflow":
      return Workflow;
    case "code":
      return Code;
    default:
      return Workflow;
  }
};

const getToolColor = (type: string) => {
  switch (type) {
    case "start":
      return "bg-green-100 text-green-600 border-green-200";
    case "end":
      return "bg-red-100 text-red-600 border-red-200";
    case "if":
      return "bg-purple-100 text-purple-600 border-purple-200";
    case "while":
      return "bg-blue-100 text-blue-600 border-blue-200";
    case "edge":
      return "bg-cyan-100 text-cyan-600 border-cyan-200";
    case "agent":
      return "bg-yellow-100 text-yellow-600 border-yellow-200";
    case "api":
      return "bg-teal-100 text-teal-600 border-teal-200";
    case "llm":
      return "bg-indigo-100 text-indigo-600 border-indigo-200";
    case "userApproval":
      return "bg-pink-100 text-pink-600 border-pink-200";
    case "workflow":
      return "bg-orange-100 text-orange-600 border-orange-200";
    case "code":
      return "bg-gray-100 text-gray-600 border-gray-200";
    default:
      return "bg-gray-100 text-gray-600 border-gray-200";
  }
};

const AgentTestModal = ({
  open,
  onOpenChange,
  agentId,
  agentName,
  nodes,
}: AgentTestModalProps) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: `Welcome to the ${agentName} agent test. You can interact with your agent here to see how it responds.`,
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [draggedNode, setDraggedNode] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const apiNodes = nodes.filter((node) => (node.type === "api" || node.type === "custom") && node.config?.apiUrl);
      const messageText = input.trim();
      const content =
        apiNodes.length === 1
          ? await runPreviewApiNode(apiNodes[0], messageText)
          : await (async () => {
              const response = await fetch("/api/openai", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  prompt: messageText,
                  type: "chat",
                }),
              });

              const data = await response.json();
              return (
                data.message ||
                "I received your message. In a production environment, I would process this using your configured agent workflow and tools."
              );
            })();

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content:
          error instanceof Error
            ? `Agent error: ${error.message}`
            : "Agent error: Unknown error",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleReboot = () => {
    setMessages([
      {
        id: "welcome",
        role: "assistant",
        content: `Agent ${agentName} has been restarted. How can I help you today?`,
        timestamp: new Date(),
      },
    ]);
  };

  const handleDragStart = (e: React.DragEvent, nodeId: string) => {
    setDraggedNode(nodeId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragEnd = () => {
    setDraggedNode(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, newPosition: { x: number; y: number }) => {
    e.preventDefault();
    // Note: We're not actually updating the nodes since this is preview-only
    setDraggedNode(null);
  };

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-[95vw] h-[90vh] bg-white rounded-2xl shadow-2xl flex overflow-hidden border border-gray-200">
        {/* Header */}
        <div className="absolute top-0 left-0 right-0 h-16 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 flex items-center justify-between px-6 z-10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-lg">
              <Bot className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-white font-semibold text-lg">{agentName}</h2>
              <p className="text-slate-400 text-xs">Agent Preview & Test</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleReboot}
              className="text-slate-300 hover:text-white hover:bg-white/10"
            >
              <RotateCcw className="h-4 w-4 mr-1" />
              Restart
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="bg-white/10 hover:bg-white/20 text-white border-0"
            >
              <X className="h-4 w-4 mr-1" />
              Close
            </Button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex pt-16">
          {/* Left Panel - Chat UI */}
          <div className="w-[400px] flex flex-col bg-white border-r">
            {/* Chat Header */}
            <div className="h-14 border-b bg-slate-50 flex items-center justify-between px-4">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-slate-600" />
                <span className="font-medium text-slate-700">Chat</span>
              </div>
              <span className="text-xs text-slate-400">{nodes.length} tools configured</span>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                        message.role === "user"
                          ? "bg-gradient-to-r from-blue-600 to-blue-700 text-white"
                          : "bg-slate-100 text-slate-800"
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      <p className={`text-xs mt-2 ${message.role === "user" ? "text-blue-200" : "text-slate-400"}`}>
                        {message.timestamp.toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                ))}
                {loading && (
                  <div className="flex justify-start">
                    <div className="bg-slate-100 rounded-2xl px-4 py-3">
                      <Loader2 className="h-5 w-5 animate-spin text-slate-500" />
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Input */}
            <div className="p-4 border-t bg-slate-50">
              <div className="flex gap-2">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                  placeholder="Send a message..."
                  className="flex-1 bg-white border-slate-200 focus:ring-blue-500"
                  disabled={loading}
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={loading || !input.trim()}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Right Panel - Workflow Preview */}
          <div className="flex-1 bg-slate-50 overflow-auto">
            <div className="p-4 border-b bg-white">
              <h3 className="font-semibold text-slate-700 flex items-center gap-2">
                <Workflow className="h-4 w-4" />
                Workflow Preview
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Drag nodes to rearrange. This is a preview only - no modifications are saved.
              </p>
            </div>

            <div className="p-6">
              {nodes.length === 0 ? (
                <div className="text-center py-16">
                  <Workflow className="h-16 w-16 mx-auto text-slate-300 mb-4" />
                  <p className="text-slate-400">No tools have been added to this agent yet.</p>
                  <p className="text-slate-300 text-sm mt-2">
                    Go to the agent builder to add tools and create your workflow.
                  </p>
                </div>
              ) : (
                <div className="relative min-h-[500px]">
                  {/* Connection Lines SVG */}
                  {nodes.length > 1 && (
                    <svg className="absolute inset-0 w-full h-full pointer-events-none">
                      {nodes.slice(0, -1).map((node, index) => {
                        const nextNode = nodes[index + 1];
                        return (
                          <line
                            key={`connection-${index}`}
                            x1={node.position.x + 100}
                            y1={node.position.y + 40}
                            x2={nextNode.position.x}
                            y2={nextNode.position.y + 40}
                            stroke="#94a3b8"
                            strokeWidth="2"
                            strokeDasharray="5,5"
                          />
                        );
                      })}
                    </svg>
                  )}

                  {/* Nodes */}
                  <div className="space-y-4">
                    {nodes.map((node, index) => {
                      const Icon = getToolIcon(node.type);
                      const colorClass = getToolColor(node.type);
                      const isDragging = draggedNode === node.id;

                      return (
                        <div
                          key={node.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, node.id)}
                          onDragEnd={handleDragEnd}
                          onDragOver={handleDragOver}
                          onDrop={(e) => handleDrop(e, { x: 150, y: index * 120 + 100 })}
                          className={`
                            relative flex items-center gap-4 p-4 rounded-xl border-2 bg-white shadow-sm cursor-move
                            transition-all duration-200
                            ${isDragging ? "opacity-50 scale-105 shadow-lg" : "hover:shadow-md"}
                            ${colorClass}
                          `}
                          style={{
                            marginLeft: `${node.position.x}px`,
                            marginTop: `${index === 0 ? 0 : 20}px`,
                          }}
                        >
                          {/* Node Number */}
                          <div className="absolute -left-3 w-6 h-6 bg-slate-800 text-white rounded-full flex items-center justify-center text-xs font-bold">
                            {index + 1}
                          </div>

                          {/* Grip Handle */}
                          <GripVertical className="h-5 w-5 text-slate-400 flex-shrink-0" />

                          {/* Icon */}
                          <div className={`p-2 rounded-lg ${colorClass}`}>
                            <Icon className="h-5 w-5" />
                          </div>

                          {/* Content */}
                          <div className="flex-1">
                            <h4 className="font-semibold text-slate-800 capitalize">
                              {node.type}
                            </h4>
                            {node.config?.name && (
                              <p className="text-sm text-slate-500">{node.config.name}</p>
                            )}
                            {node.config?.prompt && (
                              <p className="text-xs text-slate-400 mt-1 line-clamp-1">
                                {node.config.prompt}
                              </p>
                            )}
                          </div>

                          {/* Arrow to next */}
                          {index < nodes.length - 1 && (
                            <ArrowRight className="h-5 w-5 text-slate-400 flex-shrink-0" />
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Flow indicator */}
                  <div className="mt-8 text-center">
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 rounded-full text-blue-600 text-sm">
                      <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
                      Flow executes from top to bottom
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AgentTestModal;
