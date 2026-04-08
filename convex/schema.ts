import { v } from "convex/values";
import { defineSchema, defineTable } from "convex/server";

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

export default defineSchema({
  UserTable: defineTable({
    name: v.string(),
    email: v.string(),
    subscription: v.optional(v.string()),
    token: v.number(),
  }).index("by_email", ["email"]),
  AgentTable: defineTable({
    agentId: v.string(),
    name: v.string(),
    config: v.optional(v.any()),
    published: v.boolean(),
    userId: v.id("UserTable"),
    pinned: v.optional(v.boolean()),
    lastOpenedAt: v.optional(v.number()),
    createdAt: v.optional(v.number()),
    updatedAt: v.optional(v.number()),
    apiKeys: v.optional(v.record(v.string(), v.string())),
    customTools: v.optional(v.array(customToolValidator)),
    videoLimit: v.optional(v.number()),
    imageLimit: v.optional(v.number()),
    videosGenerated: v.optional(v.number()),
    imagesGenerated: v.optional(v.number()),
  })
    .index("by_agentId", ["agentId"])
    .index("by_userId_and_updatedAt", ["userId", "updatedAt"])
    .index("by_userId_and_lastOpenedAt", ["userId", "lastOpenedAt"]),
  AgentChatHistoryTable: defineTable({
    agentId: v.string(),
    userId: v.id("UserTable"),
    message: v.string(),
    sender: v.union(v.literal("user"), v.literal("agent")),
    timestamp: v.number(),
    metadata: v.optional(v.any()),
  })
    .index("by_agentId_and_timestamp", ["agentId", "timestamp"])
    .index("by_userId_and_timestamp", ["userId", "timestamp"])
    .index("by_agentId_and_userId_and_timestamp", ["agentId", "userId", "timestamp"]),
  ChatHistoryTable: defineTable({
    agentId: v.string(),
    userId: v.id("UserTable"),
    message: v.string(),
    sender: v.union(v.literal("user"), v.literal("agent")),
    timestamp: v.number(),
    metadata: v.optional(v.any()),
  })
    .index("by_userId_and_timestamp", ["userId", "timestamp"])
    .index("by_agentId_and_userId_and_timestamp", ["agentId", "userId", "timestamp"]),
  AgentSessionTable: defineTable({
    userId: v.id("UserTable"),
    agentId: v.string(),
    status: v.union(
      v.literal("online"),
      v.literal("idle"),
      v.literal("offline")
    ),
    isTyping: v.boolean(),
    lastSeenAt: v.number(),
    lastViewedAt: v.number(),
    lastMessageAt: v.optional(v.number()),
    lastSender: v.optional(v.union(v.literal("user"), v.literal("agent"))),
    lastSnippet: v.optional(v.string()),
    messageCount: v.number(),
    unreadCount: v.number(),
  })
    .index("by_userId_and_agentId", ["userId", "agentId"])
    .index("by_agentId", ["agentId"])
    .index("by_userId_and_lastSeenAt", ["userId", "lastSeenAt"])
    .index("by_userId_and_lastMessageAt", ["userId", "lastMessageAt"]),
  MediaGenerationTable: defineTable({
    agentId: v.string(),
    userId: v.id("UserTable"),
    prompt: v.string(),
    mediaType: v.string(),
    status: v.string(),
    result: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_userId_and_createdAt", ["userId", "createdAt"]),
  NotificationsTable: defineTable({
    userId: v.id("UserTable"),
    title: v.string(),
    message: v.string(),
    type: v.string(),
    isRead: v.boolean(),
    link: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_userId_and_createdAt", ["userId", "createdAt"])
    .index("by_userId_and_isRead", ["userId", "isRead"]),
});
