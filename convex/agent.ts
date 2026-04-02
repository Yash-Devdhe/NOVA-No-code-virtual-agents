import { mutation, query } from "./_generated/server"
import { v } from "convex/values"

const AGENT_CREATION_CREDIT_COST = 1

export const CreateAgent = mutation({
  args: {
    name: v.string(),
    agentId: v.string(),
    userId: v.id("UserTable"),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId)
    if (!user) {
      throw new Error("User not found")
    }

    const currentCredits = user.token ?? 0
    if (currentCredits < AGENT_CREATION_CREDIT_COST) {
      throw new Error(
        `Not enough credits. Agent creation requires ${AGENT_CREATION_CREDIT_COST} credits, but you have ${currentCredits}.`
      )
    }

    const result = await ctx.db.insert('AgentTable', {
      agentId: args.agentId,
      name: args.name,
      published: false,
      userId: args.userId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    })

    const remainingCredits = currentCredits - AGENT_CREATION_CREDIT_COST
    await ctx.db.patch(args.userId, {
      token: remainingCredits,
    })

    await ctx.db.insert("NotificationsTable", {
      userId: args.userId,
      title: "Agent created",
      message: `${args.name} was created. ${AGENT_CREATION_CREDIT_COST} credits were deducted.`,
      type: "agent_created",
      isRead: false,
      createdAt: Date.now(),
    })

    return {
      agentDocumentId: result,
      remainingCredits,
      deductedCredits: AGENT_CREATION_CREDIT_COST,
    }
  },
})

export const GetUserAgents = query({
  args: {
    userId: v.id("UserTable"),
  },
  handler: async (ctx, args) => {
    const currentUser = await ctx.db.get(args.userId);
    if (!currentUser) {
      return [];
    }

    const relatedUsers = await ctx.db
      .query("UserTable")
      .filter((q) => q.eq(q.field("email"), currentUser.email))
      .collect();

    const allowedUserIds = new Set(relatedUsers.map((user) => String(user._id)));
    const agents = await ctx.db.query("AgentTable").order("desc").collect();

    return agents
      .filter((agent) => allowedUserIds.has(String(agent.userId)))
      .sort((a, b) => (b.updatedAt ?? b.createdAt ?? b._creationTime) - (a.updatedAt ?? a.createdAt ?? a._creationTime));
  },
})

export const GetAgentById = query({
  args: {
    agentId: v.string(),
  },
  handler: async (ctx, args) => {
    const result = await ctx.db.query('AgentTable')
      .filter(q => q.eq(q.field('agentId'), args.agentId))
      .first();
    return result;
  },
})

export const UpdateAgentConfig = mutation({
  args: {
    agentId: v.string(),
    config: v.any(),
  },
  handler: async (ctx, args) => {
    const agent = await ctx.db.query('AgentTable')
      .filter(q => q.eq(q.field('agentId'), args.agentId))
      .first();
    
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
})

// Custom Tools Functions
export const AddCustomTool = mutation({
  args: {
    agentId: v.string(),
    userId: v.id("UserTable"),
    tool: v.object({
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
          v.literal("bearer"),
          v.literal("api-key"),
          v.literal("query"),
          v.literal("custom")
        ),
        customHeaderName: v.optional(v.string()),
      })),
    })
  },
  handler: async (ctx, args) => {
    const agent = await ctx.db.query('AgentTable')
      .filter(q => q.and(
        q.eq(q.field('agentId'), args.agentId),
        q.eq(q.field('userId'), args.userId)
      ))
      .first();
    
    if (!agent) throw new Error("Agent not found");

    const currentTools = agent.customTools || [];
    const newTool = args.tool;
    
    // Check if tool ID already exists
    const exists = currentTools.some(t => t.id === newTool.id);
    if (exists) throw new Error("Tool ID already exists");

    const updatedTools = [...currentTools, newTool];
    
    await ctx.db.patch(agent._id, {
      customTools: updatedTools
    });

    return { success: true, toolId: newTool.id };
  },
})

export const RemoveCustomTool = mutation({
  args: {
    agentId: v.string(),
    userId: v.id("UserTable"),
    toolId: v.string()
  },
  handler: async (ctx, args) => {
    const agent = await ctx.db.query('AgentTable')
      .filter(q => q.and(
        q.eq(q.field('agentId'), args.agentId),
        q.eq(q.field('userId'), args.userId)
      ))
      .first();
    
    if (!agent) throw new Error("Agent not found");

    const currentTools = agent.customTools || [];
    const updatedTools = currentTools.filter(t => t.id !== args.toolId);
    
    await ctx.db.patch(agent._id, {
      customTools: updatedTools
    });

    return { success: true, removed: true };
  },
})

