import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Avatar, AvatarFallback } from "../ui/avatar";
import { Progress } from "../ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingDown,
  MessageSquare,
  Mail,
  Send,
  Activity,
} from "lucide-react";
import { motion } from "motion/react";

interface ClientHealth {
  id: string;
  client: string;
  initials: string;
  lastContact: string;
  daysSinceContact: number;
  healthScore: number;
  status: "healthy" | "at-risk" | "critical";
  responseRate: number;
  avgResponseTime: string;
  upcomingDeadlines: number;
  scheduledMeetings: number;
  recommendation: string;
}

const mockClientHealth: ClientHealth[] = [
  {
    id: "1",
    client: "Global Solutions",
    initials: "GS",
    lastContact: "Nov 3, 2025",
    daysSinceContact: 8,
    healthScore: 35,
    status: "critical",
    responseRate: 45,
    avgResponseTime: "4.2 days",
    upcomingDeadlines: 2,
    scheduledMeetings: 0,
    recommendation:
      "Schedule a check-in call immediately. Client hasn't responded in over a week and has pending deadlines.",
  },
  {
    id: "2",
    client: "Enterprise Ltd",
    initials: "EL",
    lastContact: "Nov 8, 2025",
    daysSinceContact: 3,
    healthScore: 65,
    status: "at-risk",
    responseRate: 70,
    avgResponseTime: "1.5 days",
    upcomingDeadlines: 1,
    scheduledMeetings: 0,
    recommendation:
      "Send a brief update on project progress. Consider scheduling a follow-up meeting.",
  },
  {
    id: "3",
    client: "Acme Corp",
    initials: "AC",
    lastContact: "Today",
    daysSinceContact: 0,
    healthScore: 95,
    status: "healthy",
    responseRate: 92,
    avgResponseTime: "4 hours",
    upcomingDeadlines: 3,
    scheduledMeetings: 2,
    recommendation: "Relationship is strong. Continue regular communication cadence.",
  },
  {
    id: "4",
    client: "TechStart Inc",
    initials: "TI",
    lastContact: "Yesterday",
    daysSinceContact: 1,
    healthScore: 88,
    status: "healthy",
    responseRate: 85,
    avgResponseTime: "8 hours",
    upcomingDeadlines: 2,
    scheduledMeetings: 1,
    recommendation: "Communication is on track. Keep up the good work!",
  },
  {
    id: "5",
    client: "DesignCo",
    initials: "DC",
    lastContact: "Today",
    daysSinceContact: 0,
    healthScore: 92,
    status: "healthy",
    responseRate: 95,
    avgResponseTime: "2 hours",
    upcomingDeadlines: 1,
    scheduledMeetings: 1,
    recommendation: "Excellent communication. Client is highly engaged.",
  },
];

