import React from "react";
import MyAgents from "./MyAgents";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
const AiAgentTab = () => {
  return (
    <div className="mt-10">
      <Tabs defaultValue="myagent" className="w-full">
        <TabsList>
          <TabsTrigger value="myagent">My Agents</TabsTrigger>
        </TabsList>
        <TabsContent value="myagent">
          <MyAgents />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AiAgentTab;
