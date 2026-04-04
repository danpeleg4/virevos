"use client";

import { useState } from "react";
import { Card } from "@/app/components/ui/card";
import { UnifiedInbox } from "@/app/components/communications/UnifiedInbox";
import { ScheduledMessages } from "@/app/components/communications/ScheduledMessages";
import { ClientPortal } from "@/app/components/communications/ClientPortal";

const TABS = [
  { value: "inbox", label: "Inbox" },
  { value: "scheduled", label: "Scheduled" },
  { value: "portal", label: "Client Portal" },
] as const;

type TabValue = (typeof TABS)[number]["value"];

const fillStyle: React.CSSProperties = {
  flex: "1 1 0%",
  minHeight: 0,
  display: "flex",
  flexDirection: "column",
};

export default function Communications() {
  const [activeTab, setActiveTab] = useState<TabValue>("inbox");
  const [portalNavContainer, setPortalNavContainer] =
    useState<HTMLDivElement | null>(null);
  const [scheduledNavContainer, setScheduledNavContainer] =
    useState<HTMLDivElement | null>(null);
  const [inboxNavContainer, setInboxNavContainer] =
    useState<HTMLDivElement | null>(null);

  return (
    <div
      className="p-4 sm:p-6 lg:p-8 flex flex-col overflow-hidden"
      style={{ height: "calc(100dvh - 65px)" }}
    >
      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
        <div>
          <h1 className="text-2xl sm:text-3xl text-foreground">
            Communications
          </h1>
          <p className="mt-1 text-muted-foreground">
            Unified inbox for all client communications with AI-powered
            assistance
          </p>
        </div>
      </div>

      {/* Card with embedded tabs */}
      <Card className="flex flex-col overflow-hidden" style={fillStyle}>
        {/* Tab nav */}
        <div className="flex items-center gap-1 px-4 py-3 border-b border-border bg-muted/50 shrink-0 overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={`cursor-pointer px-3 py-1.5 text-xs rounded-md whitespace-nowrap transition-colors ${
                activeTab === tab.value
                  ? "bg-card border border-border text-foreground shadow-sm font-medium"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent"
              }`}
            >
              {tab.label}
            </button>
          ))}
          {activeTab === "inbox" && (
            <div
              ref={setInboxNavContainer}
              className="ml-auto flex items-center gap-2"
            />
          )}
          {activeTab === "scheduled" && (
            <div
              ref={setScheduledNavContainer}
              className="ml-auto flex items-center gap-2"
            />
          )}
          {activeTab === "portal" && (
            <div
              ref={setPortalNavContainer}
              className="ml-auto flex items-center"
            />
          )}
        </div>

        {/* Tab content */}
        <div style={fillStyle} className="overflow-hidden">
          {activeTab === "inbox" && (
            <UnifiedInbox navContainer={inboxNavContainer} />
          )}
          {activeTab === "scheduled" && (
            <ScheduledMessages navContainer={scheduledNavContainer} />
          )}
          {activeTab === "portal" && (
            <ClientPortal navContainer={portalNavContainer} />
          )}
        </div>
      </Card>
    </div>
  );
}
