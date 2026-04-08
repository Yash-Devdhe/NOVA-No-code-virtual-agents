import { mutation, query } from "./_generated/server"
import { v } from "convex/values"

// Create a new notification
export const CreateNotification = mutation({
  args: {
    userId: v.id("UserTable"),
    title: v.string(),
    message: v.string(),
    type: v.string(),
    link: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const result = await ctx.db.insert('NotificationsTable', {
      userId: args.userId,
      title: args.title,
      message: args.message,
      type: args.type,
      isRead: false,
      link: args.link,
      createdAt: Date.now(),
    });
    return result;
  },
});

// Get notifications for a user
export const GetUserNotifications = query({
  args: {
    userId: v.id("UserTable"),
  },
  handler: async (ctx, args) => {
    const result = await ctx.db.query('NotificationsTable')
      .withIndex("by_userId_and_createdAt", (q) => q.eq("userId", args.userId))
      .order('desc')
      .take(50);
    return result;
  },
});

// Get unread notification count
export const GetUnreadCount = query({
  args: {
    userId: v.id("UserTable"),
  },
  handler: async (ctx, args) => {
    const result = await ctx.db.query('NotificationsTable')
      .withIndex("by_userId_and_isRead", (q) =>
        q.eq("userId", args.userId).eq("isRead", false)
      )
      .take(100);
    return result.length;
  },
});

// Mark notification as read
export const MarkAsRead = mutation({
  args: {
    notificationId: v.id("NotificationsTable"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.notificationId, {
      isRead: true,
    });
    return true;
  },
});

// Mark all notifications as read
export const MarkAllAsRead = mutation({
  args: {
    userId: v.id("UserTable"),
  },
  handler: async (ctx, args) => {
    const notifications = await ctx.db.query('NotificationsTable')
      .withIndex("by_userId_and_isRead", (q) =>
        q.eq("userId", args.userId).eq("isRead", false)
      )
      .take(100);
    
    for (const notification of notifications) {
      await ctx.db.patch(notification._id, {
        isRead: true,
      });
    }
    return true;
  },
});

// Delete a notification
export const DeleteNotification = mutation({
  args: {
    notificationId: v.id("NotificationsTable"),
  },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.notificationId);
    return true;
  },
});
