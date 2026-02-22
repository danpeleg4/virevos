"use client";

import { useState } from "react";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../../components/ui/tabs";
import { UnifiedInbox } from "../../components/communications/UnifiedInbox";
import { ScheduledMessages } from "../../components/communications/ScheduledMessages";
import { ClientPortal } from "../../components/communications/ClientPortal";
import { ConversationSummaries } from "../../components/communications/ConversationSummaries";
import { Badge } from "../../components/ui/badge";

export default function Communications() {
  const [activeTab, setActiveTab] = useState("inbox");
  const [unreadCount] = useState(8);
  const [scheduledCount] = useState(3);
  const [healthIssues] = useState(2);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl text-gray-900 mb-2">Communications</h1>
          <p className="text-gray-600">
            Unified inbox for all client communications with AI-powered assistance
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="overflow-x-auto pb-1">
          <TabsList className="mb-6 min-w-max">
            <TabsTrigger value="inbox" className="relative cursor-pointer">
              Inbox
              {unreadCount > 0 && (
                <Badge className="ml-2 bg-red-500 text-white">
                  {unreadCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="scheduled" className="cursor-pointer">
              Scheduled
              {scheduledCount > 0 && (
                <Badge className="ml-2" variant="outline">
                  {scheduledCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="summaries" className="cursor-pointer">
              Summaries
            </TabsTrigger>
            <TabsTrigger value="portal" className="cursor-pointer">
              Client Portal
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="inbox">
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
