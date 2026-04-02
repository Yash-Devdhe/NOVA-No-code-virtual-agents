const explicitClerkToggle = process.env.NEXT_PUBLIC_ENABLE_CLERK?.trim().toLowerCase()

export const clerkPublishableKey =
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim() ?? ""

const hasPublicClerkConfig = clerkPublishableKey.length > 0

export const isClerkEnabled =
  explicitClerkToggle === "true" ||
  (explicitClerkToggle !== "false" && hasPublicClerkConfig)

export const localGuestProfile = {
  name: "Local Developer",
  email: "local-dev@nova.local",
};
