"use client"

import { ReactNode } from "react"
import { SidebarProvider } from "@/components/ui/sidebar"

// FIX: Removed "dashboard" from path if this file is already inside the dashboard folder
import { AppSidebar } from "@/app/dashboard/_components/AppSidebar" 
import AppHeader from "@/app/dashboard/_components/AppHeader"

// Ensure this matches your actual context export
import { UserDetailProvider } from "@/context/UserDetailsContext"

const DashboardProvider = ({ children }: { children: ReactNode }) => {
  return (
    <UserDetailProvider>
      <SidebarProvider>
        <div className="flex h-screen w-full">
          <AppSidebar />
          
          <main className="flex flex-col flex-1 overflow-hidden">
            <AppHeader initialUser={null} />
            <div className="p-6 flex-1 overflow-y-auto">
               {children}
            </div>
          </main>
        </div>
      </SidebarProvider>
    </UserDetailProvider>
  )
}

export default DashboardProvider
