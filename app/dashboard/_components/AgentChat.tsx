"use client";

import React, { useContext, useEffect, useRef, useState } from "react";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { UserDetailContext } from "@/context/UserDetailsContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/components/ui/use-toast";
import {
  Activity,
  Bot,
  Check,
  Copy,
  Download,
  Layers,
  Loader2,
  MessageCircle,
  Send,
  Trash2,
  User,
} from "lucide-react";
import type { CustomTool } from "@/types/agent-builder";

interface Message {
  _id: string;
  agentId: string;
  userId: string | Id<"UserTable">;
  message: string;
  sender: "user" | "agent";
  timestamp: number;
  metadata?: unknown;
}

interface AgentChatProps {
  agentId: string;
  className?: string;
}

type AgentConfigNode = {
  id: string;
  type?: string;
  data?: {
    label?: string;
    config?: Record<string, unknown>;
  };
  config?: Record<string, unknown>;
};

type SavedAgentSettings = {
  agentName?: string;
  instructions?: string;
  includeChatHistory?: boolean;
  model?: string;
  outputFormat?: "text" | "json";
};

type RealtimeState = {
  status: "online" | "idle" | "offline";
  isTyping: boolean;
  unreadCount: number;
  messageCount: number;
  lastSeenAt: number | null;
  lastViewedAt: number | null;
  lastMessageAt: number | null;
  lastSnippet: string;
};

const visibleTools = [
  { id: "start", name: "Start", description: "Workflow entry point" },
  { id: "llm", name: "LLM", description: "AI language model response" },
  { id: "api", name: "API", description: "External API call" },
];

function looksLikeLocationPrompt(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (trimmed.includes(",")) return true;
  return /^[A-Za-z\s.-]{2,},?\s+[A-Za-z\s.-]{2,}$/.test(trimmed);
}

function extractCurrencyCode(value: string) {
  const trimmed = value.trim().toUpperCase();
  if (/^[A-Z]{3}$/.test(trimmed)) return trimmed;
  const match = trimmed.match(/\b[A-Z]{3}\b/);
  return match?.[0] || null;
}

function extractIpAddress(value: string) {
  return value.match(/\b(?:\d{1,3}\.){3}\d{1,3}\b/)?.[0] || null;
}

function extractNumberValue(value: string) {
  return value.match(/\b\d+\b/)?.[0] || null;
}

function looksLikeTimezonePrompt(value: string) {
  return /[A-Za-z_]+\/[A-Za-z_]+(?:\/[A-Za-z_]+)?/.test(value.trim());
}

function looksLikeCryptoPrompt(value: string) {
  return /(bitcoin|ethereum|dogecoin|solana|ripple|cardano|tron|crypto)/i.test(value);
}

function looksLikeJokePrompt(value: string) {
  return /\bjoke\b|\bfunny\b/i.test(value);
}

function looksLikeCountryPrompt(value: string) {
  const trimmed = value.trim();
  return /^[A-Za-z\s-]{3,}$/.test(trimmed) && !looksLikeLocationPrompt(trimmed);
}

