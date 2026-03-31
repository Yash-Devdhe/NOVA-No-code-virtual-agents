'use client'

import React, { useContext, useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import {
  Database,
  Gem,
  Headphones,
  LayoutDashboard,
  MessageCircle,
  User2,
  WalletCards,
  Menu
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  useSidebar
} from '@/components/ui/sidebar'

import { Button } from '@/components/ui/button'
import { UserDetailContext } from '@/context/UserDetailsContext'
import { usePathname } from 'next/navigation'

type MenuOption = {
  name: string
  url: string
  icon: LucideIcon
}

const Menuoptions: MenuOption[] = [
  { name: 'Dashboard', url: '/dashboard', icon: LayoutDashboard },
  { name: 'Chats', url: '/dashboard/chats', icon: MessageCircle },
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

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleSidebar}
            className="p-1 rounded-md hover:bg-muted"
          >
            <Menu size={20} />
          </button>

         {open && <Image src="/logo.svg" alt="Logo" width={35} height={35} />}
          {open && <h2 className="font-bold">NOVA</h2>}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Application</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {Menuoptions.map((menu, index) => {
                const Icon = menu.icon
                const isDashboard = menu.url === '/dashboard'
                const isActive = isDashboard
                  ? path === menu.url
                  : path === menu.url || path.startsWith(`${menu.url}/`)
                return (
                  <SidebarMenuItem key={index}>
                    <SidebarMenuButton
                      asChild
                      size={open ? 'lg' : 'default'}
                      isActive={isActive}
                    >
                      <Link href={menu.url} className="flex items-center gap-2">
                        <Icon size={18} />
                        <span>{menu.name}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="mb-10">
        <div className="flex items-center gap-2">
          <Gem size={18} />
          {open && (
            <h2>
              Remaining Credits:
              <span className="font-bold"> {userDetail?.token ?? 0}</span>
            </h2>
          )}
        </div>

        {open && (
          <Button asChild className="w-full mt-2">
            <Link href="/dashboard/pricing">Upgrade Credits</Link>
          </Button>
        )}
      </SidebarFooter>
    </Sidebar>
  )
}
