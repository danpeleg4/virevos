"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent } from "@/app/components/ui/card";
import { Loader2, AlertCircle } from "lucide-react";
import { usePortalData, usePortalChat } from "./_lib/hooks";
import { PortalHeader } from "./_components/PortalHeader";
import { OverviewTab } from "./_components/OverviewTab";
import { CasesTab } from "./_components/CasesTab";
import { MessagesTab } from "./_components/MessagesTab";
import { FilesTab } from "./_components/FilesTab";
import { DocumentsTab } from "./_components/DocumentsTab";
import { ScheduleTab } from "./_components/ScheduleTab";

export default function PortalPage() {
  const params = useParams();
  const token = params.token as string;

  const [activeTab, setActiveTab] = useState("overview");

  const portalQuery = usePortalData(token);
  const { messages, sendMessage } = usePortalChat(token);

  const data = portalQuery.data;

  if (portalQuery.isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          <p className="text-sm text-muted-foreground">
            Loading your portal...
          </p>
        </div>
      </div>
    );
  }

  if (portalQuery.isError || !data) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="py-12 text-center">
            <AlertCircle className="h-10 w-10 text-red-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-foreground mb-2">
              Portal Not Found
            </h2>
            <p className="text-sm text-muted-foreground">
              This client portal is not available or has been disabled.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const portalTitle = data.settings?.title || "Client Portal";
  const unreadCount = messages.filter(
    (m) => m.senderType === "agency" && !m.readAt
  ).length;
  const schedulingEnabled = !!data.settings?.meetingSchedulingEnabled;
  const pendingDocumentItemsCount = data.documentRequests.reduce(
    (acc, req) =>
      acc + req.items.filter((it) => it.status !== "uploaded").length,
    0
  );

  const tabs = [
    { value: "overview", label: "Overview" },
    { value: "cases", label: "Cases", count: data.cases.length },
    { value: "messages", label: "Messages", count: unreadCount },
    { value: "files", label: "Files", count: data.files?.length },
    ...(data.documentRequests.length > 0
      ? [
          {
            value: "documents",
            label: "Documents Needed",
            count: pendingDocumentItemsCount,
          },
        ]
      : []),
    ...(schedulingEnabled
      ? [{ value: "schedule", label: "Schedule Meeting" }]
      : []),
  ] as { value: string; label: string; count?: number }[];

  return (
    <div className="min-h-screen bg-background">
      <PortalHeader client={data.client} title={portalTitle} />

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 p-4 sm:p-6 space-y-6">
        {/* Welcome */}
        <div>
          <h1 className="text-2xl text-foreground">
            Welcome back, {data.client.name.split(" ")[0]}
          </h1>
          <p className="text-muted-foreground mt-1">
            {data.settings?.welcomeMessage ||
              "Here's what's happening with your cases"}
          </p>
        </div>

        {/* Tabs */}
        <div>
          <div
            data-testid="portal-tab-bar"
            className="flex items-center gap-1 p-2 rounded-lg border border-border bg-muted/50 overflow-x-auto"
          >
            {tabs.map((tab) => (
              <button
                key={tab.value}
                onClick={() => setActiveTab(tab.value)}
                className={`cursor-pointer text-xs px-3 py-1.5 rounded-md transition-colors whitespace-nowrap ${
                  activeTab === tab.value
                    ? "bg-card border border-border text-foreground shadow-sm font-medium"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
                }`}
              >
                {tab.label}
                {tab.count !== undefined && tab.count > 0 && (
                  <span
                    className={`ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full ${
                      activeTab === tab.value
                        ? "bg-muted text-muted-foreground"
                        : "text-muted-foreground"
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {activeTab === "overview" && (
            <OverviewTab
              data={data}
              messages={messages}
              onNavigate={setActiveTab}
            />
          )}

          {activeTab === "cases" && <CasesTab data={data} />}

          {activeTab === "messages" && (
            <MessagesTab
              data={data}
              messages={messages}
              isSending={sendMessage.isPending}
              onSend={(body) => sendMessage.mutate(body)}
            />
          )}

          {activeTab === "files" && <FilesTab data={data} token={token} />}

          {activeTab === "documents" && (
            <DocumentsTab data={data} token={token} />
          )}

          {schedulingEnabled && activeTab === "schedule" && (
            <ScheduleTab data={data} token={token} />
          )}
        </div>
      </div>
    </div>
  );
}
