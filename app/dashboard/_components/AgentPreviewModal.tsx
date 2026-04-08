"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Send,
  Bot,
  Loader2,
  Copy,
  Check,
  User,
  Sparkles,
  MessageSquare,
  Play,
  Square,
  GitBranch,
  RefreshCw,
  Globe,
  CheckCircle,
  Workflow,
  Layers,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
} from "lucide-react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  type?: "text" | "guide" | "tool_info";
}

interface AgentPreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const tools = [
  {
    type: "start",
    label: "Start",
    icon: Play,
    color: "bg-gradient-to-br from-green-400 to-green-600",
    description: "Starting point of the workflow",
    shadow: "shadow-green-500/25",
    details:
      "The Start node is where your agent's workflow begins. Every agent must have exactly one Start node. You can configure the start node to accept user input parameters.",
  },
  {
    type: "end",
    label: "End",
    icon: Square,
    color: "bg-gradient-to-br from-red-400 to-red-600",
    description: "Ending point of the workflow",
    shadow: "shadow-red-500/25",
    details:
      "The End node marks where your agent's workflow terminates. You can have multiple End nodes in different branches. The agent stops executing when it reaches an End node.",
  },
  {
    type: "if",
    label: "If/Else",
    icon: GitBranch,
    color: "bg-gradient-to-br from-purple-400 to-purple-600",
    description: "Conditional branching",
    shadow: "shadow-purple-500/25",
    details:
      "The If/Else node allows your agent to make decisions based on conditions. You can set up boolean expressions that evaluate to true or false, directing the flow to different branches.",
  },
  {
    type: "while",
    label: "While Loop",
    icon: RefreshCw,
    color: "bg-gradient-to-br from-blue-400 to-blue-600",
    description: "Repeat until condition is met",
    shadow: "shadow-blue-500/25",
    details:
      "The While Loop node repeats a set of actions until a specified condition is met. Use it for iterative processes like fetching paginated data or retrying failed operations.",
  },
  {
    type: "agent",
    label: "Agent",
    icon: Bot,
    color: "bg-gradient-to-br from-yellow-400 to-yellow-600",
    description: "Call another agent with custom settings",
    shadow: "shadow-yellow-500/25",
    details:
      "The Agent node lets you call another agent within your workflow. This enables modular agent design where specialized agents handle specific tasks.",
  },
  {
    type: "api",
    label: "API",
    icon: Globe,
    color: "bg-gradient-to-br from-teal-400 to-teal-600",
    description: "Call an external API endpoint",
    shadow: "shadow-teal-500/25",
    details:
      "The API node enables your agent to communicate with external services. Configure HTTP method, headers, body, and authentication. Supports REST APIs with JSON responses.",
  },
  {
    type: "llm",
    label: "LLM",
    icon: MessageSquare,
    color: "bg-gradient-to-br from-indigo-400 to-indigo-600",
    description: "Large Language Model",
    shadow: "shadow-indigo-500/25",
    details:
      "The LLM node uses AI language models to process and generate text. Configure the model (GPT-4, Gemini, etc.), system prompts, and output formatting options.",
  },
  {
    type: "userApproval",
    label: "User Approval",
    icon: CheckCircle,
    color: "bg-gradient-to-br from-pink-400 to-pink-600",
    description: "Pause for human approval",
    shadow: "shadow-pink-500/25",
    details:
      "The User Approval node pauses workflow execution until a human approves the action. Useful for sensitive operations, billing, or critical decisions.",
  },
  {
    type: "workflow",
    label: "Sub-Workflow",
    icon: Workflow,
    color: "bg-gradient-to-br from-orange-400 to-orange-600",
    description: "Call another workflow",
    shadow: "shadow-orange-500/25",
    details:
      "The Sub-Workflow node lets you call another workflow as a function. This enables reusability and organization of complex agent logic.",
  },
];

const agentGuidelines = [
  {
    title: "Define Clear Objectives",
    content:
      "Start by clearly defining what you want your agent to accomplish. Break down complex tasks into smaller, manageable steps.",
  },
  {
    title: "Design the Workflow",
    content:
      "Map out the decision points and flow of your agent using If/Else nodes. Consider all possible paths and edge cases.",
  },
  {
    title: "Configure API Tools",
    content:
      "Add API nodes to connect to external services. Ensure you have the necessary API keys and understand the response formats.",
  },
  {
    title: "Set Up LLM Prompts",
    content:
      "Write clear, specific prompts for your LLM nodes. Include context, examples, and output format instructions.",
  },
  {
    title: "Handle Errors",
    content:
      "Use If nodes to check for errors and define fallback behavior. Do not let your agent fail silently.",
  },
  {
    title: "Test Thoroughly",
    content:
      "Use the Preview feature to test your agent with various inputs. Iterate on your design based on test results.",
  },
];

