'use client'

import React, { useContext } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import {
  Database,
  Gem,
  Headphones,
  LayoutDashboard,
  Menu,
  User2,
  WalletCards,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useQuery } from 'convex/react'

import {
  useSidebar
} from '@/components/ui/sidebar'
import { cn } from '@/lib/utils'

import { Button } from '@/components/ui/button'
import { UserDetailContext } from '@/context/UserDetailsContext'
import { usePathname } from 'next/navigation'
import { api } from '@/convex/_generated/api'
import type { Id } from '@/convex/_generated/dataModel'
import type { Agent } from '@/types/AgentType'

type MenuOption = {
  name: string
  url: string
  icon: LucideIcon
}

const Menuoptions: MenuOption[] = [
  { name: 'Dashboard', url: '/dashboard', icon: LayoutDashboard },
  { name: 'AI Agents', url: '/dashboard/ai-agents', icon: Headphones },
  { name: 'Data', url: '/dashboard/data', icon: Database },
  { name: 'Pricing', url: '/dashboard/pricing', icon: WalletCards },
  { name: 'Profile', url: '/dashboard/profile', icon: User2 },
] 

export function AppSidebar() {
  const { open, toggleSidebar } = useSidebar()
  const context = useContext(UserDetailContext)
  if (!context) {
    throw new Error('AppSidebar must be used within UserDetailProvider')
  }

  const { userDetail } = context
  const path = usePathname()
  const queryArgs = userDetail?._id
    ? { userId: userDetail._id as Id<"UserTable"> }
    : "skip"
  const agentList = (useQuery(api.agent.GetUserAgents, queryArgs) || []) as Agent[]
  const recentAgents = agentList.slice(0, 3)
  const firstAgentName = agentList[0]?.name ?? 'Currency Converter'

  return (
    <aside
      className={cn(
        'sticky top-0 z-20 h-screen shrink-0 border-r border-slate-200 bg-white text-slate-900 shadow-[18px_0_38px_-38px_rgba(15,23,42,0.4)] transition-[width] duration-200 ease-linear',
        open ? 'w-[240px]' : 'w-[44px]'
      )}
    >
      <div className="flex h-full flex-col overflow-hidden">
        <div className="border-b border-slate-200/80 px-1.5 pb-4 pt-2">
          <div className={cn('flex items-center py-2', open ? 'gap-3 px-1.5' : 'justify-center')}>
            <button
              onClick={toggleSidebar}
              className="rounded-lg p-2 text-slate-700 transition-all duration-200 hover:bg-slate-100 hover:text-slate-950"
              aria-label="Toggle sidebar"
            >
              <Menu size={18} />
            </button>
            {open ? (
              <>
                <Image src="/logo.svg" alt="Logo" width={44} height={44} className="h-9 w-9" />
                <h2 className="text-[1.7rem] font-bold tracking-tight text-slate-950">NOVA</h2>
              </>
            ) : null}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-1.5 pb-2 pt-3">
          {open ? (
            <div className="px-3 text-sm font-medium text-slate-500">Application</div>
          ) : null}

          <nav className="mt-2 space-y-1">
            {Menuoptions.map((menu, index) => {
              const Icon = menu.icon
              const isDashboard = menu.url === '/dashboard'
              const isActive = isDashboard
                ? path === menu.url
                : path === menu.url || path.startsWith(`${menu.url}/`)

              return (
                <Link
                  key={index}
                  href={menu.url}
                  title={!open ? menu.name : undefined}
                  className={cn(
                    'flex items-center rounded-[14px] text-slate-700 transition-all duration-200 hover:bg-slate-50 hover:text-slate-950',
                    isActive && 'bg-slate-100 text-slate-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.65)]',
                    open
                      ? 'h-12 gap-3 px-3 text-[1rem] font-medium'
                      : 'mx-auto h-10 w-10 justify-center rounded-md'
                  )}
                >
                  <Icon size={18} />
                  {open ? <span>{menu.name}</span> : null}
                </Link>
              )
            })}
          </nav>

          {open ? (
            <div className="mt-10 space-y-3">
              <div className="px-3 text-sm font-medium text-slate-500">Your Agents</div>

              {agentList.length === 0 ? (
                <div className="px-3 pt-3 text-sm text-slate-500">
                  No agents yet. Create one from the dashboard.
                </div>
              ) : (
                <div className="space-y-2 px-3 pt-3">
                  {recentAgents.map((agent) => (
                    <Link
                      key={agent._id}
                      href={`/agent-builder/${agent.agentId}`}
                      className="block rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-100"
                    >
                      {agent.name}
                    </Link>
                  ))}
                  {agentList.length > 3 ? (
                    <Link
                      href="/dashboard/ai-agents"
                      className="block rounded-2xl border border-dashed border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-500 transition hover:border-slate-300 hover:bg-slate-50"
                    >
                      View all agents
                    </Link>
                  ) : null}
                </div>
              )}
            </div>
          ) : null}
        </div>

        <div className="mt-auto border-t border-slate-200/80 px-3 pb-6 pt-5">
          <div className={cn('flex items-center text-slate-800', open ? 'gap-2' : 'justify-center')}>
            <Gem size={18} />
            {open ? (
              <p className="text-[1.05rem] font-medium text-slate-950">
                Remaining Credits: <span className="font-bold">{userDetail?.token ?? 0}</span>
              </p>
            ) : null}
          </div>

          {open ? (
            <Button asChild className="mt-5 h-12 w-full rounded-2xl bg-[#17171d] text-base font-semibold text-white hover:bg-[#111117]">
              <Link href="/dashboard/pricing">Upgrade Credits</Link>
            </Button>
          ) : null}
        </div>
      </div>
    </aside>
  )
}
