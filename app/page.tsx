import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { isClerkEnabled } from "@/lib/authMode";

export default async function Home() {
  if (!isClerkEnabled) {
    redirect("/dashboard");
  }

  const { userId } = await auth();

  if (userId) {
    redirect("/dashboard");
  }

  redirect("/sign-in");
}