function extractWeatherLocation(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return trimmed;
  return trimmed
    .replace(/^(what(?:'s| is)?\s+the\s+)?weather\s+(?:like\s+)?(?:for|in)\s+/i, "")
    .replace(/^weather\s+/i, "")
    .trim();
}

function formatPresence(state: RealtimeState | undefined) {
  if (!state) return "Syncing live state";
  if (state.isTyping) return "Draft in progress";
  if (state.status === "online") return "Live now";
  if (state.status === "idle") return "Idle but connected";
  if (state.lastSeenAt) {
    return `Last active ${new Date(state.lastSeenAt).toLocaleTimeString()}`;
  }
  return "Waiting for first activity";
}

export default function AgentChat({ agentId, className = "" }: AgentChatProps) {
  const { userDetail } = useContext(UserDetailContext);
  const { isAuthenticated } = useConvexAuth();
  const { toast } = useToast();
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingStateRef = useRef(false);

  const userId = userDetail?._id as Id<"UserTable">;

  const messages = (useQuery(
    api.agent.GetAgentChatSubscriptionData,
    userId ? { agentId, userId } : "skip"
  ) || []) as Message[];
  const customTools = (useQuery(api.agent.GetAgentCustomTools, { agentId }) || []) as CustomTool[];
  const agent = useQuery(api.agent.GetAgentById, { agentId });
  const realtimeState = useQuery(
    api.agent.GetAgentRealtimeState,
    userId ? { agentId, userId } : "skip"
  ) as RealtimeState | undefined;
  const saveMessage = useMutation(api.agent.SaveChatMessage);
  const touchSession = useMutation(api.agent.TouchAgentSession);
  const touchAgentOpen = useMutation(api.agent.TouchAgentOpen);
  const clearChatHistory = useMutation(api.agent.ClearAgentChatHistory);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isSending]);

  useEffect(() => {
    if (!userId || !isAuthenticated) return;

    void touchAgentOpen({
      agentId,
      userId,
    });

    void touchSession({
      agentId,
      userId,
      status: "online",
      markViewed: true,
    });

    const intervalId = window.setInterval(() => {
      void touchSession({
        agentId,
        userId,
        status: "online",
        markViewed: true,
      });
    }, 45000);

    return () => {
      window.clearInterval(intervalId);
      void touchSession({
        agentId,
        userId,
        status: "idle",
        isTyping: false,
      });
    };
  }, [agentId, isAuthenticated, touchAgentOpen, touchSession, userId]);

  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    if (!lastMessage || lastMessage.sender !== "agent" || !userId) return;

    void touchSession({
      agentId,
      userId,
      status: "online",
      markViewed: true,
    });
  }, [agentId, messages, touchSession, userId]);

  const isDrafting = input.trim().length > 0;
  useEffect(() => {
    if (!userId || !isAuthenticated) return;
    if (typingStateRef.current === isDrafting) return;

    const timeoutId = window.setTimeout(() => {
      typingStateRef.current = isDrafting;
      void touchSession({
        agentId,
        userId,
        status: "online",
        isTyping: isDrafting,
      });
    }, 250);

    return () => window.clearTimeout(timeoutId);
  }, [agentId, isAuthenticated, isDrafting, touchSession, userId]);

  const getConfigNodes = () =>
    (((agent?.config as { nodes?: AgentConfigNode[] } | undefined)?.nodes) || []).filter(Boolean);

  const getAgentSettings = (): SavedAgentSettings =>
    ((agent?.config as { settings?: SavedAgentSettings } | undefined)?.settings || {});

  const buildSystemPrompt = () => {
    const settings = getAgentSettings();
    const workflowNodes = getConfigNodes().map((node) => ({
      id: node.id,
      type: node.type || "default",
      label: node.data?.label || node.config?.name || "Node",
      config: node.data?.config || node.config || {},
    }));

    const summarizedNodes = workflowNodes.map((node) => {
      const config = node.config || {};
      const summaryParts = [
        config.apiCallName ? `api call ${String(config.apiCallName)}` : null,
        config.apiUrl ? `url ${String(config.apiUrl)}` : null,
        config.method ? `method ${String(config.method)}` : null,
        config.condition ? `condition ${String(config.condition)}` : null,
      ].filter(Boolean);

      return `- ${node.label} [${node.type}]${summaryParts.length ? `: ${summaryParts.join(", ")}` : ""}`;
    });

    return [
      `You are ${settings.agentName || agent?.name || "a NOVA agent"}.`,
      settings.instructions || "Help the user clearly and use tools only when needed.",
      "Do not output source code, generated runtime files, JSON config dumps, or internal workflow data unless the user explicitly asks for code.",
      workflowNodes.length
        ? `Configured workflow:\n${summarizedNodes.join("\n")}`
        : "Configured workflow: none.",
      customTools.length
        ? `Available custom tools: ${customTools.map((tool) => tool.name).join(", ")}.`
        : "Available custom tools: none.",
    ].join("\n\n");
  };

  const looksLikeGeneratedCode = (value: string) =>
    /Auto-generated by NOVA Agent Builder|module\.exports\s*=|const AGENT =|async function runAgent\(/.test(value);

  const tryRunMatchingTool = async (messageText: string) => {
    const normalized = messageText.toLowerCase();

    const matchingCustomTool = customTools.find((tool) =>
      [tool.name, tool.id, tool.description]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(normalized) || normalized.includes(value.toLowerCase()))
    );

    const matchingApiNode = getConfigNodes().find((node) => {
      const config = (node.data?.config || node.config || {}) as Record<string, unknown>;
      const label = String(node.data?.label || config.name || "").toLowerCase();
      const apiUrl = String(config.apiUrl || "");
      return Boolean(apiUrl) && Boolean(label) && normalized.includes(label);
    });

    const locationAwareApiNode = getConfigNodes().find((node) => {
      const config = (node.data?.config || node.config || {}) as Record<string, unknown>;
      const label = String(node.data?.label || config.name || "").toLowerCase();
      const apiUrl = String(config.apiUrl || "");
      return (
        Boolean(apiUrl) &&
        (apiUrl.includes("/api/location-intel") ||
          label.includes("weather") ||
          label.includes("location") ||
          label.includes("city") ||
          label.includes("country") ||
          label.includes("timezone"))
      );
    });

    const locationAwareCustomTool = customTools.find((tool) =>
      Boolean(tool.apiUrl) &&
      ((tool.apiUrl || "").includes("/api/location-intel") ||
        tool.name.toLowerCase().includes("weather") ||
        tool.name.toLowerCase().includes("location") ||
        tool.name.toLowerCase().includes("city") ||
        tool.name.toLowerCase().includes("country"))
    );

    const currencyAwareApiNode = getConfigNodes().find((node) => {
      const config = (node.data?.config || node.config || {}) as Record<string, unknown>;
      const label = String(node.data?.label || config.name || "").toLowerCase();
      const apiUrl = String(config.apiUrl || "");
      return (
        Boolean(apiUrl) &&
        (apiUrl.includes("/api/currency-all") ||
          label.includes("currency") ||
          label.includes("exchange") ||
          label.includes("forex"))
      );
    });

    const currencyAwareCustomTool = customTools.find((tool) =>
      Boolean(tool.apiUrl) &&
      ((tool.apiUrl || "").includes("/api/currency-all") ||
        tool.name.toLowerCase().includes("currency") ||
        tool.name.toLowerCase().includes("exchange") ||
        tool.name.toLowerCase().includes("forex"))
    );

    const currencyCode = extractCurrencyCode(messageText);
    const ipAddress = extractIpAddress(messageText);
    const numberValue = extractNumberValue(messageText);
    const weatherLocation = extractWeatherLocation(messageText);

    const directRouteNode = (routeFragment: string, labels: string[]) =>
      getConfigNodes().find((node) => {
        const config = (node.data?.config || node.config || {}) as Record<string, unknown>;
        const label = String(node.data?.label || config.name || "").toLowerCase();
        const apiUrl = String(config.apiUrl || "");
        return (
          Boolean(apiUrl) &&
          (apiUrl.includes(routeFragment) || labels.some((item) => label.includes(item)))
        );
      });

    const directRouteTool = (routeFragment: string, labels: string[]) =>
      customTools.find(
        (tool) =>
          Boolean(tool.apiUrl) &&
          (((tool.apiUrl || "").includes(routeFragment) ||
            labels.some((item) => tool.name.toLowerCase().includes(item))))
      );

    const timezoneTool = directRouteTool("/api/timezone-info", ["timezone", "time"]);
    const timezoneNode = directRouteNode("/api/timezone-info", ["timezone", "time"]);
    const countryTool = directRouteTool("/api/country-info", ["country"]);
    const countryNode = directRouteNode("/api/country-info", ["country"]);
    const cryptoTool = directRouteTool("/api/crypto-price", ["crypto", "coin"]);
    const cryptoNode = directRouteNode("/api/crypto-price", ["crypto", "coin"]);
    const ipTool = directRouteTool("/api/ip-location", ["ip"]);
    const ipNode = directRouteNode("/api/ip-location", ["ip"]);
    const jokeTool = directRouteTool("/api/random-joke", ["joke"]);
    const jokeNode = directRouteNode("/api/random-joke", ["joke"]);
    const numberTool = directRouteTool("/api/number-fact", ["number", "fact"]);
    const numberNode = directRouteNode("/api/number-fact", ["number", "fact"]);

    const toolConfig = matchingCustomTool
      ? {
          name: matchingCustomTool.name,
          apiUrl: matchingCustomTool.apiUrl,
          method: matchingCustomTool.method || "GET",
          apiKey: matchingCustomTool.apiKey,
          apiKeyConfig: matchingCustomTool.apiKeyConfig,
        }
      : matchingApiNode
        ? {
            name: String(
              matchingApiNode.data?.label ||
                (matchingApiNode.data?.config || matchingApiNode.config || {}).name ||
                "API Tool"
            ),
            apiUrl: String(
              (matchingApiNode.data?.config || matchingApiNode.config || {}).apiUrl || ""
            ),
            method: String(
              (matchingApiNode.data?.config || matchingApiNode.config || {}).method || "GET"
            ),
            apiKey:
              String(
                (matchingApiNode.data?.config || matchingApiNode.config || {}).apiKey || ""
              ) || undefined,
            apiKeyConfig:
              (matchingApiNode.data?.config || matchingApiNode.config || {}).apiKeyConfig,
          }
        : !matchingCustomTool &&
            !matchingApiNode &&
            looksLikeLocationPrompt(messageText) &&
            locationAwareCustomTool
          ? {
              name: locationAwareCustomTool.name,
              apiUrl: locationAwareCustomTool.apiUrl,
              method: locationAwareCustomTool.method || "POST",
              apiKey: locationAwareCustomTool.apiKey,
              apiKeyConfig: locationAwareCustomTool.apiKeyConfig,
            }
          : !matchingCustomTool &&
              !matchingApiNode &&
              looksLikeLocationPrompt(messageText) &&
              locationAwareApiNode
            ? {
                name: String(
                  locationAwareApiNode.data?.label ||
                    (locationAwareApiNode.data?.config || locationAwareApiNode.config || {}).name ||
                    "Location API"
                ),
                apiUrl: String(
                  (locationAwareApiNode.data?.config || locationAwareApiNode.config || {}).apiUrl || ""
                ),
                method: String(
                  (locationAwareApiNode.data?.config || locationAwareApiNode.config || {}).method ||
                    "POST"
                ),
                apiKey:
                  String(
                    (locationAwareApiNode.data?.config || locationAwareApiNode.config || {}).apiKey ||
                      ""
                  ) || undefined,
                apiKeyConfig:
                  (locationAwareApiNode.data?.config || locationAwareApiNode.config || {})
                    .apiKeyConfig,
              }
            : !matchingCustomTool &&
                !matchingApiNode &&
                currencyCode &&
                currencyAwareCustomTool
              ? {
                  name: currencyAwareCustomTool.name,
                  apiUrl: currencyAwareCustomTool.apiUrl,
                  method: currencyAwareCustomTool.method || "POST",
                  apiKey: currencyAwareCustomTool.apiKey,
                  apiKeyConfig: currencyAwareCustomTool.apiKeyConfig,
                }
              : !matchingCustomTool &&
                  !matchingApiNode &&
                  currencyCode &&
                  currencyAwareApiNode
                ? {
                    name: String(
                      currencyAwareApiNode.data?.label ||
                        (currencyAwareApiNode.data?.config || currencyAwareApiNode.config || {})
                          .name ||
                        "Currency API"
                    ),
                    apiUrl: String(
                      (currencyAwareApiNode.data?.config || currencyAwareApiNode.config || {})
                        .apiUrl || ""
                    ),
                    method: String(
                      (currencyAwareApiNode.data?.config || currencyAwareApiNode.config || {})
                        .method || "POST"
                    ),
                    apiKey:
                      String(
                        (currencyAwareApiNode.data?.config || currencyAwareApiNode.config || {})
                          .apiKey || ""
                      ) || undefined,
                    apiKeyConfig:
                      (currencyAwareApiNode.data?.config || currencyAwareApiNode.config || {})
                        .apiKeyConfig,
                  }
                : null;

    const routeFallbackConfig =
      toolConfig ||
      (looksLikeTimezonePrompt(messageText) && timezoneTool
        ? {
            name: timezoneTool.name,
            apiUrl: timezoneTool.apiUrl,
            method: timezoneTool.method || "POST",
            apiKey: timezoneTool.apiKey,
            apiKeyConfig: timezoneTool.apiKeyConfig,
          }
        : looksLikeTimezonePrompt(messageText) && timezoneNode
          ? {
              name: String(
                timezoneNode.data?.label ||
                  (timezoneNode.data?.config || timezoneNode.config || {}).name ||
                  "Timezone API"
              ),
              apiUrl: String(
                (timezoneNode.data?.config || timezoneNode.config || {}).apiUrl || ""
              ),
              method: String(
                (timezoneNode.data?.config || timezoneNode.config || {}).method || "POST"
              ),
              apiKey:
                String((timezoneNode.data?.config || timezoneNode.config || {}).apiKey || "") ||
                undefined,
              apiKeyConfig:
                (timezoneNode.data?.config || timezoneNode.config || {}).apiKeyConfig,
            }
          : looksLikeCryptoPrompt(messageText) && cryptoTool
            ? {
                name: cryptoTool.name,
                apiUrl: cryptoTool.apiUrl,
                method: cryptoTool.method || "POST",
                apiKey: cryptoTool.apiKey,
                apiKeyConfig: cryptoTool.apiKeyConfig,
              }
            : looksLikeCryptoPrompt(messageText) && cryptoNode
              ? {
                  name: String(
                    cryptoNode.data?.label ||
                      (cryptoNode.data?.config || cryptoNode.config || {}).name ||
                      "Crypto API"
                  ),
                  apiUrl: String((cryptoNode.data?.config || cryptoNode.config || {}).apiUrl || ""),
                  method: String((cryptoNode.data?.config || cryptoNode.config || {}).method || "POST"),
                  apiKey:
                    String((cryptoNode.data?.config || cryptoNode.config || {}).apiKey || "") ||
                    undefined,
                  apiKeyConfig:
                    (cryptoNode.data?.config || cryptoNode.config || {}).apiKeyConfig,
                }
              : ipAddress && ipTool
                ? {
                    name: ipTool.name,
                    apiUrl: ipTool.apiUrl,
                    method: ipTool.method || "POST",
                    apiKey: ipTool.apiKey,
                    apiKeyConfig: ipTool.apiKeyConfig,
                  }
                : ipAddress && ipNode
                  ? {
                      name: String(
                        ipNode.data?.label ||
                          (ipNode.data?.config || ipNode.config || {}).name ||
                          "IP API"
                      ),
                      apiUrl: String((ipNode.data?.config || ipNode.config || {}).apiUrl || ""),
                      method: String((ipNode.data?.config || ipNode.config || {}).method || "POST"),
                      apiKey:
                        String((ipNode.data?.config || ipNode.config || {}).apiKey || "") ||
                        undefined,
                      apiKeyConfig: (ipNode.data?.config || ipNode.config || {}).apiKeyConfig,
                    }
                  : looksLikeJokePrompt(messageText) && jokeTool
                    ? {
                        name: jokeTool.name,
                        apiUrl: jokeTool.apiUrl,
                        method: jokeTool.method || "POST",
                        apiKey: jokeTool.apiKey,
                        apiKeyConfig: jokeTool.apiKeyConfig,
                      }
                    : looksLikeJokePrompt(messageText) && jokeNode
                      ? {
                          name: String(
                            jokeNode.data?.label ||
                              (jokeNode.data?.config || jokeNode.config || {}).name ||
                              "Joke API"
                          ),
                          apiUrl: String((jokeNode.data?.config || jokeNode.config || {}).apiUrl || ""),
                          method: String((jokeNode.data?.config || jokeNode.config || {}).method || "POST"),
                          apiKey:
                            String((jokeNode.data?.config || jokeNode.config || {}).apiKey || "") ||
                            undefined,
                          apiKeyConfig:
                            (jokeNode.data?.config || jokeNode.config || {}).apiKeyConfig,
                        }
                      : numberValue && numberTool
                        ? {
                            name: numberTool.name,
                            apiUrl: numberTool.apiUrl,
                            method: numberTool.method || "POST",
                            apiKey: numberTool.apiKey,
                            apiKeyConfig: numberTool.apiKeyConfig,
                          }
                        : numberValue && numberNode
                          ? {
                              name: String(
                                numberNode.data?.label ||
                                  (numberNode.data?.config || numberNode.config || {}).name ||
                                  "Number API"
                              ),
                              apiUrl: String((numberNode.data?.config || numberNode.config || {}).apiUrl || ""),
                              method: String((numberNode.data?.config || numberNode.config || {}).method || "POST"),
                              apiKey:
                                String((numberNode.data?.config || numberNode.config || {}).apiKey || "") ||
                                undefined,
                              apiKeyConfig:
                                (numberNode.data?.config || numberNode.config || {}).apiKeyConfig,
                            }
                          : looksLikeCountryPrompt(messageText) && countryTool
                            ? {
                                name: countryTool.name,
                                apiUrl: countryTool.apiUrl,
                                method: countryTool.method || "POST",
                                apiKey: countryTool.apiKey,
                                apiKeyConfig: countryTool.apiKeyConfig,
                              }
                            : looksLikeCountryPrompt(messageText) && countryNode
                              ? {
                                  name: String(
                                    countryNode.data?.label ||
                                      (countryNode.data?.config || countryNode.config || {}).name ||
                                      "Country API"
                                  ),
                                  apiUrl: String(
                                    (countryNode.data?.config || countryNode.config || {}).apiUrl || ""
                                  ),
                                  method: String(
                                    (countryNode.data?.config || countryNode.config || {}).method || "POST"
                                  ),
                                  apiKey:
                                    String(
                                      (countryNode.data?.config || countryNode.config || {}).apiKey || ""
                                    ) || undefined,
                                  apiKeyConfig:
                                    (countryNode.data?.config || countryNode.config || {}).apiKeyConfig,
                                }
                              : null);

    if (!routeFallbackConfig?.apiUrl) {
      return null;
    }

    const response = routeFallbackConfig.apiUrl.startsWith("/")
      ? await fetch(routeFallbackConfig.apiUrl, {
          method: routeFallbackConfig.method || "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: messageText,
            input: messageText,
            city: weatherLocation || messageText,
            location: weatherLocation || messageText,
            currency: currencyCode,
            base: currencyCode,
            timezone: messageText,
            country: weatherLocation || messageText,
            coin: messageText,
            ip: ipAddress,
            number: numberValue,
          }),
        })
      : await fetch("/api/custom-api", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            url: routeFallbackConfig.apiUrl,
            method: routeFallbackConfig.method,
            apiKey: routeFallbackConfig.apiKey,
            apiKeyConfig: routeFallbackConfig.apiKeyConfig,
            city: weatherLocation || undefined,
            body: {
              prompt: messageText,
              input: messageText,
              city: weatherLocation || messageText,
              location: weatherLocation || messageText,
              currency: currencyCode,
              base: currencyCode,
              timezone: messageText,
              country: weatherLocation || messageText,
              coin: messageText,
              ip: ipAddress,
              number: numberValue,
            },
            contentType: "application/json",
          }),
        });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.error || `Failed to call ${routeFallbackConfig.name}`);
    }

    const payload = result.data ?? result;
    return `Tool: ${routeFallbackConfig.name}\n${payload.text || JSON.stringify(payload, null, 2)}`;
  };

  const getAgentReply = async (messageText: string) => {
    const toolResult = await tryRunMatchingTool(messageText);
    if (toolResult) {
      return toolResult;
    }

    const response = await fetch("/api/openai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: messageText,
        type: "chat",
        systemPrompt: buildSystemPrompt(),
      }),
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.error || "Unable to get an agent response");
    }

    const reply = result.message || "No response received.";
    if (typeof reply === "string" && looksLikeGeneratedCode(reply)) {
      return "I found the agent configuration, but the response path returned generated runtime code instead of a chat answer. Ask a normal question or use a matching tool query.";
    }

    return reply;
  };

  const handleSend = async () => {
    if (!input.trim() || !isAuthenticated || !userId || isSending) return;

    const text = input.trim();
    setInput("");
    setIsSending(true);
    typingStateRef.current = false;

    try {
      await touchSession({
        agentId,
        userId,
        status: "online",
        isTyping: false,
        markViewed: true,
      });

      await saveMessage({
        agentId,
        userId,
        message: text,
        sender: "user",
      });

      const reply = await getAgentReply(text);

      await saveMessage({
        agentId,
        userId,
        message: reply,
        sender: "agent",
      });

      await touchSession({
        agentId,
        userId,
        status: "online",
        markViewed: true,
      });
    } catch (error) {
      await saveMessage({
        agentId,
        userId,
        message:
          error instanceof Error
            ? `Agent error: ${error.message}`
            : "Agent error: Unknown error",
        sender: "agent",
      });
    } finally {
      setIsSending(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const downloadTranscript = (format: "txt" | "json") => {
    const now = new Date().toISOString().replace(/[:.]/g, "-");
    const baseName = `${(getAgentSettings().agentName || agent?.name || "agent-chat")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")}-${now}`;
    const payload =
      format === "json"
        ? JSON.stringify(messages, null, 2)
        : messages
            .map(
              (msg) =>
                `[${new Date(msg.timestamp).toLocaleString()}] ${msg.sender.toUpperCase()}: ${msg.message}`
            )
            .join("\n\n");

    const blob = new Blob([payload], {
      type: format === "json" ? "application/json;charset=utf-8" : "text/plain;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${baseName}.${format}`;
    link.click();
    URL.revokeObjectURL(url);

    toast({
      title: "Transcript exported",
      description: `Chat exported as ${format.toUpperCase()}.`,
    });
  };

  const handleClearHistory = async () => {
    if (!userId || messages.length === 0) return;

    try {
      await clearChatHistory({
        agentId,
        userId,
      });
      toast({
        title: "Chat cleared",
        description: "Conversation history was removed for this agent.",
      });
    } catch (error) {
      toast({
        title: "Clear failed",
        description: error instanceof Error ? error.message : "Unable to clear chat history",
        variant: "destructive",
      });
    }
  };

  return (
    <div
      className={`flex h-[600px] overflow-hidden rounded-2xl border bg-white shadow-lg ${className}`}
    >
      <div className="w-64 border-r bg-slate-50">
        <div className="border-b p-4">
          <h3 className="flex items-center gap-2 font-semibold">
            <Layers className="h-4 w-4" />
            Tools
          </h3>
          <p className="mt-1 text-xs text-slate-500">
            Visible toolbar tools only. Live runtime routing stays active.
          </p>
        </div>
        <ScrollArea className="h-full">
          <div className="space-y-1 p-2">
            {visibleTools.map((tool) => (
              <button
                key={tool.id}
                className="flex w-full items-center gap-2 rounded-lg p-2 text-left text-sm hover:bg-slate-100"
                onClick={() => setInput((current) => `${current}${current ? " " : ""}${tool.name}`)}
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100">
                  <Layers className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <div className="font-medium">{tool.name}</div>
                  <div className="text-xs text-slate-500">{tool.description}</div>
                </div>
              </button>
            ))}
          </div>
        </ScrollArea>
      </div>

      <div className="flex flex-1 flex-col">
        <div className="border-b bg-white px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-sm font-semibold text-slate-900">
                {getAgentSettings().agentName || agent?.name || "Agent"}
              </div>
              <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                <Activity className="h-3.5 w-3.5" />
                {formatPresence(realtimeState)}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="text-right text-xs text-slate-500">
                <div>{realtimeState?.messageCount ?? messages.length} total messages</div>
                <div>{realtimeState?.unreadCount ?? 0} unread elsewhere</div>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-xl"
                onClick={() => downloadTranscript("txt")}
                disabled={messages.length === 0}
              >
                <Download className="h-4 w-4" />
                TXT
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-xl"
                onClick={() => downloadTranscript("json")}
                disabled={messages.length === 0}
              >
                <Download className="h-4 w-4" />
                JSON
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="rounded-xl text-slate-500"
                onClick={() => void handleClearHistory()}
                disabled={messages.length === 0}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        <ScrollArea className="flex-1 p-6">
          {messages.length === 0 ? (
            <div className="flex h-64 flex-col items-center justify-center text-slate-500">
              <MessageCircle className="mb-4 h-12 w-12 opacity-50" />
              <p className="mb-1 text-lg font-medium">Start a conversation</p>
              <p className="text-sm">Your live chat history will appear here</p>
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg._id}
                className={`mb-6 ${msg.sender === "user" ? "flex justify-end" : "flex gap-4"}`}
              >
                {msg.sender === "agent" && (
                  <Avatar className="h-10 w-10 flex-shrink-0">
                    <AvatarFallback className="bg-gradient-to-br from-slate-800 to-slate-700">
                      <Bot className="h-5 w-5 text-white" />
                    </AvatarFallback>
                  </Avatar>
                )}
                <div
                  className={`max-w-[70%] rounded-2xl p-4 shadow ${
                    msg.sender === "user"
                      ? "bg-gradient-to-r from-blue-600 to-blue-700 text-white"
                      : "border border-slate-200 bg-white"
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.message}</p>
                  <div
                    className={`mt-3 flex items-center justify-between border-t pt-2 ${
                      msg.sender === "user" ? "border-white/30" : "border-slate-200"
                    }`}
                  >
                    <span className="text-xs opacity-75">
                      {new Date(msg.timestamp).toLocaleTimeString()}
                    </span>
                    <button
                      onClick={() => copyToClipboard(msg.message, msg._id)}
                      className="rounded-full p-1 transition hover:bg-black/5"
                    >
                      {copiedId === msg._id ? (
                        <Check className="h-3 w-3" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </button>
                  </div>
                </div>
                {msg.sender === "user" && (
                  <Avatar className="order-first h-10 w-10 flex-shrink-0">
                    <AvatarImage src="" />
                    <AvatarFallback className="bg-slate-200">
                      <User className="h-5 w-5 text-slate-600" />
                    </AvatarFallback>
                  </Avatar>
                )}
              </div>
            ))
          )}
          {isSending && (
            <div className="mb-6 flex gap-4">
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-gradient-to-br from-slate-800 to-slate-700">
                  <Bot className="h-5 w-5 text-white" />
                </AvatarFallback>
              </Avatar>
              <div className="max-w-[70%] rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm text-slate-600">Agent is typing...</span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </ScrollArea>

        <div className="border-t bg-slate-50 p-6">
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
              placeholder="Type your message..."
              className="flex-1"
              disabled={!isAuthenticated || isSending}
            />
            <Button onClick={handleSend} disabled={!input.trim() || isSending || !isAuthenticated}>
              {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
