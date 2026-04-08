// AppHeader.tsx
"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { Search, User, LogOut } from "lucide-react"
import { useClerk } from "@clerk/nextjs"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import NotificationBell from "./NotificationBell"
import { isClerkEnabled } from "@/lib/authMode"
import { SafeRenderBoundary } from "@/components/system/SafeRenderBoundary"

type AuthenticatedUserSeed = {
  name: string
  email: string
}

function GuestUserBadge() {
  return (
    <div className="flex h-10 min-w-10 items-center justify-center rounded-full bg-[#7d5844] px-3 text-sm font-medium text-white">
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
    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#7d5844] text-sm font-semibold text-white">
      {initials}
    </div>
  )
}

function UserMenu({
  initialUser,
}: {
  initialUser: AuthenticatedUserSeed | null
}) {
  const router = useRouter()
  const { signOut } = useClerk()

  const handleSignOut = async () => {
    await signOut()
    router.push("/sign-in")
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400">
        <AuthenticatedUserBadge initialUser={initialUser} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72 rounded-3xl border border-slate-200 bg-white shadow-xl shadow-slate-900/10">
        <div className="space-y-3 px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white">
              {initialUser?.name?.slice(0, 2).toUpperCase() || "U"}
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">{initialUser?.name || "User"}</p>
              <a
                href={`mailto:${initialUser?.email}`}
                className="text-xs text-slate-500 hover:text-slate-900 hover:underline"
              >
                {initialUser?.email}
              </a>
            </div>
          </div>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/dashboard/profile" className="flex items-center gap-2 px-4 py-2 text-slate-700 hover:bg-slate-100">
            <User className="h-4 w-4" />
            Profile
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => void handleSignOut()} className="flex items-center gap-2 px-4 py-2 text-slate-700 hover:bg-slate-100" variant="destructive">
          <LogOut className="h-4 w-4" />
          Logout
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export default function AppHeader({
  initialUser,
}: {
  initialUser: AuthenticatedUserSeed | null
}) {
  return (
    <header className="w-full overflow-hidden border-b border-slate-800/40 bg-[#151f35] px-5 py-4 md:px-8">
      <div className="grid w-full min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 md:gap-6">
        <div className="min-w-0 pr-1">
          <div className="flex flex-col leading-none">
            <span className="text-[0.95rem] font-bold tracking-tight text-white md:text-[1rem]">
              NOVA
            </span>
            <span className="mt-1 text-[0.95rem] font-bold tracking-tight text-[#4590ff] md:text-[1rem]">
              Dashboard
            </span>
          </div>
        </div>

        <div className="mx-auto flex min-w-0 w-full max-w-[360px] items-center gap-3 rounded-full bg-white/10 px-4 py-3 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] md:max-w-[420px]">
          <Search className="h-4 w-4 shrink-0 text-slate-400 md:h-5 md:w-5" />
          <Input
            placeholder="Search agents, tools..."
            className="h-auto min-w-0 w-full border-0 bg-transparent px-0 text-sm text-white placeholder:text-slate-400 focus-visible:ring-0 md:text-base"
          />
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-3 md:gap-5">
          <SafeRenderBoundary fallback={null}>
            <NotificationBell />
          </SafeRenderBoundary>
          <div className="hidden h-8 w-px bg-white/15 md:block" />
          {isClerkEnabled ? <UserMenu initialUser={initialUser} /> : <GuestUserBadge />}
        </div>
      </div>
    </header>
  )
}
