"use client";

import React, { useContext } from "react";
import { useQuery } from "convex/react";
import {
  Activity,
  Bell,
  Bot,
  MessageCircle,
  Radio,
  Sparkles,
} from "lucide-react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { UserDetailContext } from "@/context/UserDetailsContext";

function timeAgo(timestamp: number) {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

const summaryCards = [
  {
    key: "totalAgents",
    title: "Total Agents",
    icon: Bot,
  },
  {
    key: "liveAgents",
    title: "Live Now",
    icon: Radio,
  },
  {
    key: "messagesToday",
    title: "Messages Today",
    icon: MessageCircle,
  },
  {
    key: "unreadInbox",
    title: "Unread Inbox",
    icon: Bell,
  },
] as const;

export default function DashboardRealtimeOverview() {
  const { userDetail } = useContext(UserDetailContext);
  const userId = userDetail?._id as Id<"UserTable"> | undefined;

  const queryArgs = userId ? { userId } : "skip";
  const overview = useQuery(api.agent.GetDashboardRealtimeOverview, queryArgs);
  const activityFeed = useQuery(api.agent.GetDashboardActivityFeed, queryArgs);

  if (!userId || !overview) {
    return null;
  }

  const unreadInbox = overview.unreadNotifications + overview.unreadChats;
  const activityItems = Array.isArray(activityFeed) ? activityFeed : [];

  return (
    <section className="mb-8 space-y-6">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {summaryCards.map((card) => {
            const Icon = card.icon;
            const value = (() => {
              switch (card.key) {
                case "totalAgents":
                  return overview.totalAgents;
                case "liveAgents":
                  return overview.liveAgents;
                case "messagesToday":
                  return overview.messagesToday;
                case "unreadInbox":
                  return unreadInbox;
              }
            })();

            return (
              <div
                key={card.key}
                className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_18px_40px_-28px_rgba(15,23,42,0.26)]"
              >
                <div className="flex items-center justify-between">
                  <div className="rounded-2xl bg-slate-100 p-3 text-slate-700">
                    <Icon className="h-5 w-5" />
                  </div>
                  {card.key === "liveAgents" ? (
                    <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                      <span className="h-2 w-2 rounded-full bg-emerald-500" />
                      {overview.idleAgents} idle
                    </span>
                  ) : null}
                </div>
                <div className="mt-5">
                  <div className="text-sm font-medium text-slate-500">
                    {card.title}
                  </div>
                  <div className="mt-2 text-3xl font-semibold text-slate-950">
                    {value}
                  </div>
                  <div className="mt-2 text-xs text-slate-400">
                    {card.key === "unreadInbox"
                      ? `${overview.unreadNotifications} alerts and ${overview.unreadChats} chat updates`
                      : card.key === "messagesToday"
                        ? `${overview.activeConversations} active conversations`
                        : "Live Convex updates"}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_18px_40px_-28px_rgba(15,23,42,0.26)]">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-slate-500">
                Live Activity
              </div>
              <div className="mt-1 text-xl font-semibold text-slate-950">
                Recent updates
              </div>
            </div>
            <div className="rounded-2xl bg-slate-100 p-3 text-slate-700">
              <Activity className="h-5 w-5" />
            </div>
          </div>

          <div className="mt-5 space-y-3">
            {activityItems.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
                Activity will appear here as agents, chats, and alerts update.
              </div>
            ) : (
              activityItems.map((item) => (
                <a
                  key={item.id}
                  href={item.link || "#"}
                  className="block rounded-2xl border border-slate-200 px-4 py-3 transition hover:border-slate-300 hover:bg-slate-50"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                        {item.kind === "chat" ? (
                          <MessageCircle className="h-4 w-4 text-blue-600" />
                        ) : (
                          <Sparkles className="h-4 w-4 text-amber-600" />
                        )}
                        <span className="truncate">{item.title}</span>
                      </div>
                      <p className="mt-1 line-clamp-2 text-sm text-slate-500">
                        {item.message}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs text-slate-400">
                      {timeAgo(item.timestamp)}
                    </span>
                  </div>
                </a>
              ))
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
