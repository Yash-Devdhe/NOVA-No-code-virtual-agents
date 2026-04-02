import { v } from "convex/values";
import { defineSchema, defineTable } from "convex/server";

export default defineSchema({
  UserTable: defineTable({
    name: v.string(),
    email: v.string(),
    subscription: v.optional(v.string()),
    token: v.number(),
  }),
    AgentTable: defineTable({
    agentId: v.string(),
    name: v.string(),
    config: v.optional(v.any()),
    published: v.boolean(),
    userId: v.id("UserTable"),
    createdAt: v.optional(v.number()),
    updatedAt: v.optional(v.number()),
    // API Keys storage - encrypted
    apiKeys: v.optional(v.record(v.string(), v.string())),
    // Custom user-defined tools
    customTools: v.optional(v.array(v.object({
      id: v.string(),
      name: v.string(),
      description: v.string(),
      apiUrl: v.optional(v.string()),
      method: v.optional(v.union(v.literal('GET'), v.literal('POST'), v.literal('PUT'), v.literal('DELETE'))),
      paramsSchema: v.optional(v.any()),
      apiKey: v.optional(v.string()),
      apiKeyConfig: v.optional(v.object({
        useApiKey: v.boolean(),
        apiKey: v.string(),
        authType: v.union(
          v.literal('bearer'),
          v.literal('api-key'),
          v.literal('query'),
          v.literal('custom')
        ),
        customHeaderName: v.optional(v.string()),
      })),
    }))),
    // Media generation limits
    videoLimit: v.optional(v.number()),
    imageLimit: v.optional(v.number()),
    videosGenerated: v.optional(v.number()),
    imagesGenerated: v.optional(v.number()),
  }),
  // Agent Chat History - stores chat conversations
  AgentChatHistoryTable: defineTable({
    agentId: v.string(),
    userId: v.id("UserTable"),
    message: v.string(),
    sender: v.string(), // "user" or "agent"
    timestamp: v.number(),
    metadata: v.optional(v.any()),
  }),
  // Table for storing chat messages
  ChatHistoryTable: defineTable({
    agentId: v.string(),
    userId: v.id("UserTable"),
    message: v.string(),
    sender: v.string(), // "user" or "agent"
    timestamp: v.number(),
    metadata: v.optional(v.any()),
  }),
  // Table for storing media generation prompts (image/video)
  MediaGenerationTable: defineTable({
    agentId: v.string(),
    userId: v.id("UserTable"),
    prompt: v.string(),
    mediaType: v.string(), // "image" or "video"
    status: v.string(), // "pending", "generated", "failed"
    result: v.optional(v.string()), // URL or path to generated media
    createdAt: v.number(),
  }),
  // Table for storing notifications
  NotificationsTable: defineTable({
    userId: v.id("UserTable"),
    title: v.string(),
    message: v.string(),
    type: v.string(), // "info", "success", "warning", "error", "agent_created", "agent_published", "media_generated"
    isRead: v.boolean(),
    link: v.optional(v.string()),
    createdAt: v.number(),
  }),
});
