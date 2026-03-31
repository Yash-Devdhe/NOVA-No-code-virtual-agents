'use client'

import { SidebarProvider } from '@/components/ui/sidebar'
import { UserDetailProvider } from '@/context/UserDetailsContext'
import { AppSidebar } from './_components/AppSidebar'
import AppHeader from './_components/AppHeader'
import UserInitializer from './_components/UserInitializer'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <UserDetailProvider>
      <UserInitializer />
      <SidebarProvider>
        <div className="flex min-h-screen w-full bg-slate-50">
          <AppSidebar />
          <div className="flex min-w-0 w-full flex-1 flex-col">
            <AppHeader />
            <main className="flex-1 overflow-auto p-4 md:p-6">{children}</main>
          </div>
        </div>
      </SidebarProvider>
    </UserDetailProvider>
  )
}
