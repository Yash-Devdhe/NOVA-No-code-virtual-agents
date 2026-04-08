"use client";

import React, { useContext, useMemo, useState } from "react";
import { useToast } from "@/components/ui/use-toast";
import { useMutation, useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { UserDetailContext } from "@/context/UserDetailsContext";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import {
  ArrowUpRight,
  Clock3,
  GitBranchPlus,
  MessageCircle,
  Pin,
  Radio,
  Search,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import moment from "moment";

type AgentCard = {
  _id: string;
  _creationTime: number;
  agentId: string;
  name: string;
  published?: boolean;
  userId: string;
  status: "online" | "idle" | "offline";
  isTyping: boolean;
  unreadCount: number;
  messageCount: number;
  lastSeenAt: number | null;
  lastMessageAt: number | null;
  lastSnippet: string;
  lastActivityAt: number;
  pinned?: boolean;
  lastOpenedAt?: number | null;
};

type FilterMode = "all" | "live" | "pinned" | "unread";
type SortMode = "lastUsed" | "activity" | "name" | "unread";

const statusStyles: Record<AgentCard["status"], string> = {
  online: "bg-emerald-50 text-emerald-700",
  idle: "bg-amber-50 text-amber-700",
  offline: "bg-slate-100 text-slate-600",
};

const statusLabel: Record<AgentCard["status"], string> = {
  online: "Live",
  idle: "Idle",
  offline: "Offline",
};

const MyAgents = () => {
  const { userDetail } = useContext(UserDetailContext);
  const router = useRouter();
  const { toast } = useToast();
  const [deletingAgent, setDeletingAgent] = useState<string | null>(null);
  const [pinningAgent, setPinningAgent] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterMode, setFilterMode] = useState<FilterMode>("all");
  const [sortMode, setSortMode] = useState<SortMode>("lastUsed");

  const userId = userDetail?._id as Id<"UserTable"> | undefined;
  const queryArgs = userId ? { userId } : "skip";
  const agentCards = (useQuery(api.agent.GetUserAgentRealtimeCards, queryArgs) || []) as AgentCard[];

  const deleteAgentMutation = useMutation(api.agent.DeleteAgent);
  const togglePinnedMutation = useMutation(api.agent.TogglePinnedAgent);
  const touchAgentOpenMutation = useMutation(api.agent.TouchAgentOpen);

  const filteredAgents = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    const matchesSearch = (agent: AgentCard) =>
      !normalizedSearch ||
      agent.name.toLowerCase().includes(normalizedSearch) ||
      agent.lastSnippet.toLowerCase().includes(normalizedSearch);

    const matchesFilter = (agent: AgentCard) => {
      switch (filterMode) {
        case "live":
          return agent.status === "online" || agent.isTyping;
        case "pinned":
          return Boolean(agent.pinned);
        case "unread":
          return agent.unreadCount > 0;
        default:
          return true;
      }
    };

    const sorted = [...agentCards]
      .filter((agent) => matchesSearch(agent) && matchesFilter(agent))
      .sort((left, right) => {
        if (Boolean(left.pinned) !== Boolean(right.pinned)) {
          return left.pinned ? -1 : 1;
        }

        switch (sortMode) {
          case "name":
            return left.name.localeCompare(right.name);
          case "unread":
            return (
              right.unreadCount - left.unreadCount ||
              right.lastActivityAt - left.lastActivityAt
            );
          case "activity":
            return right.lastActivityAt - left.lastActivityAt;
          case "lastUsed":
          default:
            return (
              (right.lastOpenedAt ?? right.lastActivityAt) -
              (left.lastOpenedAt ?? left.lastActivityAt)
            );
        }
      });

    return sorted;
  }, [agentCards, filterMode, searchTerm, sortMode]);

  const deleteAgent = async (agentId: string) => {
    if (!userId) return;

    try {
      setDeletingAgent(agentId);
      await deleteAgentMutation({
        agentId,
        userId,
      });

      toast({
        title: "Agent deleted",
        description: "Agent and related chat history were removed.",
      });
      router.refresh();
    } catch (error) {
      toast({
        title: "Delete failed",
        description: error instanceof Error ? error.message : "Failed to delete agent",
        variant: "destructive",
      });
    } finally {
      setDeletingAgent(null);
    }
  };

  const touchOpen = async (agentId: string) => {
    if (!userId) return;
    await touchAgentOpenMutation({ agentId, userId });
  };

  const handleAgentClick = async (agent: AgentCard) => {
    await touchOpen(agent.agentId);
    router.push(`/agent-builder/${agent.agentId}`);
  };

  const handleChatClick = async (agent: AgentCard, e: React.MouseEvent) => {
    e.stopPropagation();
    await touchOpen(agent.agentId);
    router.push(`/dashboard/chats/${agent.agentId}`);
  };

  const handleTogglePin = async (agent: AgentCard, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!userId) return;

    try {
      setPinningAgent(agent.agentId);
      const result = await togglePinnedMutation({
        agentId: agent.agentId,
        userId,
      });
      toast({
        title: result.pinned ? "Agent pinned" : "Agent unpinned",
        description: result.pinned
          ? `${agent.name} moved to your favorites.`
          : `${agent.name} removed from favorites.`,
      });
    } catch (error) {
      toast({
        title: "Pin update failed",
        description: error instanceof Error ? error.message : "Unable to update favorite state",
        variant: "destructive",
      });
    } finally {
      router.refresh();
      setPinningAgent(null);
    }
  };

  return (
    <div className="w-full space-y-6">
      <div className="flex flex-col gap-4 rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_18px_40px_-28px_rgba(15,23,42,0.2)] lg:flex-row lg:items-center lg:justify-between">
        <div className="relative w-full max-w-md">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search agents or recent activity..."
            className="h-12 rounded-2xl border-slate-200 pl-11"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {(["all", "live", "pinned", "unread"] as FilterMode[]).map((mode) => (
            <Button
              key={mode}
              type="button"
              variant={filterMode === mode ? "default" : "outline"}
              className={`rounded-2xl ${
                filterMode === mode ? "bg-slate-950 text-white hover:bg-slate-800" : ""
              }`}
              onClick={() => setFilterMode(mode)}
            >
              {mode === "all"
                ? "All"
                : mode === "live"
                  ? "Live"
                  : mode === "pinned"
                    ? "Pinned"
                    : "Unread"}
            </Button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {(["lastUsed", "activity", "name", "unread"] as SortMode[]).map((mode) => (
            <Button
              key={mode}
              type="button"
              variant={sortMode === mode ? "secondary" : "ghost"}
              className="rounded-2xl"
              onClick={() => setSortMode(mode)}
            >
              {mode === "lastUsed"
                ? "Last Used"
                : mode === "activity"
                  ? "Recent Activity"
                  : mode === "name"
                    ? "Name"
                    : "Unread"}
            </Button>
          ))}
          <Button
            type="button"
            variant="outline"
            className="rounded-2xl"
            onClick={() => router.refresh()}
          >
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
        {filteredAgents.map((agent) => (
          <div
            key={agent._id}
            onClick={() => void handleAgentClick(agent)}
            className="group relative flex min-h-[250px] max-w-[370px] cursor-pointer flex-col gap-4 rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_22px_40px_-28px_rgba(15,23,42,0.28)] transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_26px_46px_-28px_rgba(15,23,42,0.34)]"
          >
            <div className="absolute right-3 top-3 flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                disabled={pinningAgent === agent.agentId}
                className="h-8 w-8 rounded-full p-0"
                onClick={(e) => void handleTogglePin(agent, e)}
              >
                <Pin
                  className={`h-4 w-4 ${
                    agent.pinned ? "fill-amber-400 text-amber-500" : "text-slate-500"
                  }`}
                />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 rounded-full p-0 opacity-0 transition-all group-hover:opacity-100"
                onClick={(e) => void handleChatClick(agent, e)}
              >
                <MessageCircle className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                disabled={deletingAgent === agent.agentId}
                className="h-8 w-8 rounded-full p-0 opacity-0 transition-all group-hover:opacity-100"
                onClick={(e) => {
                  e.stopPropagation();
                  void deleteAgent(agent.agentId);
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex-1">
              <div className="mb-5 flex h-[48px] w-full items-center justify-between rounded-[16px] bg-[#fff4b3] px-3 transition-colors group-hover:bg-[#ffef9b]">
                <GitBranchPlus className="h-6 w-6 text-slate-600" />
                <span
                  className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ${statusStyles[agent.status]}`}
                >
                  <Radio className="h-3 w-3" />
                  {agent.isTyping ? "Drafting" : statusLabel[agent.status]}
                </span>
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <h2 className="text-[1.15rem] font-semibold text-slate-950">
                    {agent.name}
                  </h2>
                  {agent.pinned ? (
                    <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700">
                      Favorite
                    </span>
                  ) : null}
                </div>
                <p className="text-sm font-medium text-slate-400">
                  Created {moment(agent._creationTime).fromNow()}
                </p>
                <p className="line-clamp-2 text-sm text-slate-500">
                  {agent.lastSnippet || "No live conversation activity yet."}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm text-slate-600">
              <div className="rounded-2xl bg-slate-50 px-4 py-3">
                <div className="text-xs uppercase tracking-[0.18em] text-slate-400">
                  Messages
                </div>
                <div className="mt-1 text-lg font-semibold text-slate-900">
                  {agent.messageCount}
                </div>
              </div>
              <div className="rounded-2xl bg-slate-50 px-4 py-3">
                <div className="text-xs uppercase tracking-[0.18em] text-slate-400">
                  Unread
                </div>
                <div className="mt-1 text-lg font-semibold text-slate-900">
                  {agent.unreadCount}
                </div>
              </div>
            </div>

            <div className="rounded-2xl bg-slate-50 px-4 py-3 text-xs text-slate-500">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-2">
                  <Clock3 className="h-3.5 w-3.5" />
                  {agent.lastOpenedAt
                    ? `Opened ${moment(agent.lastOpenedAt).fromNow()}`
                    : "Not opened yet"}
                </span>
                <span>
                  {agent.lastActivityAt
                    ? `Active ${moment(agent.lastActivityAt).fromNow()}`
                    : "No activity"}
                </span>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1 rounded-2xl"
                onClick={(e) => void handleChatClick(agent, e)}
              >
                <MessageCircle className="h-4 w-4" />
                Open Chat
              </Button>
              <Button
                type="button"
                className="flex-1 rounded-2xl bg-slate-950 text-white hover:bg-slate-800"
                onClick={(e) => {
                  e.stopPropagation();
                  void handleAgentClick(agent);
                }}
              >
                <ArrowUpRight className="h-4 w-4" />
                Builder
              </Button>
            </div>
          </div>
        ))}

        {filteredAgents.length === 0 && (
          <div className="max-w-[370px] rounded-[28px] border border-dashed border-slate-200 bg-white p-8 text-sm text-slate-400 shadow-[0_18px_42px_-28px_rgba(15,23,42,0.24)]">
            No agents match the current search or filters.
          </div>
        )}
      </div>
    </div>
  );
};

export default MyAgents;
