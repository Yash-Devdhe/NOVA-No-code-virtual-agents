const explicitClerkToggle = process.env.NEXT_PUBLIC_ENABLE_CLERK;

export const isClerkEnabled =
  explicitClerkToggle === "true" ||
  (!explicitClerkToggle && process.env.NODE_ENV === "production");

export const localGuestProfile = {
  name: "Local Developer",
  email: "local-dev@nova.local",
};
