"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/app/components/ui/tabs";
import { CalendarView } from "@/app/components/scheduling/CalendarView";
import { MeetingNotes } from "@/app/components/scheduling/MeetingNotes";
import { Meetings } from "@/app/components/scheduling/Meetings";
import { VideoMeetingPreferences } from "@/app/components/scheduling/IntegrationSettings";

function CalendarContent() {
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState(
    searchParams.get("tab") ?? "calendar"
  );

  return (
    <div className="flex flex-col h-full p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto overflow-hidden">
      <div className="mb-6 shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl text-gray-900 mb-2">
            Smart Scheduling
          </h1>
          <p className="text-gray-600">
            AI-powered scheduling that adapts to your workload and automatically
            manages conflicts
          </p>
        </div>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="flex-1 flex flex-col min-h-0 overflow-hidden"
      >
        <div className="overflow-x-auto pb-1 shrink-0">
          <TabsList className="mb-6 min-w-max">
            <TabsTrigger className="cursor-pointer" value="calendar">
              Calendar
            </TabsTrigger>
            <TabsTrigger className="cursor-pointer" value="meetings">
              Meetings
            </TabsTrigger>
            <TabsTrigger className="cursor-pointer" value="notes">
              Meeting Notes
            </TabsTrigger>
            <TabsTrigger className="cursor-pointer" value="preferences">
              Preferences
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent
          value="calendar"
          className="flex-1 min-h-0 overflow-hidden"
        >
          <CalendarView />
        </TabsContent>

        <TabsContent
          value="meetings"
          className="flex-1 min-h-0 overflow-y-auto"
        >
          <Meetings></Meetings>
        </TabsContent>

        <TabsContent value="notes" className="flex-1 min-h-0 overflow-y-auto">
          <MeetingNotes />
        </TabsContent>

        <TabsContent value="preferences" className="flex-1 min-h-0 overflow-y-auto">
          <VideoMeetingPreferences />
        </TabsContent>

      </Tabs>
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
