"use client";

import { use, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  ArrowLeft,
  Building2,
  Calendar,
  ExternalLink,
  Flag,
  FolderOpen,
  Globe,
  Loader2,
  Mail,
  MessageSquare,
  Pencil,
  Phone,
  Trash2,
} from "lucide-react";
import { Card } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Badge } from "@/app/components/ui/badge";
import { ClientPortalSettings } from "@/app/components/clients/ClientPortalSettings";
import { PortalChatPane } from "@/app/components/communications/PortalChatPane";
import { ClientEditDialog } from "@/app/workspace/clients/ClientEditDialog";
import type { clients } from "@/types/clients";
import type { PortalAvailability, PortalRecord } from "@/types/portal";

type Section = "portal" | "cases" | "communications";

interface ClientCaseRow {
  id: number;
  name: string;
  status: string;
  priority: string;
  dueDate: string | null;
  stats: { totalTasks: number; completedTasks: number; percentage: number };
}

interface OutlookEmailRow {
  id: number;
  subject: string | null;
  snippet: string | null;
  fromEmail: string | null;
  fromName: string | null;
  toEmails: string[] | null;
  isRead: boolean | null;
  isSent: boolean | null;
  hasAttachments: boolean | null;
  sentAt: string;
}

interface ClientDetailResponse {
  client: clients;
  portal: unknown;
}

const DEFAULT_WELCOME =
  "Your Visa Readiness Dashboard. Monitor your deadlines and keep your documents audit-ready";

const DEFAULT_AVAILABILITY: PortalAvailability = {
  weeklySchedule: {
    monday: { enabled: true, startTime: "09:00", endTime: "17:00" },
    tuesday: { enabled: true, startTime: "09:00", endTime: "17:00" },
    wednesday: { enabled: true, startTime: "09:00", endTime: "17:00" },
    thursday: { enabled: true, startTime: "09:00", endTime: "17:00" },
    friday: { enabled: true, startTime: "09:00", endTime: "17:00" },
    saturday: { enabled: false, startTime: "09:00", endTime: "17:00" },
    sunday: { enabled: false, startTime: "09:00", endTime: "17:00" },
  },
  meetingDurations: [15, 30, 45, 60],
  bufferMinutes: 15,
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
};

interface PortalFormState {
  portalEnabled: boolean;
  title: string;
  welcomeMessage: string;
  chatEnabled: boolean;
  fileSharing: boolean;
  aiChatBot: boolean;
  emailNotifications: boolean;
  meetingSchedulingEnabled: boolean;
  availability: PortalAvailability;
}

const DEFAULT_PORTAL_FORM_STATE: PortalFormState = {
  portalEnabled: true,
  title: "",
  welcomeMessage: DEFAULT_WELCOME,
  chatEnabled: true,
  fileSharing: true,
  aiChatBot: true,
  emailNotifications: true,
  meetingSchedulingEnabled: false,
  availability: DEFAULT_AVAILABILITY,
};

function buildPortalFormState(portal: PortalRecord): PortalFormState {
  return {
    portalEnabled: portal.enabled,
    title: portal.settings?.title || "",
    welcomeMessage: portal.settings?.welcomeMessage || DEFAULT_WELCOME,
    chatEnabled: portal.settings?.chatEnabled ?? true,
    fileSharing: portal.settings?.fileSharing ?? true,
    aiChatBot: portal.settings?.aiChatBot ?? true,
    emailNotifications: portal.settings?.emailNotifications ?? true,
    meetingSchedulingEnabled:
      portal.settings?.meetingSchedulingEnabled ?? false,
    availability: portal.settings?.availability ?? DEFAULT_AVAILABILITY,
  };
}