function searchTools(query: string): string[] {
  const normalizedQuery = query.toLowerCase();
  const results: string[] = [];

  tools.forEach((tool) => {
    const toolKeywords = [
      tool.label.toLowerCase(),
      tool.type.toLowerCase(),
      tool.description.toLowerCase(),
      tool.details.toLowerCase(),
    ];

    const isMatch = toolKeywords.some(
      (keyword) =>
        keyword.includes(normalizedQuery) ||
        normalizedQuery.split(" ").some((word) => word.length > 2 && keyword.includes(word))
    );

    if (
      isMatch ||
      normalizedQuery.includes(tool.type) ||
      normalizedQuery.includes(tool.label.toLowerCase())
    ) {
      results.push(
        `**${tool.label} (${tool.type})**\n${tool.details}\n\nNote: ${tool.description}`
      );
    }
  });

  return results;
}

function searchGuidelines(query: string): string[] {
  const normalizedQuery = query.toLowerCase();
  const results: string[] = [];

  agentGuidelines.forEach((guide, index) => {
    const guideKeywords = [guide.title.toLowerCase(), guide.content.toLowerCase()];

    const isMatch = guideKeywords.some(
      (keyword) =>
        keyword.includes(normalizedQuery) ||
        normalizedQuery.split(" ").some((word) => word.length > 2 && keyword.includes(word))
    );

    if (isMatch || normalizedQuery.includes(guide.title.toLowerCase().split(" ")[0])) {
      results.push(`**${index + 1}. ${guide.title}**\n${guide.content}`);
    }
  });

  return results;
}

function generateLocalResponse(prompt: string): string | null {
  const normalized = prompt.toLowerCase();
  const toolResults = searchTools(normalized);
  const guidelineResults = searchGuidelines(normalized);

  if (normalized.includes("tool") || normalized.includes("api") || normalized.includes("node")) {
    if (toolResults.length > 0) {
      return `I found information about the following tools:\n\n${toolResults.join(
        "\n\n---\n\n"
      )}\n\nTip: Click a tool in the Tools list to learn more.`;
    }
  }

  if (
    normalized.includes("guide") ||
    normalized.includes("how to") ||
    normalized.includes("tutorial") ||
    normalized.includes("create") ||
    normalized.includes("build")
  ) {
    if (guidelineResults.length > 0) {
      return `Here are some guidelines for creating agents:\n\n${guidelineResults.join(
        "\n\n"
      )}\n\nReady to start building? Head to the Agent Builder to create your first agent.`;
    }
  }

  if (normalized.includes("start")) {
    const startTool = tools.find((t) => t.type === "start");
    if (startTool) return `**Start Node**\n${startTool.details}\n\nNote: ${startTool.description}`;
  }
  if (normalized.includes("end")) {
    const endTool = tools.find((t) => t.type === "end");
    if (endTool) return `**End Node**\n${endTool.details}\n\nNote: ${endTool.description}`;
  }
  if (normalized.includes("if") || normalized.includes("else") || normalized.includes("condition")) {
    const ifTool = tools.find((t) => t.type === "if");
    if (ifTool) return `**If/Else Node**\n${ifTool.details}\n\nNote: ${ifTool.description}`;
  }
  if (normalized.includes("while") || normalized.includes("loop") || normalized.includes("repeat")) {
    const whileTool = tools.find((t) => t.type === "while");
    if (whileTool) return `**While Loop Node**\n${whileTool.details}\n\nNote: ${whileTool.description}`;
  }
  if (
    normalized.includes("llm") ||
    normalized.includes("gpt") ||
    normalized.includes("language model") ||
    normalized.includes("ai model")
  ) {
    const llmTool = tools.find((t) => t.type === "llm");
    if (llmTool) return `**LLM Node**\n${llmTool.details}\n\nNote: ${llmTool.description}`;
  }
  if (normalized.includes("approval") || normalized.includes("human") || normalized.includes("confirm")) {
    const approvalTool = tools.find((t) => t.type === "userApproval");
    if (approvalTool)
      return `**User Approval Node**\n${approvalTool.details}\n\nNote: ${approvalTool.description}`;
  }
  if (
    normalized.includes("workflow") ||
    normalized.includes("sub-workflow") ||
    normalized.includes("sub workflow")
  ) {
    const workflowTool = tools.find((t) => t.type === "workflow");
    if (workflowTool)
      return `**Sub-Workflow Node**\n${workflowTool.details}\n\nNote: ${workflowTool.description}`;
  }
  if (normalized.includes("agent") && !normalized.includes("api")) {
    const agentTool = tools.find((t) => t.type === "agent");
    if (agentTool) return `**Agent Node**\n${agentTool.details}\n\nNote: ${agentTool.description}`;
  }
  if (
    normalized.includes("api") ||
    normalized.includes("http") ||
    normalized.includes("external") ||
    normalized.includes("endpoint")
  ) {
    const apiTool = tools.find((t) => t.type === "api");
    if (apiTool) {
      return `**API Node**\n${apiTool.details}\n\nNote: ${apiTool.description}\n\nTo use API nodes, configure:\n- API URL\n- HTTP Method (GET, POST, PUT, DELETE)\n- Headers (if needed)\n- API Key (for authentication)\n- Request body (for POST/PUT)`;
    }
  }

  if (toolResults.length > 0) {
    return `Here are some tools that might help:\n\n${toolResults
      .slice(0, 3)
      .join("\n\n---\n\n")}\n\nTip: Type "show all tools" to see all available tools.`;
  }

  if (normalized.includes("hello") || normalized.includes("hi") || normalized.includes("hey")) {
    return "Hello! I'm Nova AI Assistant, ready to help you create professional AI agents. You can ask me about tools, guidelines, and best practices.";
  }

  if (normalized.includes("help")) {
    return `I can help you with:\n\n- Tool information: Ask "what is the API tool?" or "show me the LLM node"\n- Guidelines: Ask "how to create an agent" or "show me guidelines"\n- General questions: Ask anything about agent building\n\nWhat would you like to explore?`;
  }

  return null;
}

