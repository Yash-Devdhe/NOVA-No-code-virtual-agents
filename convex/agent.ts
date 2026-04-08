import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import {
  mutation,
  query,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server";

const AGENT_CREATION_CREDIT_COST = 1;
const CHAT_HISTORY_LIMIT = 200;
const DELETE_BATCH_SIZE = 100;
const SESSION_ONLINE_WINDOW_MS = 2 * 60 * 1000;
const SESSION_IDLE_WINDOW_MS = 10 * 60 * 1000;

const senderValidator = v.union(v.literal("user"), v.literal("agent"));
const sessionStatusValidator = v.union(
  v.literal("online"),
  v.literal("idle"),
  v.literal("offline")
);
const customToolValidator = v.object({
  id: v.string(),
  name: v.string(),
  description: v.string(),
  apiUrl: v.optional(v.string()),
  method: v.optional(
    v.union(
      v.literal("GET"),
      v.literal("POST"),
      v.literal("PUT"),
      v.literal("DELETE")
    )
  ),
  paramsSchema: v.optional(v.any()),
  apiKey: v.optional(v.string()),
  apiKeyConfig: v.optional(
    v.object({
      useApiKey: v.boolean(),
      apiKey: v.string(),
      authType: v.union(
        v.literal("bearer"),
        v.literal("api-key"),
        v.literal("query"),
        v.literal("custom")
      ),
      customHeaderName: v.optional(v.string()),
    })
  ),
});

type SessionDoc = Doc<"AgentSessionTable">;
type AgentDoc = Doc<"AgentTable">;

const sortAgentsByFreshness = (left: AgentDoc, right: AgentDoc) =>
  (right.updatedAt ?? right.createdAt ?? right._creationTime) -
  (left.updatedAt ?? left.createdAt ?? left._creationTime);

const compactSnippet = (message: string) =>
  message.replace(/\s+/g, " ").trim().slice(0, 140);

function deriveSessionStatus(
  session: Pick<SessionDoc, "status" | "isTyping" | "lastSeenAt"> | null,
  now = Date.now()
) {
  if (!session) {
    return "offline" as const;
  }

  if (session.status === "offline") {
    return "offline" as const;
  }

  if (session.isTyping) {
    return "online" as const;
  }

  const age = now - session.lastSeenAt;
  if (age <= SESSION_ONLINE_WINDOW_MS) {
    return "online" as const;
  }

  if (session.status === "idle" || age <= SESSION_IDLE_WINDOW_MS) {
    return "idle" as const;
  }

  return "offline" as const;
}

async function getAgentByPublicId(
  ctx: QueryCtx | MutationCtx,
  agentId: string
) {
  return await ctx.db
    .query("AgentTable")
    .withIndex("by_agentId", (q) => q.eq("agentId", agentId))
    .unique();
}

async function getRelatedUsers(
  ctx: QueryCtx | MutationCtx,
  userId: Id<"UserTable">
) {
  const currentUser = await ctx.db.get(userId);
  if (!currentUser) {
    return [];
  }

  return await ctx.db
    .query("UserTable")
    .withIndex("by_email", (q) => q.eq("email", currentUser.email))
    .take(10);
}

async function getRelatedAgents(
  ctx: QueryCtx | MutationCtx,
  userId: Id<"UserTable">
) {
  const relatedUsers = await getRelatedUsers(ctx, userId);
  const dedupedAgents = new Map<string, AgentDoc>();

  for (const relatedUser of relatedUsers) {
    const agents = await ctx.db
      .query("AgentTable")
      .withIndex("by_userId_and_updatedAt", (q) =>
        q.eq("userId", relatedUser._id)
      )
      .order("desc")
      .take(50);

    for (const agent of agents) {
      dedupedAgents.set(agent.agentId, agent);
    }
  }

  return [...dedupedAgents.values()].sort(sortAgentsByFreshness);
}

async function getAgentSession(
  ctx: QueryCtx | MutationCtx,
  userId: Id<"UserTable">,
  agentId: string
) {
  return await ctx.db
    .query("AgentSessionTable")
    .withIndex("by_userId_and_agentId", (q) =>
      q.eq("userId", userId).eq("agentId", agentId)
    )
    .unique();
}

async function deleteChatHistoryForAgent(
  ctx: MutationCtx,
  agentId: string
) {
  while (true) {
    const batch = await ctx.db
      .query("AgentChatHistoryTable")
      .withIndex("by_agentId_and_timestamp", (q) => q.eq("agentId", agentId))
      .take(DELETE_BATCH_SIZE);

    if (batch.length === 0) {
      break;
    }

    for (const message of batch) {
      await ctx.db.delete(message._id);
    }

    if (batch.length < DELETE_BATCH_SIZE) {
      break;
    }
  }
}

async function deleteSessionsForAgent(ctx: MutationCtx, agentId: string) {
  while (true) {
    const batch = await ctx.db
      .query("AgentSessionTable")
      .withIndex("by_agentId", (q) => q.eq("agentId", agentId))
      .take(DELETE_BATCH_SIZE);

    if (batch.length === 0) {
      break;
    }

    for (const session of batch) {
      await ctx.db.delete(session._id);
    }

    if (batch.length < DELETE_BATCH_SIZE) {
      break;
    }
  }
}

export const CreateAgent = mutation({
  args: {
    name: v.string(),
    agentId: v.string(),
    userId: v.id("UserTable"),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("User not found");
    }

    const currentCredits = user.token ?? 0;
    if (currentCredits < AGENT_CREATION_CREDIT_COST) {
      throw new Error(
        `Not enough credits. Agent creation requires ${AGENT_CREATION_CREDIT_COST} credits, but you have ${currentCredits}.`
      );
    }

    const now = Date.now();
    const result = await ctx.db.insert("AgentTable", {
      agentId: args.agentId,
      name: args.name,
      published: false,
      userId: args.userId,
      pinned: false,
      lastOpenedAt: now,
      createdAt: now,
      updatedAt: now,
    });

    const remainingCredits = currentCredits - AGENT_CREATION_CREDIT_COST;
    await ctx.db.patch(args.userId, {
      token: remainingCredits,
    });

    await ctx.db.insert("NotificationsTable", {
      userId: args.userId,
      title: "Agent created",
      message: `${args.name} was created. ${AGENT_CREATION_CREDIT_COST} credits were deducted.`,
      type: "agent_created",
      isRead: false,
      createdAt: now,
    });

    return {
      agentDocumentId: result,
      remainingCredits,
      deductedCredits: AGENT_CREATION_CREDIT_COST,
    };
  },
});

