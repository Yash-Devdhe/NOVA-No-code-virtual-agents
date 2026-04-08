"use client";

import React, { useContext, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { UserDetailContext } from "@/context/UserDetailsContext";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import AgentChat from "../_components/AgentChat";
import {
  Bot,
  ChevronRight,
  MessageCircle,
  Pin,
  Radio,
  Search,
} from "lucide-react";

interface ChatPreview {
  agentId: string;
  agentName: string;
  lastMessagePreview: string;
  lastTimestamp: number;
  unreadCount: number;
  messageCount: number;
  isTyping: boolean;
  status: "online" | "idle" | "offline";
  pinned?: boolean;
  lastOpenedAt?: number | null;
}

type FilterMode = "all" | "live" | "pinned" | "unread";

const badgeVariant: Record<ChatPreview["status"], string> = {
  online: "bg-emerald-50 text-emerald-700",
  idle: "bg-amber-50 text-amber-700",
  offline: "bg-slate-100 text-slate-600",
};

export default function ChatsPage() {
  const { userDetail } = useContext(UserDetailContext);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterMode, setFilterMode] = useState<FilterMode>("all");

  const userId = userDetail?._id as Id<"UserTable"> | undefined;
  const chatPreviews = (useQuery(
    api.agent.GetUserChatPreviews,
    userId ? { userId } : "skip"
  ) || []) as ChatPreview[];
  const touchAgentOpen = useMutation(api.agent.TouchAgentOpen);

  const filteredPreviews = useMemo(() => {
    const normalized = searchTerm.trim().toLowerCase();

    return [...chatPreviews]
      .filter((preview) => {
        const matchesSearch =
          !normalized ||
          preview.agentName.toLowerCase().includes(normalized) ||
          preview.lastMessagePreview.toLowerCase().includes(normalized);

        const matchesFilter =
          filterMode === "all"
            ? true
            : filterMode === "live"
              ? preview.status === "online" || preview.isTyping
              : filterMode === "pinned"
                ? Boolean(preview.pinned)
                : preview.unreadCount > 0;

        return matchesSearch && matchesFilter;
      })
      .sort((left, right) => {
        if (Boolean(left.pinned) !== Boolean(right.pinned)) {
          return left.pinned ? -1 : 1;
        }

        return (
          (right.lastOpenedAt ?? right.lastTimestamp) -
          (left.lastOpenedAt ?? left.lastTimestamp)
        );
      });
  }, [chatPreviews, filterMode, searchTerm]);

  useEffect(() => {
    if (!selectedAgentId && filteredPreviews.length > 0) {
      setSelectedAgentId(filteredPreviews[0].agentId);
    }

    if (
      selectedAgentId &&
      filteredPreviews.length > 0 &&
      !filteredPreviews.some((preview) => preview.agentId === selectedAgentId)
    ) {
      setSelectedAgentId(filteredPreviews[0]?.agentId || null);
    }
  }, [filteredPreviews, selectedAgentId]);

  const handleSelectPreview = async (agentId: string) => {
    setSelectedAgentId(agentId);
    if (userId) {
      await touchAgentOpen({ agentId, userId });
    }
  };

  if (!userId) {
    return <div className="flex h-64 items-center justify-center">Loading chats...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Chats</h1>
          <p className="text-slate-500">Your live conversations with AI agents</p>
        </div>
        <Button asChild>
          <Link href="/dashboard">
            <ChevronRight className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Link>
        </Button>
      </div>

      {chatPreviews.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Bot className="mx-auto mb-4 h-12 w-12 text-slate-400" />
            <h3 className="mb-2 text-lg font-semibold">No chats yet</h3>
            <p className="mb-6 text-slate-500">Create an agent to start chatting.</p>
            <Button asChild>
              <Link href="/dashboard">Create Agent</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
          <div className="space-y-3 lg:col-span-1">
            <div className="rounded-xl bg-slate-50 p-4">
              <h3 className="mb-3 flex items-center gap-2 font-semibold">
                <MessageCircle className="h-5 w-5" />
                Recent Chats
              </h3>

              <div className="relative mb-3">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search chats..."
                  className="h-11 rounded-2xl border-slate-200 pl-10"
                />
              </div>

              <div className="mb-3 flex flex-wrap gap-2">
                {(["all", "live", "pinned", "unread"] as FilterMode[]).map((mode) => (
                  <Button
                    key={mode}
                    type="button"
                    variant={filterMode === mode ? "default" : "outline"}
                    className={`rounded-2xl text-xs ${
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

              {filteredPreviews.map((preview) => (
                <Button
                  key={preview.agentId}
                  variant={selectedAgentId === preview.agentId ? "default" : "ghost"}
                  className="mb-2 h-auto w-full justify-start p-3 text-left"
                  onClick={() => void handleSelectPreview(preview.agentId)}
                >
                  <Avatar className="mr-3 h-8 w-8 flex-shrink-0">
                    <AvatarFallback className="bg-gradient-to-br from-blue-500 to-blue-600 text-xs text-white">
                      AI
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <div className="truncate font-medium">{preview.agentName}</div>
                      {preview.pinned ? (
                        <Pin className="h-3 w-3 fill-amber-400 text-amber-500" />
                      ) : null}
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${badgeVariant[preview.status]}`}
                      >
                        <Radio className="h-2.5 w-2.5" />
                        {preview.isTyping ? "Draft" : preview.status}
                      </span>
                    </div>
                    <div className="truncate text-xs text-slate-500">
                      {preview.lastMessagePreview}
                    </div>
                  </div>
                  <div className="ml-2 flex flex-col items-end">
                    <div className="text-xs text-slate-400">
                      {new Date(preview.lastTimestamp).toLocaleDateString()}
                    </div>
                    {preview.unreadCount > 0 && (
                      <Badge variant="destructive" className="mt-1 text-xs">
                        {preview.unreadCount}
                      </Badge>
                    )}
                  </div>
                </Button>
              ))}

              {filteredPreviews.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-5 text-sm text-slate-500">
                  No chats match the current search or filters.
                </div>
              ) : null}
            </div>
          </div>

          <div className="lg:col-span-3">
            {selectedAgentId ? (
              <AgentChat agentId={selectedAgentId} className="h-[70vh]" />
            ) : (
              <Card className="flex h-[70vh] items-center justify-center">
                <CardContent className="text-center">
                  <MessageCircle className="mx-auto mb-6 h-16 w-16 text-slate-400" />
                  <h3 className="mb-2 text-xl font-semibold">Select a chat</h3>
                  <p className="text-slate-500">
                    Choose a conversation from the sidebar to get started
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
