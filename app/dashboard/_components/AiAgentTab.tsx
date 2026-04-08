import React from "react";
import MyAgents from "./MyAgents";
import { SafeRenderBoundary } from "@/components/system/SafeRenderBoundary";

const AiAgentTab = () => {
  return (
    <div className="mt-2 w-full">
      <div className="inline-flex rounded-[18px] bg-[#f0f2f5] p-1 text-slate-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.65)]">
        <div className="rounded-[14px] bg-white px-4 py-2.5 text-base font-semibold shadow-sm">
          My Agents
        </div>
      </div>
      <div className="mt-7">
        <SafeRenderBoundary fallback={null}>
          <MyAgents />
        </SafeRenderBoundary>
      </div>
    </div>
  );
};

export default AiAgentTab;
