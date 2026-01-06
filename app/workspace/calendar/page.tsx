"use client"

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { CalendarView } from "../../components/scheduling/CalendarView";
import { MeetingTypes } from "../../components/scheduling/MeetingTypes";
import { IntegrationSettings } from "../../components/scheduling/IntegrationSettings";
import { AutoScheduleSettings } from "../../components/scheduling/AutoScheduleSettings";
import { MeetingNotes } from "../../components/scheduling/MeetingNotes";

export default function Calendar() {
    const [activeTab, setActiveTab] = useState("calendar");

    return (
        <div className="flex flex-col h-full p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto overflow-hidden">
        <div className="mb-6 flex-shrink-0">
                <h1 className="text-gray-900 mb-2">Smart Scheduling</h1>
                <p className="text-gray-600">
                    AI-powered scheduling that adapts to your workload and automatically manages conflicts
                </p>
            </div>

            <Tabs
                value={activeTab}
                onValueChange={setActiveTab}
                className="flex-1 flex flex-col min-h-0 overflow-hidden"
            >
            <TabsList className="mb-6 flex-shrink-0">
                    <TabsTrigger className="cursor-pointer" value="calendar">Calendar</TabsTrigger>
                    <TabsTrigger className="cursor-pointer" value="meeting-types">Event Types</TabsTrigger>
                    <TabsTrigger className="cursor-pointer" value="notes">Meeting Notes</TabsTrigger>
                    <TabsTrigger className="cursor-pointer" value="auto-schedule">Auto-Schedule</TabsTrigger>
                    <TabsTrigger className="cursor-pointer" value="integrations">Integrations</TabsTrigger>
                </TabsList>

                <TabsContent
                    value="calendar"
                    className="flex-1 min-h-0 overflow-hidden"
                >
                    <CalendarView />
                </TabsContent>

                <TabsContent value="meeting-types" className="flex-1 min-h-0 overflow-y-auto">
                    <MeetingTypes />
                </TabsContent>

                <TabsContent value="notes" className="flex-1 min-h-0 overflow-y-auto">
                    <MeetingNotes />
                </TabsContent>

                <TabsContent value="auto-schedule" className="flex-1 min-h-0 overflow-y-auto">
                    <AutoScheduleSettings />
                </TabsContent>

                <TabsContent value="integrations" className="flex-1 min-h-0 overflow-y-auto">
                    <IntegrationSettings />
                </TabsContent>
            </Tabs>
        </div>
    );
}
