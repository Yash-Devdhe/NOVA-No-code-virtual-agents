import { mutation, query } from "./_generated/server";   
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

export const CreateNewUser=mutation({
    args:{
        name:v.string(),
        email:v.string()
    },
    handler:async (ctx,args)=>{
        const user =await ctx.db.query('UserTable')
            .withIndex("by_email", (q) => q.eq("email", args.email))
            .take(1);
        if(user?.length===0){
            const userData={
                name:args.name,
                email:args?.email,
                token:5000
            }
            const result = await ctx.db.insert('UserTable',userData);
            // Return the inserted document with its ID
            return {
                _id: result as Id<"UserTable">,
                ...userData
            };
        }
        return user[0];

    }
})

export const GetUserByEmail = query({
    args: {
        email: v.string(),
    },
    handler: async (ctx, args) => {
        const user = await ctx.db.query('UserTable')
            .withIndex("by_email", (q) => q.eq("email", args.email))
            .unique();
        return user;
    },
})

export const UpgradeCredits = mutation({
    args: {
        userId: v.id("UserTable"),
        credits: v.number(),
        planName: v.string(),
        paymentId: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const user = await ctx.db.get(args.userId);
        if (!user) {
            throw new Error("User not found");
        }

        const nextCredits = (user.token ?? 0) + args.credits;
        await ctx.db.patch(args.userId, {
            token: nextCredits,
            subscription: `${args.planName}|${Date.now()}|${args.paymentId ?? "manual"}`,
        });

        await ctx.db.insert("NotificationsTable", {
            userId: args.userId,
            title: "Subscription activated",
            message: `${args.planName} credits added successfully.`,
            type: "success",
            isRead: false,
            createdAt: Date.now(),
        });

        return {
            token: nextCredits,
        };
    },
})
