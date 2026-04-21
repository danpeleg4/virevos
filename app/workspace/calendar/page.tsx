"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Card } from "@/app/components/ui/card";
import { CalendarView } from "@/app/components/scheduling/CalendarView";
import { MeetingNotes } from "@/app/components/scheduling/MeetingNotes";
import { Meetings } from "@/app/components/scheduling/Meetings";
import { VideoMeetingPreferences } from "@/app/components/scheduling/IntegrationSettings";

const TABS = ["calendar", "meetings", "notes", "preferences"] as const;
type Tab = (typeof TABS)[number];

const TAB_LABELS: Record<Tab, string> = {
  calendar: "Calendar",
  meetings: "Meetings",
  notes: "Meeting Notes",
  preferences: "Preferences",
};

function CalendarContent() {
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<Tab>(
    (searchParams.get("tab") as Tab) ?? "calendar"
  );

  const tabNav = (
    <>
      {TABS.map((tab) => (
        <button
          key={tab}
          onClick={() => setActiveTab(tab)}
          className={`cursor-pointer whitespace-nowrap text-xs px-3 py-1.5 rounded-md transition-colors ${
            activeTab === tab
              ? "bg-card border border-border text-foreground shadow-sm font-medium"
              : "text-muted-foreground hover:text-foreground hover:bg-accent"
          }`}
        >
          {TAB_LABELS[tab]}
        </button>
      ))}
    </>
  );

  return (
    <div className="flex flex-col h-full p-4 sm:p-6 gap-6">
      {/* Main Card */}
      <Card className="flex-1 min-h-0 flex flex-col overflow-hidden">
        {/* Content — each tab component owns its own toolbar row with tabNav on the left */}
        <div className="flex-1 min-h-0 overflow-hidden">
          {activeTab === "calendar" && <CalendarView tabNav={tabNav} />}
          {activeTab === "meetings" && (
            <div className="h-full flex flex-col">
              <Meetings tabNav={tabNav} />
            </div>
          )}
          {activeTab === "notes" && (
            <div className="h-full flex flex-col">
              <MeetingNotes tabNav={tabNav} />
            </div>
          )}
          {activeTab === "preferences" && (
            <div className="h-full flex flex-col">
              <div className="flex items-center gap-1 px-4 py-3 border-b border-border bg-muted/50 shrink-0 overflow-x-auto">
                {tabNav}
              </div>
              <div className="flex-1 overflow-y-auto">
                <VideoMeetingPreferences />
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

export default function Calendar() {
  return (
    <Suspense>
      <CalendarContent />
    </Suspense>
  );
}