export const GetUserAgents = query({
  args: {
    userId: v.id("UserTable"),
  },
  handler: async (ctx, args) => {
    return await getRelatedAgents(ctx, args.userId);
  },
});

export const GetUserAgentRealtimeCards = query({
  args: {
    userId: v.id("UserTable"),
  },
  handler: async (ctx, args) => {
    const agents = await getRelatedAgents(ctx, args.userId);
    const now = Date.now();

    const cards = await Promise.all(
      agents.map(async (agent) => {
        const session = await getAgentSession(ctx, args.userId, agent.agentId);
        const status = deriveSessionStatus(session, now);
        const lastActivityAt = Math.max(
          agent.updatedAt ?? agent.createdAt ?? agent._creationTime,
          session?.lastMessageAt ?? 0,
          session?.lastSeenAt ?? 0
        );

        return {
          ...agent,
          status,
          isTyping: session?.isTyping ?? false,
          unreadCount: session?.unreadCount ?? 0,
          messageCount: session?.messageCount ?? 0,
          lastSeenAt: session?.lastSeenAt ?? null,
          lastMessageAt: session?.lastMessageAt ?? null,
          lastSnippet: session?.lastSnippet ?? "",
          lastActivityAt,
        };
      })
    );

    return cards.sort((left, right) => right.lastActivityAt - left.lastActivityAt);
  },
});

export const GetDashboardRealtimeOverview = query({
  args: {
    userId: v.id("UserTable"),
  },
  handler: async (ctx, args) => {
    const agents = await getRelatedAgents(ctx, args.userId);
    const sessions = await ctx.db
      .query("AgentSessionTable")
      .withIndex("by_userId_and_lastSeenAt", (q) => q.eq("userId", args.userId))
      .order("desc")
      .take(100);
    const unreadNotifications = (
      await ctx.db
        .query("NotificationsTable")
        .withIndex("by_userId_and_isRead", (q) =>
          q.eq("userId", args.userId).eq("isRead", false)
        )
        .take(100)
    ).length;

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const todayMessages = await ctx.db
      .query("AgentChatHistoryTable")
      .withIndex("by_userId_and_timestamp", (q) => q.eq("userId", args.userId))
      .order("desc")
      .take(200);

    const liveAgents = sessions.filter(
      (session) => deriveSessionStatus(session, Date.now()) === "online"
    ).length;
    const idleAgents = sessions.filter(
      (session) => deriveSessionStatus(session, Date.now()) === "idle"
    ).length;

    return {
      totalAgents: agents.length,
      liveAgents,
      idleAgents,
      unreadNotifications,
      unreadChats: sessions.reduce(
        (total, session) => total + (session.unreadCount ?? 0),
        0
      ),
      activeConversations: sessions.filter((session) => Boolean(session.lastMessageAt))
        .length,
      messagesToday: todayMessages.filter(
        (message) => message.timestamp >= startOfDay.getTime()
      ).length,
      lastUpdatedAt: Date.now(),
    };
  },
});