export function CommsHealthDashboard() {
  const [clients] = useState<ClientHealth[]>(mockClientHealth);
  const [filterStatus, setFilterStatus] = useState<"all" | "healthy" | "at-risk" | "critical">("all");

  const filteredClients = clients.filter(
    (client) => filterStatus === "all" || client.status === filterStatus
  );

  const healthyCount = clients.filter((c) => c.status === "healthy").length;
  const atRiskCount = clients.filter((c) => c.status === "at-risk").length;
  const criticalCount = clients.filter((c) => c.status === "critical").length;
  const avgHealthScore =
    clients.reduce((sum, c) => sum + c.healthScore, 0) / clients.length;

  const getStatusColor = (status: ClientHealth["status"]) => {
    switch (status) {
      case "healthy":
        return "text-green-600 bg-green-100";
      case "at-risk":
        return "text-yellow-600 bg-yellow-100";
      case "critical":
        return "text-red-600 bg-red-100";
    }
  };

  const getStatusIcon = (status: ClientHealth["status"]) => {
    switch (status) {
      case "healthy":
        return <CheckCircle className="h-5 w-5" />;
      case "at-risk":
        return <Clock className="h-5 w-5" />;
      case "critical":
        return <AlertTriangle className="h-5 w-5" />;
    }
  };

  const getHealthColor = (score: number) => {
    if (score >= 80) return "bg-green-500";
    if (score >= 60) return "bg-yellow-500";
    return "bg-red-500";
  };

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Avg Health Score</p>
                <p className="text-2xl text-gray-900 mt-1">
                  {Math.round(avgHealthScore)}%
                </p>
              </div>
              <Activity className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Healthy</p>
                <p className="text-2xl text-gray-900 mt-1">{healthyCount}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">At Risk</p>
                <p className="text-2xl text-gray-900 mt-1">{atRiskCount}</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Critical</p>
                <p className="text-2xl text-gray-900 mt-1">{criticalCount}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <h3 className="text-sm text-gray-700">Filter by Status</h3>
            <Select
              value={filterStatus}
              onValueChange={(v: any) => setFilterStatus(v)}
            >
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Clients</SelectItem>
                <SelectItem value="healthy">Healthy</SelectItem>
                <SelectItem value="at-risk">At Risk</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Client Health Cards */}
      <div className="space-y-4">
        {filteredClients.map((client, index) => (
          <motion.div
            key={client.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4">
                    <Avatar className="h-12 w-12">
                      <AvatarFallback>{client.initials}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <CardTitle className="text-lg">{client.client}</CardTitle>
                        <Badge className={getStatusColor(client.status)}>
                          {getStatusIcon(client.status)}
                          <span className="ml-1 capitalize">{client.status}</span>
                        </Badge>
                      </div>
                      <div className="flex items-center space-x-4 text-sm text-gray-600">
                        <span>Last contact: {client.lastContact}</span>
                        <span>•</span>
                        <span
                          className={
                            client.daysSinceContact > 5
                              ? "text-red-600"
                              : client.daysSinceContact > 2
                              ? "text-yellow-600"
                              : ""
                          }
                        >
                          {client.daysSinceContact} days ago
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600 mb-1">Health Score</p>
                    <p className={`text-2xl ${
                      client.healthScore >= 80
                        ? "text-green-600"
                        : client.healthScore >= 60
                        ? "text-yellow-600"
                        : "text-red-600"
                    }`}>
                      {client.healthScore}%
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Health Score Bar */}
                <div>
                  <div className="flex items-center justify-between text-xs text-gray-600 mb-2">
                    <span>Communication Health</span>
                    <span>{client.healthScore}%</span>
                  </div>
                  <Progress
                    value={client.healthScore}
                    className="h-2"
                    indicatorClassName={getHealthColor(client.healthScore)}
                  />
                </div>

                {/* Metrics Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-600 mb-1">Response Rate</p>
                    <p className="text-sm text-gray-900">{client.responseRate}%</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-600 mb-1">Avg Response Time</p>
                    <p className="text-sm text-gray-900">{client.avgResponseTime}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-600 mb-1">Upcoming Deadlines</p>
                    <p className="text-sm text-gray-900">{client.upcomingDeadlines}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-600 mb-1">Scheduled Meetings</p>
                    <p className="text-sm text-gray-900">{client.scheduledMeetings}</p>
                  </div>
                </div>

                {/* AI Recommendation */}
                <div
                  className={`rounded-lg p-4 ${
                    client.status === "critical"
                      ? "bg-red-50 border border-red-200"
                      : client.status === "at-risk"
                      ? "bg-yellow-50 border border-yellow-200"
                      : "bg-green-50 border border-green-200"
                  }`}
                >
                  <div className="flex items-start space-x-2">
                    <TrendingDown
                      className={`h-5 w-5 mt-0.5 ${
                        client.status === "critical"
                          ? "text-red-600"
                          : client.status === "at-risk"
                          ? "text-yellow-600"
                          : "text-green-600"
                      }`}
                    />
                    <div className="flex-1">
                      <p
                        className={`text-sm ${
                          client.status === "critical"
                            ? "text-red-900"
                            : client.status === "at-risk"
                            ? "text-yellow-900"
                            : "text-green-900"
                        }`}
                      >
                        <strong>AI Recommendation:</strong> {client.recommendation}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center space-x-2 pt-3 border-t border-gray-200">
                  <Button size="sm" variant="outline">
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Send Message
                  </Button>
                  <Button size="sm" variant="outline">
                    <Mail className="h-4 w-4 mr-2" />
                    Send Email
                  </Button>
                  {client.status !== "healthy" && (
                    <Button size="sm" className="ml-auto">
                      <Send className="h-4 w-4 mr-2" />
                      Send Check-in
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {filteredClients.length === 0 && (
        <Card>
          <CardContent className="py-24 text-center">
            <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No clients found</p>
            <p className="text-sm text-gray-500 mt-1">
              Try adjusting your filters
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
