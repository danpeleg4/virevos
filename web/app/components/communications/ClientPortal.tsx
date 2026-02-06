import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Switch } from "../ui/switch";
import { Textarea } from "../ui/textarea";
import { Badge } from "../ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
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
} from "lucide-react";
import { Separator } from "../ui/separator";
import Link from "next/link";

export function ClientPortal() {
  const [portalEnabled, setPortalEnabled] = useState(true);
  const [chatEnabled, setChatEnabled] = useState(true);
  const [fileSharing, setFileSharing] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [aiChatBot, setAiChatBot] = useState(true);
  const [customDomain, setCustomDomain] = useState("");
  const [brandColor, setBrandColor] = useState("#3B82F6");
  const [welcomeMessage, setWelcomeMessage] = useState(
    "Welcome to our client portal! We're here to help you track your project progress and stay in touch."
  );

  const portalUrl = customDomain || "portal.virevos.com/acme-corp";

  return (
    <div className="space-y-6">
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
                White-labeled portal for your clients to track projects, communicate, and
                access files
              </CardDescription>
            </div>
            <Switch checked={portalEnabled} onCheckedChange={setPortalEnabled} />
          </div>
        </CardHeader>
        {portalEnabled && (
          <CardContent className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-blue-900">
                  <strong>Your Portal URL:</strong>
                </p>
                <div className="flex items-center space-x-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => navigator.clipboard.writeText(`https://${portalUrl}`)}
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copy
                  </Button>
                  <Button size="sm" variant="outline">
                    <Eye className="h-4 w-4 mr-2" />
                      <Link href="/workspace/portal">
                          Preview
                      </Link>
                  </Button>
                </div>
              </div>
              <p className="text-sm text-blue-800 font-mono break-all">
                https://{portalUrl}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-2xl text-gray-900">12</p>
                <p className="text-sm text-gray-600 mt-1">Active Clients</p>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-2xl text-gray-900">43</p>
                <p className="text-sm text-gray-600 mt-1">Messages This Week</p>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-2xl text-gray-900">8.2k</p>
                <p className="text-sm text-gray-600 mt-1">Total Views</p>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {portalEnabled && (
        <Tabs defaultValue="branding">
          <TabsList>
            <TabsTrigger value="branding">Branding</TabsTrigger>
            <TabsTrigger value="chat">Chat Features</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
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
                  <Label htmlFor="custom-domain">Custom Domain (Optional)</Label>
                  <Input
                    id="custom-domain"
                    placeholder="portal.yourcompany.com"
                    value={customDomain}
                    onChange={(e) => setCustomDomain(e.target.value)}
                  />
                  <p className="text-xs text-gray-500">
                    Use your own domain for a fully white-labeled experience
                  </p>
                </div>

                <Separator />

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
                    This message appears when clients first log in
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
                  <Switch checked={chatEnabled} onCheckedChange={setChatEnabled} />
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
                      <Switch checked={aiChatBot} onCheckedChange={setAiChatBot} />
                    </div>

                    {aiChatBot && (
                      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                        <h4 className="text-sm text-purple-900 mb-2">
                          AI Assistant Features:
                        </h4>
                        <ul className="space-y-1 text-sm text-purple-800">
                          <li className="flex items-start">
                            <Sparkles className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
                            <span>Instant answers to FAQs about projects and timelines</span>
                          </li>
                          <li className="flex items-start">
                            <Sparkles className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
                            <span>Automatic routing of complex questions to your team</span>
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
                      <Switch checked={fileSharing} onCheckedChange={setFileSharing} />
                    </div>

                    <Separator />

                    <div className="space-y-2">
                      <Label>Auto-Reply Message (Optional)</Label>
                      <Textarea
                        placeholder="Thanks for your message! We'll get back to you within 2 hours."
                        rows={2}
                      />
                      <p className="text-xs text-gray-500">
                        Sent automatically when clients send a message outside business hours
                      </p>
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

                {emailNotifications && (
                  <>
                    <Separator />
                    <div className="space-y-2">
                      <Label>Notification Email</Label>
                      <Input
                        type="email"
                        defaultValue="notifications@yourcompany.com"
                        placeholder="your@email.com"
                      />
                    </div>
                  </>
                )}
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
                      <span className="text-sm text-gray-700">Require email verification</span>
                      <Switch defaultChecked />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-700">Two-factor authentication</span>
                      <Switch />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-700">Session timeout (hours)</span>
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
                      <span className="text-sm text-gray-700">End-to-end encryption</span>
                      <Badge className="bg-green-100 text-green-700">Enabled</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-700">Data retention (days)</span>
                      <Input type="number" defaultValue="365" className="w-20" />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-700">IP whitelist</span>
                      <Switch />
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label>Features</Label>
                  <div className="border border-gray-200 rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-700">Project timeline view</span>
                      <Switch defaultChecked />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-700">Invoice access</span>
                      <Switch defaultChecked />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-700">Document library</span>
                      <Switch defaultChecked />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-700">Feedback forms</span>
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
        <Button variant="outline">
          <ExternalLink className="h-4 w-4 mr-2" />
          Preview Portal
        </Button>
        <Button>Save Changes</Button>
      </div>
    </div>
  );
}
