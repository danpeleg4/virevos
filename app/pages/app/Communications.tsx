import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { UnifiedInbox } from "../../components/communications/UnifiedInbox";
import { ScheduledMessages } from "../../components/communications/ScheduledMessages";
import { ClientPortal } from "../../components/communications/ClientPortal";
import { ConversationSummaries } from "../../components/communications/ConversationSummaries";
import { CommsHealthDashboard } from "../../components/communications/CommsHealthDashboard";
import { Badge } from "../../components/ui/badge";

export function Communications() {
  const [activeTab, setActiveTab] = useState("inbox");
  const [unreadCount] = useState(8);
  const [scheduledCount] = useState(3);
  const [healthIssues] = useState(2);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-gray-900 mb-2">Communications</h1>
        <p className="text-gray-600">
          Unified inbox for all client communications with AI-powered assistance
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="inbox" className="relative">
            Inbox
            {unreadCount > 0 && (
              <Badge className="ml-2 bg-red-500 text-white">{unreadCount}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="scheduled">
            Scheduled
            {scheduledCount > 0 && (
              <Badge className="ml-2" variant="outline">{scheduledCount}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="summaries">Summaries</TabsTrigger>
          <TabsTrigger value="health" className="relative">
            Comms Health
            {healthIssues > 0 && (
              <Badge className="ml-2 bg-orange-500 text-white">{healthIssues}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="portal">Client Portal</TabsTrigger>
        </TabsList>

        <TabsContent value="inbox">
          <UnifiedInbox />
        </TabsContent>

        <TabsContent value="scheduled">
          <ScheduledMessages />
        </TabsContent>

        <TabsContent value="summaries">
          <ConversationSummaries />
        </TabsContent>

        <TabsContent value="health">
          <CommsHealthDashboard />
        </TabsContent>

        <TabsContent value="portal">
          <ClientPortal />
        </TabsContent>
      </Tabs>
    </div>
  );
}
