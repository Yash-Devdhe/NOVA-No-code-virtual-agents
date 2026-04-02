// AppHeader.tsx
"use client"

import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import NotificationBell from "./NotificationBell"
import { isClerkEnabled } from "@/lib/authMode"

type AuthenticatedUserSeed = {
  name: string
  email: string
}

function GuestUserBadge() {
  return (
    <div className="flex h-10 min-w-10 items-center justify-center rounded-full border border-white/20 bg-white/10 px-3 text-sm font-medium text-white">
      Guest
    </div>
  )
}

function AuthenticatedUserBadge({
  initialUser,
}: {
  initialUser: AuthenticatedUserSeed | null
}) {
  const displayName = initialUser?.name?.trim() || initialUser?.email || "User"
  const initials = displayName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "U"

  return (
    <div className="flex items-center gap-3 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-white">
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500/80 text-xs font-semibold">
        {initials}
      </div>
      <div className="hidden text-left md:block">
        <p className="max-w-40 truncate text-sm font-medium">{displayName}</p>
        <p className="max-w-40 truncate text-xs text-slate-300">{initialUser?.email}</p>
      </div>
    </div>
  )
}

export default function AppHeader({
  initialUser,
}: {
  initialUser: AuthenticatedUserSeed | null
}) {
  return (
    <header className="w-full border-b border-slate-700/60 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 px-4 py-4 md:px-8">
      <div className="flex w-full items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-wide text-white">
              NOVA <span className="text-blue-400">Dashboard</span>
            </h1>
          </div>
        </div>

        <div className="hidden items-center gap-2 rounded-full bg-white/10 px-4 py-2 md:flex">
          <Search className="h-4 w-4 text-slate-300" />
          <Input
            placeholder="Search agents, tools..."
            className="w-80 border-0 bg-transparent text-white placeholder:text-slate-400 focus-visible:ring-0"
          />
        </div>

        <div className="flex items-center gap-4">
          <NotificationBell />
          <div className="h-8 w-[1px] bg-white/20"></div>
          {isClerkEnabled ? <AuthenticatedUserBadge initialUser={initialUser} /> : <GuestUserBadge />}
        </div>
      </div>
    </header>
  )
}
