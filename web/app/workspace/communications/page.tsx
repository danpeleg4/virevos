"use client";

import { useState } from "react";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/app/components/ui/tabs";
import { UnifiedInbox } from "@/app/components/communications/UnifiedInbox";
import { ScheduledMessages } from "@/app/components/communications/ScheduledMessages";
import { ClientPortal } from "@/app/components/communications/ClientPortal";
import { ConversationSummaries } from "@/app/components/communications/ConversationSummaries";

const fillStyle: React.CSSProperties = {
  flex: "1 1 0%",
  minHeight: 0,
  display: "flex",
  flexDirection: "column",
};

export default function Communications() {
  const [activeTab, setActiveTab] = useState("inbox");
  return (
    <div
      className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto flex flex-col overflow-hidden"
      style={{ height: "calc(100dvh - 65px)" }}
    >
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl text-gray-900 mb-2">
            Communications
          </h1>
          <p className="text-gray-600">
            Unified inbox for all client communications with AI-powered
            assistance
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} style={fillStyle}>
        <div className="overflow-x-auto pb-1 shrink-0">
          <TabsList className="mb-4 min-w-max">
            <TabsTrigger value="inbox" className="relative cursor-pointer">
              Inbox
            </TabsTrigger>
            <TabsTrigger value="scheduled" className="cursor-pointer">
              Scheduled
            </TabsTrigger>
            <TabsTrigger value="summaries" className="cursor-pointer">
              Summaries
            </TabsTrigger>
            <TabsTrigger value="portal" className="cursor-pointer">
              Client Portal
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="inbox" style={fillStyle}>
          <UnifiedInbox />
        </TabsContent>

        <TabsContent value="scheduled">
          <ScheduledMessages />
        </TabsContent>

        <TabsContent value="summaries">
          <ConversationSummaries />
        </TabsContent>

        <TabsContent value="portal">
          <ClientPortal />
        </TabsContent>
      </Tabs>
    </div>
  );
}
