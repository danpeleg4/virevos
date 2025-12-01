import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Progress } from "../components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Avatar, AvatarFallback } from "../components/ui/avatar";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import {
  Calendar,
  CheckCircle,
  Clock,
  FileText,
  MessageSquare,
  Download,
  Send,
  Paperclip,
  Bell,
  LogOut,
  User,
} from "lucide-react";
import { motion } from "motion/react";

export function ClientPortal() {
  const [activeTab, setActiveTab] = useState("overview");
  const [newMessage, setNewMessage] = useState("");

  // Mock data
  const client = {
    name: "Sarah Johnson",
    company: "Acme Corp",
    initials: "SJ",
  };

  const activeProjects = [
    {
      id: 1,
      name: "Website Redesign",
      progress: 75,
      status: "On Track",
      dueDate: "Nov 15, 2025",
      nextMilestone: "Design approval",
    },
    {
      id: 2,
      name: "Mobile App Development",
      progress: 45,
      status: "In Progress",
      dueDate: "Dec 1, 2025",
      nextMilestone: "Beta testing",
    },
  ];

  const recentFiles = [
    {
      id: 1,
      name: "Design_Mockups_Final.fig",
      size: "12.4 MB",
      uploadedAt: "Nov 8, 2025",
    },
    {
      id: 2,
      name: "Project_Proposal_v2.pdf",
      size: "2.1 MB",
      uploadedAt: "Nov 5, 2025",
    },
    {
      id: 3,
      name: "Brand_Guidelines.pdf",
      size: "5.8 MB",
      uploadedAt: "Nov 3, 2025",
    },
  ];

  const messages = [
    {
      id: 1,
      from: "Project Team",
      message: "The latest designs are ready for your review. Please check the files section.",
      timestamp: "2 hours ago",
      unread: true,
    },
    {
      id: 2,
      from: "John Doe",
      message: "Great feedback on the mockups! We'll implement those changes by tomorrow.",
      timestamp: "Yesterday",
      unread: false,
    },
    {
      id: 3,
      from: "Project Team",
      message: "Your project milestone has been completed ahead of schedule!",
      timestamp: "2 days ago",
      unread: false,
    },
  ];

  const upcomingMeetings = [
    {
      id: 1,
      title: "Design Review Meeting",
      date: "Tomorrow, 2:00 PM",
      duration: "30 min",
    },
    {
      id: 2,
      title: "Weekly Project Sync",
      date: "Friday, 10:00 AM",
      duration: "1 hour",
    },
  ];

  const invoices = [
    {
      id: 1,
      number: "#INV-1234",
      amount: "$5,000",
      status: "Paid",
      dueDate: "Nov 1, 2025",
    },
    {
      id: 2,
      number: "#INV-1235",
      amount: "$7,500",
      status: "Pending",
      dueDate: "Nov 15, 2025",
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <div className="h-8 w-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white">F</span>
              </div>
              <span className="text-xl text-gray-900">FlowTask</span>
            </div>

            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="icon">
                <Bell className="h-5 w-5" />
              </Button>
              <div className="flex items-center space-x-3">
                <Avatar>
                  <AvatarFallback>{client.initials}</AvatarFallback>
                </Avatar>
                <div className="hidden md:block">
                  <p className="text-sm text-gray-900">{client.name}</p>
                  <p className="text-xs text-gray-500">{client.company}</p>
                </div>
              </div>
              <Button variant="ghost" size="icon">
                <LogOut className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl text-gray-900 mb-2">
            Welcome back, {client.name.split(" ")[0]}!
          </h1>
          <p className="text-gray-600">
            Here&#39;s what&#39;s happening with your projects
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Active Projects</p>
                  <p className="text-2xl text-gray-900 mt-1">
                    {activeProjects.length}
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
                  <p className="text-2xl text-gray-900 mt-1">
                    {messages.filter((m) => m.unread).length}
                  </p>
                </div>
                <MessageSquare className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Upcoming Meetings</p>
                  <p className="text-2xl text-gray-900 mt-1">
                    {upcomingMeetings.length}
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
                  <p className="text-2xl text-gray-900 mt-1">{recentFiles.length}</p>
                </div>
                <Paperclip className="h-8 w-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="projects">Projects</TabsTrigger>
            <TabsTrigger value="messages">Messages</TabsTrigger>
            <TabsTrigger value="files">Files</TabsTrigger>
            <TabsTrigger value="invoices">Invoices</TabsTrigger>
          </TabsList>

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
                    {activeProjects.map((project, index) => (
                      <motion.div
                        key={project.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="p-4 border border-gray-200 rounded-lg"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h3 className="text-lg text-gray-900">{project.name}</h3>
                            <p className="text-sm text-gray-600 mt-1">
                              Due: {project.dueDate}
                            </p>
                          </div>
                          <Badge className="bg-green-100 text-green-700">
                            {project.status}
                          </Badge>
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-600">Progress</span>
                            <span className="text-gray-900">{project.progress}%</span>
                          </div>
                          <Progress value={project.progress} />
                        </div>
                        <div className="mt-3 pt-3 border-t border-gray-200">
                          <p className="text-sm text-gray-600">
                            Next: {project.nextMilestone}
                          </p>
                        </div>
                      </motion.div>
                    ))}
                  </CardContent>
                </Card>

                {/* Recent Messages */}
                <Card>
                  <CardHeader>
                    <CardTitle>Recent Messages</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {messages.slice(0, 3).map((msg) => (
                        <div
                          key={msg.id}
                          className={`p-3 rounded-lg ${
                            msg.unread
                              ? "bg-blue-50 border border-blue-200"
                              : "bg-gray-50"
                          }`}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <p className="text-sm text-gray-900">{msg.from}</p>
                            <span className="text-xs text-gray-500">
                              {msg.timestamp}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600">{msg.message}</p>
                        </div>
                      ))}
                    </div>
                    <Button variant="outline" className="w-full mt-4">
                      View All Messages
                    </Button>
                  </CardContent>
                </Card>
              </div>

              {/* Sidebar */}
              <div className="space-y-6">
                {/* Upcoming Meetings */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center text-base">
                      <Calendar className="h-5 w-5 mr-2 text-purple-600" />
                      Upcoming Meetings
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {upcomingMeetings.map((meeting) => (
                      <div
                        key={meeting.id}
                        className="p-3 border border-gray-200 rounded-lg"
                      >
                        <h4 className="text-sm text-gray-900 mb-1">
                          {meeting.title}
                        </h4>
                        <div className="flex items-center text-xs text-gray-600">
                          <Clock className="h-3 w-3 mr-1" />
                          {meeting.date}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          {meeting.duration}
                        </p>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {/* Quick Actions */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Quick Actions</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <Button variant="outline" className="w-full justify-start">
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Send Message
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      <Paperclip className="h-4 w-4 mr-2" />
                      Upload File
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      <Calendar className="h-4 w-4 mr-2" />
                      Schedule Meeting
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Projects Tab */}
          <TabsContent value="projects">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {activeProjects.map((project) => (
                <Card key={project.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <CardTitle>{project.name}</CardTitle>
                      <Badge className="bg-green-100 text-green-700">
                        {project.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-600">Progress</span>
                        <span className="text-sm text-gray-900">
                          {project.progress}%
                        </span>
                      </div>
                      <Progress value={project.progress} />
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Due Date</span>
                      <span className="text-gray-900">{project.dueDate}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Next Milestone</span>
                      <span className="text-gray-900">{project.nextMilestone}</span>
                    </div>
                    <Button className="w-full mt-4">View Details</Button>
                  </CardContent>
                </Card>
              ))}
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
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`p-4 rounded-lg ${
                        msg.unread
                          ? "bg-blue-50 border border-blue-200"
                          : "bg-gray-50"
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback>
                              {msg.from.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <p className="text-sm text-gray-900">{msg.from}</p>
                        </div>
                        <span className="text-xs text-gray-500">
                          {msg.timestamp}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 ml-10">{msg.message}</p>
                    </div>
                  ))}
                </div>

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
                    <Button variant="outline" size="sm">
                      <Paperclip className="h-4 w-4 mr-2" />
                      Attach
                    </Button>
                    <Button size="sm">
                      <Send className="h-4 w-4 mr-2" />
                      Send
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Files Tab */}
          <TabsContent value="files">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Shared Files</CardTitle>
                  <Button>
                    <Paperclip className="h-4 w-4 mr-2" />
                    Upload File
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {recentFiles.map((file) => (
                    <div
                      key={file.id}
                      className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                    >
                      <div className="flex items-center space-x-3">
                        <FileText className="h-10 w-10 text-blue-500" />
                        <div>
                          <p className="text-sm text-gray-900">{file.name}</p>
                          <p className="text-xs text-gray-500">
                            {file.size} • {file.uploadedAt}
                          </p>
                        </div>
                      </div>
                      <Button variant="outline" size="icon">
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Invoices Tab */}
          <TabsContent value="invoices">
            <Card>
              <CardHeader>
                <CardTitle>Invoices</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {invoices.map((invoice) => (
                    <div
                      key={invoice.id}
                      className="flex items-center justify-between p-4 border border-gray-200 rounded-lg"
                    >
                      <div className="flex items-center space-x-4">
                        <div className="p-3 bg-blue-100 rounded-lg">
                          <FileText className="h-6 w-6 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-sm text-gray-900">{invoice.number}</p>
                          <p className="text-xs text-gray-500">
                            Due: {invoice.dueDate}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        <div className="text-right">
                          <p className="text-lg text-gray-900">{invoice.amount}</p>
                          <Badge
                            className={
                              invoice.status === "Paid"
                                ? "bg-green-100 text-green-700"
                                : "bg-yellow-100 text-yellow-700"
                            }
                          >
                            {invoice.status}
                          </Badge>
                        </div>
                        <Button variant="outline" size="sm">
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