export const UpdateCustomTool = mutation({
  args: {
    agentId: v.string(),
    userId: v.id("UserTable"),
    toolId: v.string(),
    tool: v.object({
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
      apiKeyConfig: v.optional(v.object({
        useApiKey: v.boolean(),
        apiKey: v.string(),
        authType: v.union(
          v.literal("bearer"),
          v.literal("api-key"),
          v.literal("query"),
          v.literal("custom")
        ),
        customHeaderName: v.optional(v.string()),
      })),
    }),
  },
  handler: async (ctx, args) => {
    const agent = await ctx.db
      .query("AgentTable")
      .filter((q) =>
        q.and(
          q.eq(q.field("agentId"), args.agentId),
          q.eq(q.field("userId"), args.userId)
        )
      )
      .first();

    if (!agent) throw new Error("Agent not found");

    const currentTools = agent.customTools || [];
    const duplicate = currentTools.some(
      (tool) => tool.id === args.tool.id && tool.id !== args.toolId
    );

    if (duplicate) throw new Error("Tool ID already exists");

    await ctx.db.patch(agent._id, {
      customTools: currentTools.map((tool) =>
        tool.id === args.toolId ? args.tool : tool
      ),
      updatedAt: Date.now(),
    });

    return { success: true };
  },
})

export const DeleteAgent = mutation({
  args: {
    agentId: v.string(),
    userId: v.id("UserTable"),
  },
  handler: async (ctx, args) => {
    // Find agent
    const agent = await ctx.db.query('AgentTable')
      .filter(q => q.and(
        q.eq(q.field('agentId'), args.agentId),
        q.eq(q.field('userId'), args.userId)
      ))
      .first();
    
    if (!agent) {
      throw new Error("Agent not found or not owned by user");
    }
    
    // Delete agent record
    await ctx.db.delete(agent._id);
    
    // Optionally clear related chat history (immediate cleanup)
    const chats = await ctx.db.query('AgentChatHistoryTable')
      .filter(q => q.eq(q.field('agentId'), args.agentId))
      .collect();
    
    for (const chat of chats) {
      await ctx.db.delete(chat._id);
    }
    
    return { success: true, deletedAgentId: args.agentId };
  },
})

export const GetAgentCustomTools = query({
  args: {
    agentId: v.string()
  },
  handler: async (ctx, args) => {
    const agent = await ctx.db.query('AgentTable')
      .filter(q => q.eq(q.field('agentId'), args.agentId))
      .first();
    
    return agent?.customTools || [];
  },
})

// Chat History Functions
export const SaveChatMessage = mutation({
  args: {
    agentId: v.string(),
    userId: v.id("UserTable"),
    message: v.string(),
    sender: v.string(),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const result = await ctx.db.insert('AgentChatHistoryTable', {
      agentId: args.agentId,
      userId: args.userId,
      message: args.message,
      sender: args.sender,
      timestamp: Date.now(),
      metadata: args.metadata,
    });
    return result;
  },
})

export const GetAgentChatHistory = query({
  args: {
    agentId: v.string(),
    userId: v.id("UserTable"),
  },
  handler: async (ctx, args) => {
    const result = await ctx.db.query('AgentChatHistoryTable')
      .filter(q => q.and(
        q.eq(q.field('agentId'), args.agentId),
        q.eq(q.field('userId'), args.userId)
      ))
      .order('asc')
      .collect();
    return result;
  },
})

// Removed subscription - use query with useQuery for real-time via Convex reactivity
export const GetAgentChatSubscriptionData = query({
  args: {
    agentId: v.string(),
    userId: v.id("UserTable"),
  },
  handler: async (ctx: any, args: any) => {
    return await ctx.db.query('AgentChatHistoryTable')
      .filter((q: any) => q.and(
        q.eq(q.field('agentId'), args.agentId),
        q.eq(q.field('userId'), args.userId)
      ))
      .order("asc")
      .collect();
  },
})

export const ClearAgentChatHistory = mutation({
  args: {
    agentId: v.string(),
    userId: v.id("UserTable"),
  },
  handler: async (ctx, args) => {
    const chats = await ctx.db.query('AgentChatHistoryTable')
      .filter(q => q.and(
        q.eq(q.field('agentId'), args.agentId),
        q.eq(q.field('userId'), args.userId)
      ))
      .collect();
    
    for (const chat of chats) {
      await ctx.db.delete(chat._id);
    }
    return { cleared: true };
  },
})