export const GetDashboardActivityFeed = query({
  args: {
    userId: v.id("UserTable"),
  },
  handler: async (ctx, args) => {
    const notifications = await ctx.db
      .query("NotificationsTable")
      .withIndex("by_userId_and_createdAt", (q) => q.eq("userId", args.userId))
      .order("desc")
      .take(6);
    const sessions = await ctx.db
      .query("AgentSessionTable")
      .withIndex("by_userId_and_lastMessageAt", (q) =>
        q.eq("userId", args.userId)
      )
      .order("desc")
      .take(6);

    const conversationEvents = await Promise.all(
      sessions
        .filter((session) => Boolean(session.lastMessageAt))
        .map(async (session) => {
          const agent = await getAgentByPublicId(ctx, session.agentId);
          return {
            id: `chat-${session._id}`,
            kind: "chat",
            title: agent?.name || "Agent conversation",
            message:
              session.lastSender === "agent"
                ? session.lastSnippet || "Agent replied in real time."
                : session.lastSnippet || "Conversation updated.",
            timestamp: session.lastMessageAt || session.lastSeenAt,
            link: `/dashboard/chats/${session.agentId}`,
          };
        })
    );

    const notificationEvents = notifications.map((notification) => ({
      id: `notification-${notification._id}`,
      kind: "notification",
      title: notification.title,
      message: notification.message,
      timestamp: notification.createdAt,
      link: notification.link,
    }));

    return [...notificationEvents, ...conversationEvents]
      .sort((left, right) => right.timestamp - left.timestamp)
      .slice(0, 8);
  },
});

export const GetUserChatPreviews = query({
  args: {
    userId: v.id("UserTable"),
  },
  handler: async (ctx, args) => {
    const agents = await getRelatedAgents(ctx, args.userId);
    const now = Date.now();

    const previews = await Promise.all(
      agents.map(async (agent) => {
        const session = await getAgentSession(ctx, args.userId, agent.agentId);
        return {
          agentId: agent.agentId,
          agentName: agent.name,
          pinned: agent.pinned ?? false,
          lastOpenedAt: agent.lastOpenedAt ?? null,
          lastMessagePreview: session?.lastSnippet || "No messages yet",
          lastTimestamp:
            session?.lastMessageAt ??
            agent.updatedAt ??
            agent.createdAt ??
            agent._creationTime,
          unreadCount: session?.unreadCount ?? 0,
          messageCount: session?.messageCount ?? 0,
          isTyping: session?.isTyping ?? false,
          status: deriveSessionStatus(session, now),
        };
      })
    );

    return previews.sort((left, right) => right.lastTimestamp - left.lastTimestamp);
  },
});

export const GetAgentById = query({
  args: {
    agentId: v.string(),
  },
  handler: async (ctx, args) => {
    return await getAgentByPublicId(ctx, args.agentId);
  },
});

export const UpdateAgentConfig = mutation({
  args: {
    agentId: v.string(),
    config: v.any(),
  },
  handler: async (ctx, args) => {
    const agent = await getAgentByPublicId(ctx, args.agentId);

    if (!agent) {
      throw new Error("Agent not found");
    }

    await ctx.db.patch(agent._id, {
      name:
        typeof args.config?.settings?.agentName === "string" &&
        args.config.settings.agentName.trim()
          ? args.config.settings.agentName.trim()
          : agent.name,
      config: args.config,
      updatedAt: Date.now(),
    });

    return agent._id;
  },
});

export const TogglePinnedAgent = mutation({
  args: {
    agentId: v.string(),
    userId: v.id("UserTable"),
  },
  handler: async (ctx, args) => {
    const agent = await getAgentByPublicId(ctx, args.agentId);

    if (!agent || agent.userId !== args.userId) {
      throw new Error("Agent not found");
    }

    const nextPinned = !(agent.pinned ?? false);
    await ctx.db.patch(agent._id, {
      pinned: nextPinned,
      updatedAt: Date.now(),
    });

    return { pinned: nextPinned };
  },
});

export const TouchAgentOpen = mutation({
  args: {
    agentId: v.string(),
    userId: v.id("UserTable"),
  },
  handler: async (ctx, args) => {
    const agent = await getAgentByPublicId(ctx, args.agentId);

    if (!agent || agent.userId !== args.userId) {
      throw new Error("Agent not found");
    }

    const now = Date.now();
    await ctx.db.patch(agent._id, {
      lastOpenedAt: now,
    });

    return { lastOpenedAt: now };
  },
});

