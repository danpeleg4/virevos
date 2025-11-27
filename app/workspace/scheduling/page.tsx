"use client"

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { CalendarView } from "../../components/scheduling/CalendarView";
import { AvailabilitySettings } from "../../components/scheduling/AvailabilitySettings";
import { MeetingTypes } from "../../components/scheduling/MeetingTypes";
import { IntegrationSettings } from "../../components/scheduling/IntegrationSettings";
import { AutoScheduleSettings } from "../../components/scheduling/AutoScheduleSettings";
import { MeetingNotes } from "../../components/scheduling/MeetingNotes";

export default function Scheduling() {
    const [activeTab, setActiveTab] = useState("calendar");

    return (
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
            <div className="mb-6">
                <h1 className="text-gray-900 mb-2">Smart Scheduling</h1>
                <p className="text-gray-600">
                    AI-powered scheduling that adapts to your workload and automatically manages conflicts
                </p>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="mb-6">
                    <TabsTrigger className="cursor-pointer" value="calendar">Calendar</TabsTrigger>
                    <TabsTrigger className="cursor-pointer" value="availability">Availability</TabsTrigger>
                    <TabsTrigger className="cursor-pointer" value="meeting-types">Meeting Types</TabsTrigger>
                    <TabsTrigger className="cursor-pointer" value="notes">Meeting Notes</TabsTrigger>
                    <TabsTrigger className="cursor-pointer" value="auto-schedule">Auto-Schedule</TabsTrigger>
                    <TabsTrigger className="cursor-pointer" value="integrations">Integrations</TabsTrigger>
                </TabsList>

                <TabsContent value="calendar">
                    <CalendarView />
                </TabsContent>

                <TabsContent value="availability">
                    <AvailabilitySettings />
                </TabsContent>

                <TabsContent value="meeting-types">
                    <MeetingTypes />
                </TabsContent>

                <TabsContent value="notes">
                    <MeetingNotes />
                </TabsContent>

                <TabsContent value="auto-schedule">
                    <AutoScheduleSettings />
                </TabsContent>

                <TabsContent value="integrations">
                    <IntegrationSettings />
                </TabsContent>
            </Tabs>
        </div>
    );
}
