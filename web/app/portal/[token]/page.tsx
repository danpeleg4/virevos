"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../../components/ui/tabs";
import { Avatar, AvatarFallback } from "../../components/ui/avatar";
import { Textarea } from "../../components/ui/textarea";
import {
  Calendar,
  FileText,
  MessageSquare,
  Download,
  Send,
  Paperclip,
  Bell,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { motion } from "motion/react";
import { toast } from "sonner";
import type { PortalData } from "@/types/portal";

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getStatusColor(status: string): string {
  switch (status.toLowerCase()) {
    case "completed":
      return "bg-green-100 text-green-700";
    case "in-progress":
      return "bg-blue-100 text-blue-700";
    case "on-hold":
      return "bg-yellow-100 text-yellow-700";
    default:
      return "bg-gray-100 text-gray-700";
  }
}

export default function PortalPage() {
  const params = useParams();
  const token = params.token as string;

  const [data, setData] = useState<PortalData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [newMessage, setNewMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [localMessages, setLocalMessages] = useState<PortalData["messages"]>(
    []
  );

  useEffect(() => {
    if (token) fetchPortalData();
  }, [token]);

  const fetchPortalData = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/portal/${token}`);
      if (res.status === 404) {
        setNotFound(true);
        return;
      }
      if (res.ok) {
        const portalData = await res.json();
        setData(portalData);
        setLocalMessages(portalData.messages || []);
      } else {
        setNotFound(true);
      }
    } catch (err) {
      console.error("Failed to fetch portal data:", err);
      setNotFound(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;
    setIsSending(true);
    try {
      const res = await fetch(`/api/portal/${token}/message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: newMessage }),
      });
      if (res.ok) {
        const sentMsg = {
          id: Date.now(),
          subject: null,
          preview: newMessage,
          from: data?.client.name || "You",
          isSent: false,
          sentAt: new Date().toISOString(),
          isRead: true,
        };
        setLocalMessages((prev) => [sentMsg, ...prev]);
        setNewMessage("");
        toast.success("Message sent successfully");
      } else {
        toast.error("Failed to send message");
      }
    } catch {
      toast.error("Failed to send message");
    } finally {
      setIsSending(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (notFound || !data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="py-12 text-center">
            <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Portal Not Found
            </h2>
            <p className="text-gray-600">
              This client portal is not available or has been disabled.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const logoUrl = data.settings?.logoUrl;
  const portalTitle = data.settings?.title || "Virevos";
  const unreadCount = localMessages.filter((m) => !m.isRead).length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header
        className="border-b border-gray-200 sticky top-0 z-50"
        style={{ backgroundColor: "white" }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt={portalTitle}
                  className="h-8 max-w-[160px] object-contain"
                />
              ) : (
                <div className="h-8 w-8 rounded-lg flex items-center justify-center bg-blue-500">
                  <span className="text-white text-sm font-bold">V</span>
                </div>
              )}
              <span className="text-xl text-gray-900">{portalTitle}</span>
            </div>

            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="icon">
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </Button>
              <div className="flex items-center space-x-3">
                <Avatar>
                  <AvatarFallback>
                    {data.client.name
                      .split(" ")
                      .slice(0, 2)
                      .map((w) => w[0])
                      .join("")
                      .toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden md:block">
                  <p className="text-sm text-gray-900">{data.client.name}</p>
                  {data.client.email && (
                    <p className="text-xs text-gray-500">{data.client.email}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl text-gray-900 mb-2">
            Welcome back, {data.client.name.split(" ")[0]}!
          </h1>
          <p className="text-gray-600">
            {data.settings?.welcomeMessage ||
              "Here's what's happening with your projects"}
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Active Projects</p>
                  <p className="text-2xl text-gray-900 mt-1">
                    {data.projects.length}
                  </p>
                </div>
                <FileText className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Unread Messages</p>
                  <p className="text-2xl text-gray-900 mt-1">{unreadCount}</p>
                </div>
                <MessageSquare className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Messages</p>
                  <p className="text-2xl text-gray-900 mt-1">
                    {localMessages.length}
                  </p>
                </div>
                <Calendar className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Files Shared</p>
                  <p className="text-2xl text-gray-900 mt-1">
                    {data.files.length}
                  </p>
                </div>
                <Paperclip className="h-8 w-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="overflow-x-auto pb-1 mb-6">
            <TabsList className="min-w-max">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="projects">Projects</TabsTrigger>
              <TabsTrigger value="messages">Messages</TabsTrigger>
              <TabsTrigger value="files">Files</TabsTrigger>
            </TabsList>
          </div>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Active Projects */}
              <div className="lg:col-span-2 space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Active Projects</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {data.projects.length === 0 ? (
                      <p className="text-sm text-gray-500 text-center py-4">
                        No projects yet
                      </p>
                    ) : (
                      data.projects.map((project, index) => (
                        <motion.div
                          key={project.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.1 }}
                          className="p-4 border border-gray-200 rounded-lg"
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <h3 className="text-lg text-gray-900">
                                {project.name}
                              </h3>
                              {project.dueDate && (
                                <p className="text-sm text-gray-600 mt-1">
                                  Due:{" "}
                                  {new Date(
                                    project.dueDate
                                  ).toLocaleDateString()}
                                </p>
                              )}
                            </div>
                            <Badge className={getStatusColor(project.status)}>
                              {project.status}
                            </Badge>
                          </div>
                          {project.description && (
                            <p className="text-sm text-gray-600 mb-3">
                              {project.description}
                            </p>
                          )}
                          <div className="mt-2 pt-2 border-t border-gray-100">
                            <p className="text-xs text-gray-500">
                              Health: {project.health} · Priority:{" "}
                              {project.priority}
                            </p>
                          </div>
                        </motion.div>
                      ))
                    )}
                  </CardContent>
                </Card>

                {/* Recent Messages */}
                <Card>
                  <CardHeader>
                    <CardTitle>Recent Messages</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {localMessages.slice(0, 3).map((msg) => (
                        <div
                          key={msg.id}
                          className={`p-3 rounded-lg ${
                            !msg.isRead
                              ? "bg-blue-50 border border-blue-200"
                              : "bg-gray-50"
                          }`}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <p className="text-sm text-gray-900">{msg.from}</p>
                            <span className="text-xs text-gray-500">
                              {new Date(msg.sentAt).toLocaleDateString()}
                            </span>
                          </div>
                          {msg.subject && (
                            <p className="text-xs text-gray-600 font-medium mb-1">
                              {msg.subject}
                            </p>
                          )}
                          <p className="text-sm text-gray-600 line-clamp-2">
                            {msg.preview}
                          </p>
                        </div>
                      ))}
                    </div>
                    <Button
                      variant="outline"
                      className="w-full mt-4"
                      onClick={() => setActiveTab("messages")}
                    >
                      View All Messages
                    </Button>
                  </CardContent>
                </Card>
              </div>

              {/* Sidebar */}
              <div className="space-y-6">
                {/* Quick Actions */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Quick Actions</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {(data.settings?.chatEnabled ?? true) && (
                      <Button
                        variant="outline"
                        className="w-full justify-start"
                        onClick={() => setActiveTab("messages")}
                      >
                        <MessageSquare className="h-4 w-4 mr-2" />
                        Send Message
                      </Button>
                    )}
                    {(data.settings?.fileSharing ?? true) && (
                      <Button
                        variant="outline"
                        className="w-full justify-start"
                        onClick={() => setActiveTab("files")}
                      >
                        <Paperclip className="h-4 w-4 mr-2" />
                        View Files
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      className="w-full justify-start"
                      onClick={() => setActiveTab("projects")}
                    >
                      <Calendar className="h-4 w-4 mr-2" />
                      View Projects
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Projects Tab */}
          <TabsContent value="projects">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {data.projects.length === 0 ? (
                <Card className="col-span-2">
                  <CardContent className="py-12 text-center">
                    <FileText className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-gray-500">No projects yet</p>
                  </CardContent>
                </Card>
              ) : (
                data.projects.map((project) => (
                  <Card key={project.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <CardTitle>{project.name}</CardTitle>
                        <Badge className={getStatusColor(project.status)}>
                          {project.status}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {project.description && (
                        <p className="text-sm text-gray-600">
                          {project.description}
                        </p>
                      )}
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Due Date</span>
                        <span className="text-gray-900">
                          {project.dueDate
                            ? new Date(project.dueDate).toLocaleDateString()
                            : "—"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Health</span>
                        <span className="text-gray-900">{project.health}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Priority</span>
                        <span className="text-gray-900">
                          {project.priority}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          {/* Messages Tab */}
          <TabsContent value="messages">
            <Card>
              <CardHeader>
                <CardTitle>Messages</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {localMessages.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <MessageSquare className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                      <p className="text-sm">No messages yet</p>
                    </div>
                  ) : (
                    localMessages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`p-4 rounded-lg ${
                          !msg.isRead
                            ? "bg-blue-50 border border-blue-200"
                            : "bg-gray-50"
                        }`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback>
                                {msg.from.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <p className="text-sm text-gray-900">{msg.from}</p>
                          </div>
                          <span className="text-xs text-gray-500">
                            {new Date(msg.sentAt).toLocaleString()}
                          </span>
                        </div>
                        {msg.subject && (
                          <p className="text-sm font-medium text-gray-700 ml-10 mb-1">
                            {msg.subject}
                          </p>
                        )}
                        <p className="text-sm text-gray-700 ml-10">
                          {msg.preview}
                        </p>
                      </div>
                    ))
                  )}
                </div>

                {(data.settings?.chatEnabled ?? true) && (
                  <div className="border-t border-gray-200 pt-4">
                    <div className="flex space-x-2">
                      <Textarea
                        placeholder="Type your message..."
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        rows={3}
                        className="flex-1"
                      />
                    </div>
                    <div className="flex justify-end space-x-2 mt-2">
                      <Button
                        size="sm"
                        onClick={handleSendMessage}
                        disabled={isSending || !newMessage.trim()}
                      >
                        {isSending ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Send className="h-4 w-4 mr-2" />
                        )}
                        Send
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Files Tab */}
          <TabsContent value="files">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Shared Files</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                {data.files.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <Paperclip className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                    <p className="text-sm">No files shared yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {data.files.map((file) => (
                      <div
                        key={file.id}
                        className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                      >
                        <div className="flex items-center space-x-3">
                          <FileText className="h-10 w-10 text-blue-500" />
                          <div>
                            <p className="text-sm text-gray-900">{file.name}</p>
                            <p className="text-xs text-gray-500">
                              {formatFileSize(file.size)}
                              {file.createdAt
                                ? ` · ${new Date(file.createdAt).toLocaleDateString()}`
                                : ""}
                            </p>
                          </div>
                        </div>
                        <Button variant="outline" size="icon" asChild>
                          <a
                            href={`/api/files/download?path=${encodeURIComponent(file.path)}`}
                            download={file.name}
                          >
                            <Download className="h-4 w-4" />
                          </a>
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