function StatusBadge({ status }: { status: string }) {
  if (status === "active") {
    return (
      <Badge
        variant="outline"
        className="border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-950/50"
      >
        Active
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="border-border text-muted-foreground">
      Inactive
    </Badge>
  );
}

function CasePriorityBadge({ priority }: { priority: string }) {
  const styles =
    priority === "high"
      ? "bg-red-50 dark:bg-red-950/50 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800"
      : priority === "medium"
        ? "bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300 border border-yellow-300 dark:border-yellow-700"
        : "bg-muted text-muted-foreground border border-border";
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-md font-medium ${styles}`}
    >
      <Flag className="h-3 w-3" />
      {priority}
    </span>
  );
}

function CaseStatusBadge({ status }: { status: string }) {
  if (status === "completed") {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-0.5 rounded-md font-medium bg-green-50 dark:bg-green-950/50 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800">
        <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
        Completed
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-0.5 rounded-md font-medium bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
      <span className="w-1.5 h-1.5 rounded-full bg-blue-500 inline-block" />
      {status}
    </span>
  );
}

export default function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();

  const [activeSection, setActiveSection] = useState<Section>("portal");
  const [editOpen, setEditOpen] = useState(false);
  const [portalEnabled, setPortalEnabled] = useState(
    DEFAULT_PORTAL_FORM_STATE.portalEnabled
  );
  const [chatEnabled, setChatEnabled] = useState(
    DEFAULT_PORTAL_FORM_STATE.chatEnabled
  );
  const [fileSharing, setFileSharing] = useState(
    DEFAULT_PORTAL_FORM_STATE.fileSharing
  );
  const [emailNotifications, setEmailNotifications] = useState(
    DEFAULT_PORTAL_FORM_STATE.emailNotifications
  );
  const [aiChatBot, setAiChatBot] = useState(
    DEFAULT_PORTAL_FORM_STATE.aiChatBot
  );
  const [title, setTitle] = useState(DEFAULT_PORTAL_FORM_STATE.title);
  const [welcomeMessage, setWelcomeMessage] = useState(
    DEFAULT_PORTAL_FORM_STATE.welcomeMessage
  );
  const [meetingSchedulingEnabled, setMeetingSchedulingEnabled] = useState(
    DEFAULT_PORTAL_FORM_STATE.meetingSchedulingEnabled
  );
  const [availability, setAvailability] = useState<PortalAvailability>(
    DEFAULT_PORTAL_FORM_STATE.availability
  );
  const [savedSnapshot, setSavedSnapshot] = useState<PortalFormState>(
    DEFAULT_PORTAL_FORM_STATE
  );
  const autoProvisionedRef = useRef(false);

  const clientQuery = useQuery({
    queryKey: ["client", id],
    queryFn: async () => {
      const { data } = await axios.get<ClientDetailResponse>(
        `/api/clients/${id}?type=main`
      );
      return data;
    },
    enabled: !!id,
  });

  const portalQuery = useQuery({
    queryKey: ["clientPortal", id],
    queryFn: async () => {
      const { data } = await axios.get<{ portal: PortalRecord | null }>(
        `/api/clients/${id}?type=portal`
      );
      return data.portal;
    },
  });

  const currentPortal = portalQuery.data;

  const casesQuery = useQuery({
    queryKey: ["clientCases", id],
    queryFn: async () => {
      const { data } = await axios.get<{ cases: ClientCaseRow[] }>(
        `/api/clients/${id}?type=cases`
      );
      return data.cases;
    },
    enabled: !!id && activeSection === "cases",
  });

  const emailsQuery = useQuery({
    queryKey: ["clientOutlookEmails", id],
    queryFn: async () => {
      const { data } = await axios.get<{ emails: OutlookEmailRow[] }>(
        `/api/clients/${id}?type=outlook-emails`
      );
      return data.emails;
    },
    enabled: !!id && activeSection === "communications",
  });

  const deleteMutation = useMutation({
    mutationFn: async (clientId: number) => {
      await axios.delete(`/api/clients/${clientId}`);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["clients"] });
      router.push("/workspace/clients");
    },
  });

  useEffect(() => {
    const portal = portalQuery.data;
    if (portal) {
      const snapshot = buildPortalFormState(portal);
      setPortalEnabled(snapshot.portalEnabled);
      setTitle(snapshot.title);
      setWelcomeMessage(snapshot.welcomeMessage);
      setChatEnabled(snapshot.chatEnabled);
      setFileSharing(snapshot.fileSharing);
      setAiChatBot(snapshot.aiChatBot);
      setEmailNotifications(snapshot.emailNotifications);
      setMeetingSchedulingEnabled(snapshot.meetingSchedulingEnabled);
      setAvailability(snapshot.availability);
      setSavedSnapshot(snapshot);
    }
  }, [portalQuery.data]);

  const savePortalMutation = useMutation({
    mutationFn: async (payload: {
      enabled: boolean;
      settings: Omit<PortalFormState, "portalEnabled">;
    }) => {
      await axios.post(`/api/clients/${id}/portal`, payload);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["clientPortal", id] });
      await queryClient.invalidateQueries({ queryKey: ["portalBookings"] });
    },
    onError: (err: unknown) => {
      console.error("Failed to save settings:", err);
    },
  });

  const buildSavePayload = () => ({
    enabled: portalEnabled,
    settings: {
      title,
      welcomeMessage,
      chatEnabled,
      fileSharing,
      aiChatBot,
      emailNotifications,
      meetingSchedulingEnabled,
      availability,
    },
  });

  useEffect(() => {
    if (
      portalQuery.isSuccess &&
      portalQuery.data === null &&
      !autoProvisionedRef.current
    ) {
      autoProvisionedRef.current = true;
      savePortalMutation.mutate(buildSavePayload());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [portalQuery.isSuccess, portalQuery.data]);

  const currentFormState: PortalFormState = {
    portalEnabled,
    title,
    welcomeMessage,
    chatEnabled,
    fileSharing,
    aiChatBot,
    emailNotifications,
    meetingSchedulingEnabled,
    availability,
  };
  const isPortalDirty =
    JSON.stringify(currentFormState) !== JSON.stringify(savedSnapshot);

  const handleSave = () => {
    savePortalMutation.mutate(buildSavePayload());
  };

  if (clientQuery.isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }
  if (clientQuery.isError || !clientQuery.data) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <AlertCircle className="h-10 w-10 text-red-400 mx-auto mb-3" />
          <p className="text-muted-foreground">Failed to load client</p>
        </div>
      </div>
    );
  }

  const client = clientQuery.data.client;
  const clientInitials =
    (client.name ?? "")
      .split(" ")
      .map((s) => s[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase() || "?";

  const SECTIONS: {
    value: Section;
    label: string;
    icon: React.ReactNode;
  }[] = [
    {
      value: "portal",
      label: "Portal",
      icon: <Globe className="h-3.5 w-3.5" />,
    },
    {
      value: "cases",
      label: "Cases",
      icon: <FolderOpen className="h-3.5 w-3.5" />,
    },
    {
      value: "communications",
      label: "Communications",
      icon: <MessageSquare className="h-3.5 w-3.5" />,
    },
  ];

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="flex items-start space-x-2 sm:space-x-4">
          <Button
            className="cursor-pointer shrink-0"
            variant="ghost"
            size="icon"
            onClick={() => router.push("/workspace/clients")}
            aria-label="Back to clients"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl text-foreground truncate flex items-center gap-2">
              <Building2 className="h-5 w-5 text-muted-foreground" />
              {client.name}
            </h1>
            <div className="text-muted-foreground mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
              {client.email && (
                <span className="inline-flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5" />
                  {client.email}
                </span>
              )}
              {client.phone && (
                <span className="inline-flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5" />
                  {client.phone}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-2 ml-10 sm:ml-0">
          <StatusBadge status={client.status} />
          <Button
            className="cursor-pointer shrink-0"
            variant="outline"
            size="sm"
            onClick={() => setEditOpen(true)}
          >
            <Pencil className="h-4 w-4 mr-2" />
            Edit
          </Button>
          <Button
            className="cursor-pointer shrink-0"
            variant="outline"
            size="sm"
            onClick={() => {
              if (confirm("Delete this client? This cannot be undone.")) {
                deleteMutation.mutate(client.id);
              }
            }}
            aria-label="Delete client"
          >
            <Trash2 className="h-4 w-4 text-red-500" />
          </Button>
        </div>
      </div>

      {/* Tabbed Card */}
      <Card className="overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-muted/50 flex-wrap">
          <div className="flex w-full items-center gap-1">
            {SECTIONS.map((s) => (
              <button
                key={s.value}
                onClick={() => setActiveSection(s.value)}
                className={`cursor-pointer inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md transition-colors ${
                  activeSection === s.value
                    ? "bg-card border border-border text-foreground shadow-sm font-medium"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
                }`}
              >
                {s.icon}
                {s.label}
              </button>
            ))}
            {activeSection === "portal" && (
              <div className="ml-auto flex items-center gap-2">
                {currentPortal && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      window.open(currentPortal.portalUrl, "_blank")
                    }
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Preview Portal
                  </Button>
                )}
                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={savePortalMutation.isPending || !isPortalDirty}
                >
                  {savePortalMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : null}
                  Save Changes
                </Button>
              </div>
            )}
          </div>
        </div>

        {activeSection === "portal" && (
          <ClientPortalSettings
            clientId={client.id}
            portalEnabled={portalEnabled}
            onPortalEnabledChange={setPortalEnabled}
            title={title}
            onTitleChange={setTitle}
            welcomeMessage={welcomeMessage}
            onWelcomeMessage={setWelcomeMessage}
            emailNotifications={emailNotifications}
            meetingSchedulingEnabled={meetingSchedulingEnabled}
            onMeetingSchedulingEnabledChange={setMeetingSchedulingEnabled}
            availability={availability}
            onAvailability={setAvailability}
            isProvisioningPortal={
              !currentPortal &&
              (portalQuery.isLoading || savePortalMutation.isPending)
            }
          />
        )}

        {activeSection === "cases" && (
          <div className="overflow-x-auto" data-testid="cases-tab">
            {casesQuery.isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
              </div>
            ) : (
              <table className="w-full">
                <thead className="border-b border-border">
                  <tr>
                    <th className="text-left px-3 py-2.5">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                        <FolderOpen className="h-3.5 w-3.5" />
                        Name
                      </div>
                    </th>
                    <th className="text-left px-3 py-2.5">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                        Status
                      </div>
                    </th>
                    <th className="text-left px-3 py-2.5">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                        <Flag className="h-3.5 w-3.5" />
                        Priority
                      </div>
                    </th>
                    <th className="text-left px-3 py-2.5">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                        <Calendar className="h-3.5 w-3.5" />
                        Due date
                      </div>
                    </th>
                    <th className="text-left px-3 py-2.5">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                        Progress
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {(casesQuery.data ?? []).map((c) => (
                    <tr
                      key={c.id}
                      onClick={() => router.push(`/workspace/cases/${c.id}`)}
                      className="cursor-pointer transition-colors hover:bg-muted/50"
                    >
                      <td className="px-3 py-2.5 text-sm text-foreground font-medium">
                        {c.name}
                      </td>
                      <td className="px-3 py-2.5">
                        <CaseStatusBadge status={c.status} />
                      </td>
                      <td className="px-3 py-2.5">
                        <CasePriorityBadge priority={c.priority} />
                      </td>
                      <td className="px-3 py-2.5 text-xs text-muted-foreground">
                        {c.dueDate || "—"}
                      </td>
                      <td className="px-3 py-2.5 text-xs text-muted-foreground">
                        {c.stats.completedTasks}/{c.stats.totalTasks} tasks ·{" "}
                        {Math.round(c.stats.percentage)}%
                      </td>
                    </tr>
                  ))}
                  {(casesQuery.data ?? []).length === 0 &&
                    !casesQuery.isLoading && (
                      <tr>
                        <td
                          colSpan={5}
                          className="px-3 py-12 text-center text-sm text-muted-foreground"
                        >
                          No cases yet for this client
                        </td>
                      </tr>
                    )}
                </tbody>
              </table>
            )}
          </div>
        )}

        {activeSection === "communications" && (
          <div
            className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-border"
            style={{ height: 600 }}
            data-testid="communications-tab"
          >
            <div className="flex flex-col min-h-0">
              <div className="px-4 py-2 border-b border-border bg-muted/30 text-xs font-medium text-muted-foreground">
                Portal Chat
              </div>
              <PortalChatPane
                clientId={client.id}
                clientName={client.name}
                clientInitials={clientInitials}
              />
            </div>
            <div className="flex flex-col min-h-0">
              <div className="px-4 py-2 border-b border-border bg-muted/30 text-xs font-medium text-muted-foreground">
                Emails
              </div>
              <div className="flex-1 overflow-y-auto">
                {emailsQuery.isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : (emailsQuery.data ?? []).length === 0 ? (
                  <div className="text-center py-12 text-sm text-muted-foreground">
                    No emails linked to this client
                  </div>
                ) : (
                  <ul className="divide-y divide-border">
                    {(emailsQuery.data ?? []).map((email) => (
                      <li
                        key={email.id}
                        className="px-4 py-3 hover:bg-muted/50"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-medium text-foreground truncate">
                            {email.subject || "(no subject)"}
                          </p>
                          <span className="text-[11px] text-muted-foreground shrink-0">
                            {new Date(email.sentAt).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          {email.fromName || email.fromEmail || "—"}
                        </p>
                        {email.snippet && (
                          <p className="text-xs text-muted-foreground truncate mt-1">
                            {email.snippet}
                          </p>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        )}
      </Card>

      {editOpen && (
        <ClientEditDialog
          aClient={client}
          open={editOpen}
          onOpenChange={(open) => {
            setEditOpen(open);
            if (!open) {
              void queryClient.invalidateQueries({ queryKey: ["client", id] });
            }
          }}
        />
      )}
    </div>
  );
}