const AgentPreviewModal: React.FC<AgentPreviewModalProps> = ({
  open,
  onOpenChange,
}) => {
  const [chatPrompt, setChatPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [openAIKey, setOpenAIKey] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      content:
        "Welcome to NOVA. I'm Nova AI Assistant, here to help you create professional agents.\n\nI can help you with:\n- Guidelines for building agents\n- Tool information and how each node works\n- Real-time chat about your workflow\n\nAvailable tools:\n- Start\n- End\n- If/Else\n- While Loop\n- Agent\n- API\n- LLM\n- User Approval\n- Sub-Workflow\n\nGetting started:\n1. Click Tools to see all building blocks\n2. Click a tool to read details\n3. Or just chat with me directly\n\nWhat would you like to explore?",
      timestamp: new Date(),
      type: "text",
    },
  ]);
  const messagesStartRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [toolsOpen, setToolsOpen] = useState(false);

  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const recognitionRef = useRef<any>(null);

  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speechSynthesis, setSpeechSynthesis] = useState<SpeechSynthesis | null>(null);

  useEffect(() => {
    if (!open) return;

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      setSpeechSupported(true);
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = "en-US";

      recognitionRef.current.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((result: any) => result[0])
          .map((result: any) => result.transcript)
          .join("");

        setChatPrompt(transcript);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }

    if (typeof window !== "undefined" && window.speechSynthesis) {
      setSpeechSynthesis(window.speechSynthesis);
    }

    const stored = localStorage.getItem("dashboard-preview-keys");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setOpenAIKey(parsed.openAIKey || "");
      } catch {
        // Ignore corrupted localStorage values
      }
    }
  }, [open]);

  const persistKeys = () => {
    localStorage.setItem("dashboard-preview-keys", JSON.stringify({ openAIKey }));
  };

  const startListening = () => {
    if (recognitionRef.current && !isListening) {
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  };

  const speakMessage = (text: string) => {
    if (speechSynthesis && !isSpeaking) {
      speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1;
      utterance.pitch = 1;

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);

      speechSynthesis.speak(utterance);
    }
  };

  const stopSpeaking = () => {
    if (speechSynthesis) {
      speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  };

  const handleSendMessage = async () => {
    if (!chatPrompt.trim() || isGenerating) return;

    const currentPrompt = chatPrompt.trim();

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: currentPrompt,
      timestamp: new Date(),
      type: "text",
    };

    setMessages((prev) => [...prev, userMessage]);
    setChatPrompt("");
    setIsGenerating(true);
    persistKeys();

    try {
      const localResponse = generateLocalResponse(currentPrompt);

      if (localResponse) {
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: localResponse,
          timestamp: new Date(),
          type: "text",
        };
        setMessages((prev) => [...prev, assistantMessage]);
        setIsGenerating(false);
        return;
      }

      const response = await fetch("/api/openai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: currentPrompt,
          type: "chat",
          providerApiKey: openAIKey || undefined,
          systemPrompt: `You are NOVA, a helpful AI assistant specialized in helping users create AI agents.

You have knowledge about:
1. Agent Builder - A no-code platform for creating AI agents
2. Available Tools: Start, End, If/Else, While Loop, Agent, API, LLM, User Approval, Sub-Workflow
3. Best practices for designing agent workflows

Guidelines for users:
- Always be helpful and concise
- When users ask about tools, provide detailed explanations
- When users ask for guidelines, explain the agent creation process
- Use a friendly, professional tone
- Format your responses with markdown for better readability`,
        }),
      });

      const data = await response.json();

      const isFallback =
        data.provider === "local-fallback" ||
        !data.message ||
        data.message.includes("Preview response");

      if (isFallback && openAIKey) {
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content:
            data.message ||
            "I could not process your request at the moment. Please try again.",
          timestamp: new Date(),
          type: "text",
        };
        setMessages((prev) => [...prev, assistantMessage]);
      } else if (isFallback) {
        const helpfulResponse =
          "I can help you with tool information and agent-building guidance. You can also click Tools to explore available nodes. To enable AI-powered responses, add your OpenAI API key in the settings.";

        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: helpfulResponse,
          timestamp: new Date(),
          type: "text",
        };
        setMessages((prev) => [...prev, assistantMessage]);
      } else {
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: data.message,
          timestamp: new Date(),
          type: "text",
        };
        setMessages((prev) => [...prev, assistantMessage]);
      }
    } catch (error) {
      const errorResponse = generateLocalResponse(currentPrompt);

      if (errorResponse) {
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: errorResponse,
          timestamp: new Date(),
          type: "text",
        };
        setMessages((prev) => [...prev, assistantMessage]);
      } else {
        const errorMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content:
            "I encountered an error. Please try again or check your API key configuration.",
          timestamp: new Date(),
          type: "text",
        };
        setMessages((prev) => [...prev, errorMessage]);
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleToolClick = (tool: (typeof tools)[0]) => {
    const toolInfoMessage: Message = {
      id: Date.now().toString(),
      role: "assistant",
      content: `**${tool.label} Tool**\n\n${tool.details}\n\nYou can use this tool in the Agent Builder to ${tool.description.toLowerCase()}.`,
      timestamp: new Date(),
      type: "tool_info",
    };
    setMessages((prev) => [...prev, toolInfoMessage]);
    setToolsOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl h-[90vh] p-0 overflow-hidden bg-gradient-to-br from-white to-slate-50">
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/10 rounded-lg">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <div>
                <DialogTitle className="flex items-center gap-2 text-white">
                  <Bot className="h-5 w-5" />
                  NOVA AI Assistant
                </DialogTitle>
                <DialogDescription className="text-white/70 text-xs">
                  Fast preview with tools and chat
                </DialogDescription>
              </div>
            </div>
            <div className="px-3 py-1 bg-white/10 rounded-full">
              <span className="text-xs text-white font-medium">Preview</span>
            </div>
          </div>
        </div>

        <div className="flex-1 h-full overflow-hidden">
          <div className="h-full flex">
            <div className="flex-1 flex flex-col bg-white">
            <div className="flex-1 p-4 overflow-y-scroll scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-slate-100 hover:scrollbar-thumb-slate-400">
              <div className="space-y-4">
                <div ref={messagesStartRef} />
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex gap-3 ${
                      message.role === "user" ? "justify-end" : "justify-start"
                    }`}
                  >
                      {message.role === "assistant" && (
                        <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-700 flex items-center justify-center flex-shrink-0 shadow-lg">
                          <Bot className="h-5 w-5 text-white" />
                        </div>
                      )}
                      <div
                        className={`max-w-[80%] rounded-2xl p-4 ${
                          message.role === "user"
                            ? "bg-gradient-to-r from-slate-800 to-slate-700 text-white shadow-lg"
                            : message.type === "tool_info"
                            ? "bg-slate-50 text-slate-900 border border-slate-200 shadow-sm"
                            : message.type === "guide"
                            ? "bg-amber-50 text-slate-900 border border-amber-200 shadow-sm"
                            : "bg-white text-slate-900 border border-slate-200 shadow-sm"
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap leading-relaxed">
                          {message.content}
                        </p>
                        <div
                          className={`flex items-center justify-between mt-3 pt-2 border-t ${
                            message.role === "user" ? "border-white/20" : "border-slate-200"
                          }`}
                        >
                          <span className="text-xs opacity-70">
                            {message.timestamp.toLocaleTimeString()}
                          </span>
                          {message.role === "assistant" && (
                            <div className="flex gap-2">
                              <button
                                onClick={() =>
                                  isSpeaking ? stopSpeaking() : speakMessage(message.content)
                                }
                                className="hover:text-slate-700 transition-colors"
                                title="Read aloud"
                              >
                                {isSpeaking ? (
                                  <VolumeX className="h-3 w-3" />
                                ) : (
                                  <Volume2 className="h-3 w-3" />
                                )}
                              </button>
                              <button
                                onClick={() => copyToClipboard(message.content, message.id)}
                                className="hover:text-slate-700 transition-colors"
                              >
                                {copiedId === message.id ? (
                                  <Check className="h-3 w-3" />
                                ) : (
                                  <Copy className="h-3 w-3" />
                                )}
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                      {message.role === "user" && (
                        <div className="h-10 w-10 rounded-2xl bg-slate-200 flex items-center justify-center flex-shrink-0 shadow-md">
                          <User className="h-5 w-5 text-slate-600" />
                        </div>
                      )}
                    </div>
                  ))}
                  {isGenerating && (
                    <div className="flex gap-3 justify-start">
                      <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-700 flex items-center justify-center shadow-lg">
                        <Bot className="h-5 w-5 text-white" />
                      </div>
                      <div className="bg-white rounded-2xl p-4 border border-slate-200">
                        <div className="flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin text-slate-700" />
                          <span className="text-sm text-slate-600">Thinking...</span>
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              </div>

              <div className="p-4 border-t bg-white/80 backdrop-blur-sm">
                <div className="flex gap-2 items-center">
                  <div className="flex-1 relative">
                    <Popover open={toolsOpen} onOpenChange={setToolsOpen}>
                      <PopoverTrigger asChild>
                        <button
                          className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition"
                          title="Tools"
                          type="button"
                        >
                          <Layers className="h-4 w-4" />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent align="start" className="w-80 p-3">
                        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                          Tools
                        </div>
                        <div className="mt-3 space-y-2">
                          {tools.map((tool) => (
                            <button
                              key={tool.type}
                              type="button"
                              onClick={() => handleToolClick(tool)}
                              className="w-full flex items-center gap-3 p-2 rounded-lg border bg-white hover:bg-slate-50 transition text-left"
                            >
                              <div
                                className={`p-2 rounded-lg ${tool.color} ${tool.shadow} shadow-md`}
                              >
                                <tool.icon className="h-4 w-4 text-white" />
                              </div>
                              <div>
                                <p className="text-sm font-medium text-slate-800">{tool.label}</p>
                                <p className="text-xs text-slate-500">{tool.description}</p>
                              </div>
                            </button>
                          ))}
                        </div>
                      </PopoverContent>
                    </Popover>
                    <Input
                      value={chatPrompt}
                      onChange={(e) => setChatPrompt(e.target.value)}
                      onKeyDown={handleKeyPress}
                      placeholder="Type your message or click mic to speak"
                      className="pl-12 pr-24 h-12 rounded-xl border-2 border-slate-200 focus:border-slate-400 focus:ring-slate-200"
                      disabled={isGenerating}
                    />
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                      {speechSupported && (
                        <button
                          onClick={isListening ? stopListening : startListening}
                          className={`p-2 rounded-lg transition-colors ${
                            isListening
                              ? "bg-red-100 text-red-600 animate-pulse"
                              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                          }`}
                          title={isListening ? "Stop listening" : "Start voice input"}
                          type="button"
                        >
                          {isListening ? (
                            <MicOff className="h-4 w-4" />
                          ) : (
                            <Mic className="h-4 w-4" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                  <Button
                    onClick={handleSendMessage}
                    disabled={isGenerating || !chatPrompt.trim()}
                    className="h-12 w-12 rounded-xl bg-slate-900 hover:bg-slate-800 shadow-lg transition-all hover:scale-105"
                  >
                    {isGenerating ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <Send className="h-5 w-5" />
                    )}
                  </Button>
                </div>

                {isListening && (
                  <div className="flex items-center gap-2 mt-2 text-sm text-red-500">
                    <Mic className="h-4 w-4 animate-pulse" />
                    <span>Listening... Speak now</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AgentPreviewModal;