export const AddCustomTool = mutation({
  args: {
    agentId: v.string(),
    userId: v.id("UserTable"),
    tool: customToolValidator,
  },
  handler: async (ctx, args) => {
    const agent = await getAgentByPublicId(ctx, args.agentId);

    if (!agent || agent.userId !== args.userId) {
      throw new Error("Agent not found");
    }

    const currentTools = agent.customTools || [];
    const exists = currentTools.some((tool) => tool.id === args.tool.id);
    if (exists) {
      throw new Error("Tool ID already exists");
    }

    await ctx.db.patch(agent._id, {
      customTools: [...currentTools, args.tool],
      updatedAt: Date.now(),
    });

    return { success: true, toolId: args.tool.id };
  },
});

export const RemoveCustomTool = mutation({
  args: {
    agentId: v.string(),
    userId: v.id("UserTable"),
    toolId: v.string(),
  },
  handler: async (ctx, args) => {
    const agent = await getAgentByPublicId(ctx, args.agentId);

    if (!agent || agent.userId !== args.userId) {
      throw new Error("Agent not found");
    }

    const currentTools = agent.customTools || [];
    await ctx.db.patch(agent._id, {
      customTools: currentTools.filter((tool) => tool.id !== args.toolId),
      updatedAt: Date.now(),
    });

    return { success: true, removed: true };
  },
});

