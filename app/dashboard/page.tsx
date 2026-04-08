// app/dashboard/page.tsx
"use client";
import CreateAgentSection from "./_components/CreateAgentSection";
import AiAgentTab from "./_components/AiAgentTab";
import DashboardRealtimeOverview from "./_components/DashboardRealtimeOverview";
import { SafeRenderBoundary } from "@/components/system/SafeRenderBoundary";

export default function DashboardPage() {
  return (
    <div className="w-full pb-8">
      <CreateAgentSection />
      <SafeRenderBoundary fallback={null}>
        <DashboardRealtimeOverview />
      </SafeRenderBoundary>
      <AiAgentTab />
    </div>
  )
}
