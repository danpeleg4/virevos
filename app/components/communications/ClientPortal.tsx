"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Switch } from "../ui/switch";
import { Textarea } from "../ui/textarea";
import { Badge } from "../ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import {
  Globe,
  Palette,
  MessageSquare,
  Bell,
  ExternalLink,
  Copy,
  Eye,
  Sparkles,
  Loader2,
} from "lucide-react";
import { Separator } from "../ui/separator";
import { toast } from "sonner";
import type { PortalRecord } from "@/types/portal";
import type { ClientSummary } from "@/types/clients";

interface ClientPortalProps {
  navContainer: HTMLDivElement | null;
}

export function ClientPortal({ navContainer }: ClientPortalProps) {
  const [portals, setPortals] = useState<PortalRecord[]>([]);
  const [clients, setClients] = useState<ClientSummary[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Settings state for currently selected client
  const [portalEnabled, setPortalEnabled] = useState(true);
  const [chatEnabled, setChatEnabled] = useState(true);
  const [fileSharing, setFileSharing] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [aiChatBot, setAiChatBot] = useState(true);
  const [title, setTitle] = useState("");
  const [welcomeMessage, setWelcomeMessage] = useState(
    "Welcome to our client portal! We're here to help you track your project progress and stay in touch."
  );

  useEffect(() => {
    fetchPortals();
    fetchClients();
  }, []);

  const fetchPortals = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/portal/settings");
      if (res.ok) {
        const data = await res.json();
        setPortals(data.portals || []);
      }
    } catch (err) {
      console.error("Failed to fetch portals:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchClients = async () => {
    try {
      const res = await fetch("/api/clients");
      if (res.ok) {
        const data = await res.json();
        setClients(data.clients || data || []);
      }
    } catch (err) {
      console.error("Failed to fetch clients:", err);
    }
  };

  const handleClientChange = (clientId: string) => {
    setSelectedClientId(clientId);
    const portal = portals.find((p) => String(p.clientId) === clientId);
    if (portal) {
      setPortalEnabled(portal.enabled);
      setTitle(portal.settings?.title || "");
      setChatEnabled(portal.settings?.chatEnabled ?? true);
      setFileSharing(portal.settings?.fileSharing ?? true);
      setAiChatBot(portal.settings?.aiChatBot ?? true);
      setEmailNotifications(portal.settings?.emailNotifications ?? true);
    } else {
      setPortalEnabled(true);
      setTitle("");
      setWelcomeMessage(
        "Welcome to our client portal! We're here to help you track your project progress and stay in touch."
      );
      setChatEnabled(true);
      setFileSharing(true);
      setAiChatBot(true);
      setEmailNotifications(true);
    }
  };

  const handleSave = async () => {
    if (!selectedClientId) {
      toast.error("Please select a client first");
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch("/api/portal/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: parseInt(selectedClientId, 10),
          enabled: portalEnabled,
          settings: {
            title,
            welcomeMessage,
            chatEnabled,
            fileSharing,
            aiChatBot,
            emailNotifications,
          },
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setPortals((prev) => {
          const existing = prev.find(
            (p) => String(p.clientId) === selectedClientId
          );
          if (existing) {
            return prev.map((p) =>
              String(p.clientId) === selectedClientId ? { ...p, ...data } : p
            );
          }
          return [...prev, data];
        });
        toast.success("Portal settings saved");
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to save settings");
      }
    } catch {
      toast.error("Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  };

  const currentPortal = portals.find(
    (p) => String(p.clientId) === selectedClientId
  );
  const portalUrl = currentPortal?.portalUrl || "";

  const navActions = (
    <div className="flex items-center gap-2">
      {currentPortal && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => window.open(currentPortal.portalUrl, "_blank")}
        >
          <ExternalLink className="h-4 w-4 mr-2" />
          Preview Portal
        </Button>
      )}
      <Button
        size="sm"
        onClick={handleSave}
        disabled={isSaving || !selectedClientId}
      >
        {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
        Save Changes
      </Button>
    </div>
  );

  return (
    <>
      {navContainer && createPortal(navActions, navContainer)}
      <div className="overflow-y-auto h-full">
        {/* Client Selector */}
        <div>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <Label className="mb-2 block">Select Client</Label>
                <Select
                  value={selectedClientId}
                  onValueChange={handleClientChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a client to configure portal..." />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>
                        {c.name}
                        {portals.find((p) => p.clientId === c.id) && (
                          <Badge variant="outline" className="ml-2 text-xs">
                            Active
                          </Badge>
                        )}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {isLoading && (
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              )}
            </div>
          </CardContent>
        </div>

        {/* Overview */}
        <div>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="flex items-center">
                  <Globe className="h-5 w-5 mr-2 text-blue-600" />
                  Client Portal
                </CardTitle>
                <CardDescription className="mt-2">
                  White-labeled portal for your clients to track projects,
                  communicate, and access files
                </CardDescription>
              </div>
              <Switch
                checked={portalEnabled}
                onCheckedChange={setPortalEnabled}
              />
            </div>
          </CardHeader>
          {selectedClientId && portalEnabled && (
            <CardContent className="space-y-4">
              {currentPortal ? (
                <div className="bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm text-blue-900 dark:text-blue-200">
                      <strong>Portal URL:</strong>
                    </p>
                    <div className="flex items-center space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          navigator.clipboard.writeText(portalUrl);
                          toast.success("URL copied to clipboard");
                        }}
                      >
                        <Copy className="h-4 w-4 mr-2" />
                        Copy
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => window.open(portalUrl, "_blank")}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Preview
                      </Button>
                    </div>
                  </div>
                  <p className="text-sm text-blue-800 dark:text-blue-300 font-mono break-all">
                    {portalUrl}
                  </p>
                  {currentPortal.lastAccessedAt && (
                    <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">
                      Last accessed:{" "}
                      {new Date(currentPortal.lastAccessedAt).toLocaleString()}
                    </p>
                  )}
                </div>
              ) : (
                <div className="bg-muted/50 border border-border rounded-lg p-4 text-center">
                  <p className="text-sm text-muted-foreground">
                    Save settings to generate a portal URL for this client
                  </p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <p className="text-2xl text-foreground">
                    {portals.filter((p) => p.enabled).length}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">Active Portals</p>
                </div>
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <p className="text-2xl text-foreground">{portals.length}</p>
                  <p className="text-sm text-muted-foreground mt-1">Total Portals</p>
                </div>
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <p className="text-2xl text-foreground">
                    {portals.filter((p) => p.lastAccessedAt).length}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">Accessed</p>
                </div>
              </div>
            </CardContent>
          )}
        </div>

        {selectedClientId && portalEnabled && (
          <>
            {/* Branding */}
            <div>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Palette className="h-5 w-5 mr-2 text-purple-600" />
                  Portal Branding
                </CardTitle>
                <CardDescription>
                  Customize the look and feel of your client portal
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2 py-6">
                  <Label htmlFor="portal-title">Portal Title</Label>
                  <Input
                    id="portal-title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Acme Agency"
                  />
                  <p className="text-xs text-muted-foreground">
                    Displayed in the portal header
                  </p>
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label htmlFor="welcome">Welcome Message</Label>
                  <Textarea
                    id="welcome"
                    value={welcomeMessage}
                    onChange={(e) => setWelcomeMessage(e.target.value)}
                    rows={3}
                  />
                  <p className="text-xs text-muted-foreground">
                    This message appears when clients first access the portal
                  </p>
                </div>
              </CardContent>
            </div>

            {/* Chat Features */}
            <div>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1 py-6">
                    <Label>Enable Portal Chat</Label>
                    <p className="text-sm text-muted-foreground">
                      Allow clients to send messages directly through the portal
                    </p>
                  </div>
                  <Switch
                    checked={chatEnabled}
                    onCheckedChange={setChatEnabled}
                  />
                </div>

                {chatEnabled && (
                  <>
                    <Separator />

                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <Label className="flex items-center">
                          AI Chat Assistant
                          <Badge className="ml-2 bg-purple-100 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300">
                            <Sparkles className="h-3 w-3 mr-1" />
                            Coming soon
                          </Badge>
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          AI answers common questions automatically
                        </p>
                      </div>
                      <Switch
                        disabled={true}
                        checked={aiChatBot}
                        onCheckedChange={setAiChatBot}
                      />
                    </div>

                    {aiChatBot && (
                      <div className="bg-purple-50 dark:bg-purple-950/50 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
                        <h4 className="text-sm text-purple-900 dark:text-purple-200 mb-2">
                          AI Assistant Features:
                        </h4>
                        <ul className="space-y-1 text-sm text-purple-800 dark:text-purple-300">
                          <li className="flex items-start">
                            <Sparkles className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
                            <span>
                              Instant answers to FAQs about projects and
                              timelines
                            </span>
                          </li>
                          <li className="flex items-start">
                            <Sparkles className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
                            <span>
                              Automatic routing of complex questions to your
                              team
                            </span>
                          </li>
                          <li className="flex items-start">
                            <Sparkles className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
                            <span>24/7 availability for client inquiries</span>
                          </li>
                          <li className="flex items-start">
                            <Sparkles className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
                            <span>Learns from your past conversations</span>
                          </li>
                        </ul>
                      </div>
                    )}

                    <Separator />

                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <Label>File Sharing</Label>
                        <p className="text-sm text-muted-foreground">
                          Let clients upload and download files
                        </p>
                      </div>
                      <Switch
                        checked={fileSharing}
                        onCheckedChange={setFileSharing}
                      />
                    </div>
                  </>
                )}
              </CardContent>
            </div>

            {/* Notification Settings */}
            <div>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1 py-6">
                    <Label>Email Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Get notified when clients send messages
                    </p>
                  </div>
                  <Switch
                    checked={emailNotifications}
                    onCheckedChange={setEmailNotifications}
                  />
                </div>
              </CardContent>
            </div>
          </>
        )}
      </div>
    </>
  );
}
