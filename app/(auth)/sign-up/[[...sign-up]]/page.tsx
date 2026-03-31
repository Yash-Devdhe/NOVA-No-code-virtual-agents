"use client"

import { useAuth } from "@clerk/nextjs"
import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { SignUp } from '@clerk/nextjs';
import Link from "next/link";
import { isClerkEnabled } from "@/lib/authMode";

function GuestModeCard() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-white p-6">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-slate-50 p-8 text-center shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">Guest mode is active</h1>
        <p className="mt-3 text-sm text-slate-600">
          Clerk is disabled for local development, so sign-up is skipped locally.
        </p>
        <Link
          href="/dashboard"
          className="mt-6 inline-flex rounded-2xl bg-slate-950 px-5 py-3 text-sm font-medium text-white hover:bg-slate-800"
        >
          Open dashboard
        </Link>
      </div>
    </div>
  );
}

function ClerkSignUpPage() {
  const { userId, isLoaded } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (isLoaded && userId) {
      router.replace("/dashboard")
    }
  }, [userId, router, isLoaded])

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center h-screen bg-white">
        <div className="flex items-center gap-3 text-slate-600">
          <span className="h-2 w-2 rounded-full bg-slate-400 animate-pulse" />
          <span>Loading sign up...</span>
        </div>
      </div>
    )
  }

  if (userId) {
    return (
      <div className="flex items-center justify-center h-screen bg-white">
        <div className="flex items-center gap-3 text-slate-600">
          <span className="h-2 w-2 rounded-full bg-slate-400 animate-pulse" />
          <span>Redirecting to dashboard...</span>
        </div>
      </div>
    )
  }

  return (
    <div className='flex items-center justify-center h-screen bg-white'>
      <SignUp 
        forceRedirectUrl="/dashboard"
        appearance={{
          elements: {
            rootBox: {
              width: '100%',
              maxWidth: '400px'
            }
          }
        }}
      />
    </div>
  );
}

export default function Page() {
  if (!isClerkEnabled) {
    return <GuestModeCard />;
  }

  return <ClerkSignUpPage />;
}
