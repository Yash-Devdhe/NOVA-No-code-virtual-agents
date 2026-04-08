"use client"

import { SidebarProvider } from '@/components/ui/sidebar'
import { UserDetailProvider } from '@/context/UserDetailsContext'
import { AppSidebar } from './_components/AppSidebar'
import AppHeader from './_components/AppHeader'
import UserInitializer from './_components/UserInitializer'
import { SafeRenderBoundary } from '@/components/system/SafeRenderBoundary'

type AuthenticatedUserSeed = {
  name: string
  email: string
}

export default function DashboardShell({
  children,
  initialUser,
}: {
  children: React.ReactNode
  initialUser: AuthenticatedUserSeed | null
}) {
  return (
    <UserDetailProvider>
      <UserInitializer initialUser={initialUser} />
      <SidebarProvider
        style={
          {
            "--sidebar-width": "15rem",
            "--sidebar-width-icon": "2.875rem",
          } as React.CSSProperties
        }
      >
        <div className="flex min-h-screen w-full bg-[#f7f8fc]">
          <SafeRenderBoundary fallback={null}>
            <AppSidebar />
          </SafeRenderBoundary>
          <div className="flex min-w-0 w-full flex-1 flex-col overflow-x-hidden">
            <SafeRenderBoundary fallback={null}>
              <AppHeader initialUser={initialUser} />
            </SafeRenderBoundary>
            <main className="min-h-0 flex-1 overflow-auto px-5 pb-8 pt-6 md:px-8 md:pb-10 md:pt-8">
              <SafeRenderBoundary
                fallback={
                  <div className="rounded-3xl border border-slate-200 bg-white p-8 text-sm text-slate-500 shadow-sm">
                    A dashboard section failed to load. Refresh once and continue using the rest of the app.
                  </div>
                }
              >
                {children}
              </SafeRenderBoundary>
            </main>
          </div>
        </div>
      </SidebarProvider>
    </UserDetailProvider>
  )
}