export const UpdateCustomTool = mutation({
  args: {
    agentId: v.string(),
    userId: v.id("UserTable"),
    toolId: v.string(),
    tool: customToolValidator,
  },
  handler: async (ctx, args) => {
    const agent = await getAgentByPublicId(ctx, args.agentId);

    if (!agent || agent.userId !== args.userId) {
      throw new Error("Agent not found");
    }

    const currentTools = agent.customTools || [];
    const duplicate = currentTools.some(
      (tool) => tool.id === args.tool.id && tool.id !== args.toolId
    );

    if (duplicate) {
      throw new Error("Tool ID already exists");
    }

    await ctx.db.patch(agent._id, {
      customTools: currentTools.map((tool) =>
        tool.id === args.toolId ? args.tool : tool
      ),
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

export const DeleteAgent = mutation({
  args: {
    agentId: v.string(),
    userId: v.id("UserTable"),
  },
  handler: async (ctx, args) => {
    const agent = await getAgentByPublicId(ctx, args.agentId);

    if (!agent || agent.userId !== args.userId) {
      throw new Error("Agent not found or not owned by user");
    }

    await ctx.db.delete(agent._id);
    await deleteChatHistoryForAgent(ctx, args.agentId);
    await deleteSessionsForAgent(ctx, args.agentId);

    return { success: true, deletedAgentId: args.agentId };
  },
});

export const GetAgentCustomTools = query({
  args: {
    agentId: v.string(),
  },
  handler: async (ctx, args) => {
    const agent = await getAgentByPublicId(ctx, args.agentId);
    return agent?.customTools || [];
  },
});

export const SaveChatMessage = mutation({
  args: {
    agentId: v.string(),
    userId: v.id("UserTable"),
    message: v.string(),
    sender: senderValidator,
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const agent = await getAgentByPublicId(ctx, args.agentId);
    if (!agent) {
      throw new Error("Agent not found");
    }

    const timestamp = Date.now();
    const result = await ctx.db.insert("AgentChatHistoryTable", {
      agentId: args.agentId,
      userId: args.userId,
      message: args.message,
      sender: args.sender,
      timestamp,
      metadata: args.metadata,
    });

    const currentSession = await getAgentSession(ctx, args.userId, args.agentId);
    const nextUnreadCount =
      args.sender === "agent"
        ? (currentSession?.unreadCount ?? 0) + 1
        : currentSession?.unreadCount ?? 0;
    const nextSession = {
      userId: args.userId,
      agentId: args.agentId,
      status: "online" as const,
      isTyping: false,
      lastSeenAt: timestamp,
      lastViewedAt:
        args.sender === "user"
          ? timestamp
          : currentSession?.lastViewedAt ?? 0,
      lastMessageAt: timestamp,
      lastSender: args.sender,
      lastSnippet: compactSnippet(args.message),
      messageCount: (currentSession?.messageCount ?? 0) + 1,
      unreadCount: nextUnreadCount,
    };

    if (currentSession) {
      await ctx.db.patch(currentSession._id, nextSession);
    } else {
      await ctx.db.insert("AgentSessionTable", nextSession);
    }

    await ctx.db.patch(agent._id, {
      updatedAt: timestamp,
    });

    return result;
  },
});

export const GetAgentChatHistory = query({
  args: {
    agentId: v.string(),
    userId: v.id("UserTable"),
  },
  handler: async (ctx, args) => {
    const result = await ctx.db
      .query("AgentChatHistoryTable")
      .withIndex("by_agentId_and_userId_and_timestamp", (q) =>
        q.eq("agentId", args.agentId).eq("userId", args.userId)
      )
      .order("desc")
      .take(CHAT_HISTORY_LIMIT);

    return result.reverse();
  },
});

export const GetAgentChatSubscriptionData = query({
  args: {
    agentId: v.string(),
    userId: v.id("UserTable"),
  },
  handler: async (ctx, args) => {
    const result = await ctx.db
      .query("AgentChatHistoryTable")
      .withIndex("by_agentId_and_userId_and_timestamp", (q) =>
        q.eq("agentId", args.agentId).eq("userId", args.userId)
      )
      .order("desc")
      .take(CHAT_HISTORY_LIMIT);

    return result.reverse();
  },
});

export const GetAgentRealtimeState = query({
  args: {
    agentId: v.string(),
    userId: v.id("UserTable"),
  },
  handler: async (ctx, args) => {
    const session = await getAgentSession(ctx, args.userId, args.agentId);
    const status = deriveSessionStatus(session, Date.now());

    return {
      status,
      isTyping: session?.isTyping ?? false,
      unreadCount: session?.unreadCount ?? 0,
      messageCount: session?.messageCount ?? 0,
      lastSeenAt: session?.lastSeenAt ?? null,
      lastViewedAt: session?.lastViewedAt ?? null,
      lastMessageAt: session?.lastMessageAt ?? null,
      lastSnippet: session?.lastSnippet ?? "",
    };
  },
});

export const TouchAgentSession = mutation({
  args: {
    agentId: v.string(),
    userId: v.id("UserTable"),
    status: v.optional(sessionStatusValidator),
    isTyping: v.optional(v.boolean()),
    markViewed: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const agent = await getAgentByPublicId(ctx, args.agentId);
    if (!agent) {
      throw new Error("Agent not found");
    }

    const now = Date.now();
    const currentSession = await getAgentSession(ctx, args.userId, args.agentId);
    const nextLastSeenAt =
      args.status === "offline" ? currentSession?.lastSeenAt ?? now : now;
    const nextSession = {
      userId: args.userId,
      agentId: args.agentId,
      status: args.status ?? currentSession?.status ?? "online",
      isTyping: args.isTyping ?? currentSession?.isTyping ?? false,
      lastSeenAt: nextLastSeenAt,
      lastViewedAt: args.markViewed
        ? now
        : currentSession?.lastViewedAt ?? 0,
      lastMessageAt: currentSession?.lastMessageAt,
      lastSender: currentSession?.lastSender,
      lastSnippet: currentSession?.lastSnippet,
      messageCount: currentSession?.messageCount ?? 0,
      unreadCount: args.markViewed ? 0 : currentSession?.unreadCount ?? 0,
    };

    if (currentSession) {
      await ctx.db.patch(currentSession._id, nextSession);
    } else {
      await ctx.db.insert("AgentSessionTable", nextSession);
    }

    return {
      status: deriveSessionStatus(
        {
          status: nextSession.status,
          isTyping: nextSession.isTyping,
          lastSeenAt: nextSession.lastSeenAt,
        },
        now
      ),
      unreadCount: nextSession.unreadCount,
    };
  },
});

export const ClearAgentChatHistory = mutation({
  args: {
    agentId: v.string(),
    userId: v.id("UserTable"),
  },
  handler: async (ctx, args) => {
    while (true) {
      const batch = await ctx.db
        .query("AgentChatHistoryTable")
        .withIndex("by_agentId_and_userId_and_timestamp", (q) =>
          q.eq("agentId", args.agentId).eq("userId", args.userId)
        )
        .take(DELETE_BATCH_SIZE);

      if (batch.length === 0) {
        break;
      }

      for (const message of batch) {
        await ctx.db.delete(message._id);
      }

      if (batch.length < DELETE_BATCH_SIZE) {
        break;
      }
    }

    const session = await getAgentSession(ctx, args.userId, args.agentId);
    if (session) {
      await ctx.db.patch(session._id, {
        status: "idle",
        isTyping: false,
        lastViewedAt: Date.now(),
        messageCount: 0,
        unreadCount: 0,
        lastSnippet: "",
      });
    }

    return { cleared: true };
  },
});
