import {
  FolderKanban,
  MessageSquare,
  Paperclip,
  CalendarDays,
  Video,
} from "lucide-react";
import { Card } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import type { PortalData, PortalChatMessage } from "@/types/portal";
import { CasesTable } from "./CasesTable";

interface OverviewTabProps {
  data: PortalData;
  messages: PortalChatMessage[];
  onNavigate: (tab: string) => void;
}

export function OverviewTab({ data, messages, onNavigate }: OverviewTabProps) {
  const schedulingEnabled = !!data.settings?.meetingSchedulingEnabled;
  const upcomingBookings =
    data.bookings?.filter((b) => b.status !== "cancelled") ?? [];

  return (
    <div className="space-y-6 mt-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left */}
        <div className="lg:col-span-2 space-y-6">
          {/* Cases table */}
          <Card className="overflow-hidden p-0">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-muted/50">
              <FolderKanban className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-foreground">
                Active Cases
              </span>
            </div>
            <div>
              {data.cases.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-10 text-center px-6">
                  <FolderKanban className="h-8 w-8 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">No cases yet</p>
                </div>
              ) : (
                <CasesTable cases={data.cases.slice(0, 5)} />
              )}
              {data.cases.length > 5 && (
                <div className="px-4 py-3 border-t border-border">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs"
                    onClick={() => onNavigate("cases")}
                  >
                    View all {data.cases.length} cases
                  </Button>
                </div>
              )}
            </div>
          </Card>

          {/* Recent Messages */}
          <Card className="overflow-hidden p-0">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-muted/50">
              <MessageSquare className="h-4 w-4 text-purple-600" />
              <span className="text-sm font-medium text-foreground">
                Recent Messages
              </span>
            </div>
            <div className="space-y-2 p-4">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-8 text-center">
                  <MessageSquare className="h-8 w-8 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    No messages yet
                  </p>
                </div>
              ) : (
                messages
                  .slice(-3)
                  .reverse()
                  .map((msg) => {
                    const isUnread = msg.senderType === "agency" && !msg.readAt;
                    const senderLabel =
                      msg.senderType === "agency"
                        ? data.settings?.title || "Agency"
                        : data.client.name;
                    return (
                      <div
                        key={msg.id}
                        className={`p-3 rounded-lg border ${
                          isUnread
                            ? "bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800"
                            : "bg-muted/50 border-border"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-xs font-medium text-foreground">
                            {senderLabel}
                          </p>
                          <span className="text-xs text-muted-foreground">
                            {new Date(msg.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {msg.body}
                        </p>
                      </div>
                    );
                  })
              )}
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-xs mt-1"
                onClick={() => onNavigate("messages")}
              >
                View all messages
              </Button>
            </div>
          </Card>
        </div>

        {/* Right sidebar */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <Card className="overflow-hidden p-0">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-muted/50">
              <span className="text-sm font-medium text-foreground">
                Quick Actions
              </span>
            </div>
            <div className="space-y-2 p-4">
              {(data.settings?.chatEnabled ?? true) && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start gap-2"
                  onClick={() => onNavigate("messages")}
                >
                  <MessageSquare className="h-4 w-4" />
                  Send Message
                </Button>
              )}
              {(data.settings?.fileSharing ?? true) && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start gap-2"
                  onClick={() => onNavigate("files")}
                >
                  <Paperclip className="h-4 w-4" />
                  Files
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start gap-2"
                onClick={() => onNavigate("cases")}
              >
                <FolderKanban className="h-4 w-4" />
                View Cases
              </Button>
              {schedulingEnabled && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start gap-2"
                  onClick={() => onNavigate("schedule")}
                >
                  <CalendarDays className="h-4 w-4" />
                  Schedule Meeting
                </Button>
              )}
            </div>
          </Card>

          {/* Upcoming Meetings */}
          {schedulingEnabled && upcomingBookings.length > 0 && (
            <Card className="overflow-hidden p-0">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-muted/50">
                <CalendarDays className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium text-foreground">
                  Upcoming Meetings
                </span>
              </div>
              <div className="space-y-2 p-4">
                {upcomingBookings.slice(0, 3).map((b) => (
                  <div
                    key={b.id}
                    className="p-3 rounded-lg bg-muted/50 border border-border"
                  >
                    <p className="text-xs font-medium text-foreground">
                      {new Date(b.dateTime).toLocaleDateString(undefined, {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                      })}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {new Date(b.dateTime).toLocaleTimeString(undefined, {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}{" "}
                      · {b.duration} min ·{" "}
                      <span className="capitalize">{b.status}</span>
                    </p>
                    {b.status === "confirmed" && b.meetingLink && (
                      <a
                        href={b.meetingLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                      >
                        <Video className="h-3.5 w-3.5" />
                        Join meeting
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
