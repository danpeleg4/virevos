"use client";

import { useState, useEffect } from "react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
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
  Shield,
  ExternalLink,
  Copy,
  Eye,
  Settings,
  Sparkles,
  Loader2,
} from "lucide-react";
import { Separator } from "../ui/separator";
import { toast } from "sonner";
import type { PortalRecord } from "@/types/portal";
import type { ClientSummary } from "@/types/clients";

export function ClientPortal() {
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
  const [brandColor, setBrandColor] = useState("#3B82F6");
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

  // When client selection changes, load their portal settings
  const handleClientChange = (clientId: string) => {
    setSelectedClientId(clientId);
    const portal = portals.find((p) => String(p.clientId) === clientId);
    if (portal) {
      setPortalEnabled(portal.enabled);
      setBrandColor(portal.settings?.brandColor || "#3B82F6");
      setWelcomeMessage(
        portal.settings?.welcomeMessage ||
          "Welcome to our client portal! We're here to help you track your project progress and stay in touch."
      );
      setChatEnabled(portal.settings?.chatEnabled ?? true);
      setFileSharing(portal.settings?.fileSharing ?? true);
      setAiChatBot(portal.settings?.aiChatBot ?? true);
      setEmailNotifications(portal.settings?.emailNotifications ?? true);
    } else {
      // Reset to defaults for new portal
      setPortalEnabled(true);
      setBrandColor("#3B82F6");
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
            brandColor,
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

  return (
    <div className="space-y-6 overflow-y-auto h-full">
      {/* Client Selector */}
      <Card>
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
              <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
            )}
          </div>
        </CardContent>
      </Card>

      {/* Overview */}
      <Card>
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
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-blue-900">
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
                <p className="text-sm text-blue-800 font-mono break-all">
                  {portalUrl}
                </p>
                {currentPortal.lastAccessedAt && (
                  <p className="text-xs text-blue-600 mt-2">
                    Last accessed:{" "}
                    {new Date(currentPortal.lastAccessedAt).toLocaleString()}
                  </p>
                )}
              </div>
            ) : (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
                <p className="text-sm text-gray-600">
                  Save settings to generate a portal URL for this client
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-2xl text-gray-900">
                  {portals.filter((p) => p.enabled).length}
                </p>
                <p className="text-sm text-gray-600 mt-1">Active Portals</p>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-2xl text-gray-900">{portals.length}</p>
                <p className="text-sm text-gray-600 mt-1">Total Portals</p>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-2xl text-gray-900">
                  {portals.filter((p) => p.lastAccessedAt).length}
                </p>
                <p className="text-sm text-gray-600 mt-1">Accessed</p>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {selectedClientId && portalEnabled && (
        <Tabs defaultValue="branding">
          <TabsList>
            <TabsTrigger className="cursor-pointer" value="branding">
              Branding
            </TabsTrigger>
            <TabsTrigger className="cursor-pointer" value="chat">
              Chat Features
            </TabsTrigger>
            <TabsTrigger className="cursor-pointer" value="settings">
              Settings
            </TabsTrigger>
          </TabsList>

          {/* Branding Tab */}
          <TabsContent value="branding" className="space-y-6">
            <Card>
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
                <div className="space-y-2">
                  <Label htmlFor="brand-color">Primary Brand Color</Label>
                  <div className="flex items-center space-x-3">
                    <Input
                      id="brand-color"
                      type="color"
                      value={brandColor}
                      onChange={(e) => setBrandColor(e.target.value)}
                      className="w-20 h-10"
                    />
                    <Input
                      value={brandColor}
                      onChange={(e) => setBrandColor(e.target.value)}
                      placeholder="#3B82F6"
                      className="flex-1"
                    />
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label htmlFor="logo">Company Logo</Label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                    <Globe className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-sm text-gray-600 mb-2">
                      Upload your company logo
                    </p>
                    <Button size="sm" variant="outline">
                      Choose File
                    </Button>
                    <p className="text-xs text-gray-500 mt-2">
                      Recommended: 200x60px, PNG or SVG
                    </p>
                  </div>
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
                  <p className="text-xs text-gray-500">
                    This message appears when clients first access the portal
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Chat Features Tab */}
          <TabsContent value="chat" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <MessageSquare className="h-5 w-5 mr-2 text-green-600" />
                  Chat & Messaging
                </CardTitle>
                <CardDescription>
                  Configure how clients can communicate through the portal
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label>Enable Portal Chat</Label>
                    <p className="text-sm text-gray-600">
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
                          <Badge className="ml-2 bg-purple-100 text-purple-700">
                            <Sparkles className="h-3 w-3 mr-1" />
                            Beta
                          </Badge>
                        </Label>
                        <p className="text-sm text-gray-600">
                          AI answers common questions automatically
                        </p>
                      </div>
                      <Switch
                        checked={aiChatBot}
                        onCheckedChange={setAiChatBot}
                      />
                    </div>

                    {aiChatBot && (
                      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                        <h4 className="text-sm text-purple-900 mb-2">
                          AI Assistant Features:
                        </h4>
                        <ul className="space-y-1 text-sm text-purple-800">
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
                        <p className="text-sm text-gray-600">
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
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Bell className="h-5 w-5 mr-2 text-orange-600" />
                  Notification Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label>Email Notifications</Label>
                    <p className="text-sm text-gray-600">
                      Get notified when clients send messages
                    </p>
                  </div>
                  <Switch
                    checked={emailNotifications}
                    onCheckedChange={setEmailNotifications}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Settings className="h-5 w-5 mr-2 text-gray-600" />
                  Portal Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label>Access Control</Label>
                  <div className="border border-gray-200 rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-700">
                        Require email verification
                      </span>
                      <Switch defaultChecked />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-700">
                        Two-factor authentication
                      </span>
                      <Switch />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-700">
                        Session timeout (hours)
                      </span>
                      <Input type="number" defaultValue="24" className="w-20" />
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label className="flex items-center">
                    <Shield className="h-4 w-4 mr-2" />
                    Privacy & Security
                  </Label>
                  <div className="border border-gray-200 rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-700">
                        End-to-end encryption
                      </span>
                      <Badge className="bg-green-100 text-green-700">
                        Enabled
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-700">
                        Data retention (days)
                      </span>
                      <Input
                        type="number"
                        defaultValue="365"
                        className="w-20"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-700">
                        IP whitelist
                      </span>
                      <Switch />
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label>Features</Label>
                  <div className="border border-gray-200 rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-700">
                        Project timeline view
                      </span>
                      <Switch defaultChecked />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-700">
                        Invoice access
                      </span>
                      <Switch defaultChecked />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-700">
                        Document library
                      </span>
                      <Switch defaultChecked />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-700">
                        Feedback forms
                      </span>
                      <Switch />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {/* Actions */}
      <div className="flex justify-end space-x-2">
        {currentPortal && (
          <Button
            variant="outline"
            onClick={() => window.open(currentPortal.portalUrl, "_blank")}
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Preview Portal
          </Button>
        )}
        <Button onClick={handleSave} disabled={isSaving || !selectedClientId}>
          {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
          Save Changes
        </Button>
      </div>
    </div>
  );
}
