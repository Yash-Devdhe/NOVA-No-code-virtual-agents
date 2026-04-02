"use client"

import { ReactNode } from "react"
import { SidebarProvider } from "@/components/ui/sidebar"
import {AppSidebar} from "./_components/AppSidebar" 
import AppHeader from "./_components/AppHeader"
import { UserDetailProvider } from "@/context/UserDetailsContext"

const DashboardProvider = ({ children }: { children: ReactNode }) => {
  return (
    <UserDetailProvider>
      {/* Container to stack Header and the rest of the app */}
      <div className="flex flex-col h-screen w-full">
        
        {/* Header sits at the very top, outside the SidebarProvider */}
        <AppHeader initialUser={null} />

        <SidebarProvider defaultOpen={true}>
          <div className="flex flex-1 overflow-hidden">
            <AppSidebar />
            
            {/* Main content scrolls independently */}
            <main className="flex-1 overflow-y-auto p-6">
               {children}
            </main>
          </div>
        </SidebarProvider>
      </div>
    </UserDetailProvider>
  )
}

export default DashboardProvider
