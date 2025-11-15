import { useState } from "react";
import { Card } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Input } from "../../components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import {
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
  Search,
  Filter,
  ChevronRight,
} from "lucide-react";

const logs = [
  {
    id: 1,
    automation: "Invoice Reminder - DesignCo",
    status: "success",
    timestamp: "2025-11-10 14:30:22",
    duration: "1.2s",
    trigger: "Invoice overdue (3 days)",
    actions: [
      { name: "Send reminder email", status: "success", timestamp: "14:30:22" },
      { name: "Update invoice status", status: "success", timestamp: "14:30:23" },
      { name: "Log activity", status: "success", timestamp: "14:30:23" },
    ],
    retries: 0,
  },
  {
    id: 2,
    automation: "Client Onboarding - NewClient Corp",
    status: "success",
    timestamp: "2025-11-10 09:15:44",
    duration: "2.8s",
    trigger: "New client added",
    actions: [
      { name: "Send welcome email", status: "success", timestamp: "09:15:45" },
      { name: "Create onboarding tasks", status: "success", timestamp: "09:15:46" },
      { name: "Schedule kickoff meeting", status: "success", timestamp: "09:15:47" },
      { name: "Assign account manager", status: "success", timestamp: "09:15:47" },
    ],
    retries: 0,
  },
  {
    id: 3,
    automation: "Project Closure - OldProject Ltd",
    status: "success",
    timestamp: "2025-11-09 16:45:12",
    duration: "3.1s",
    trigger: "Manual trigger",
    actions: [
      { name: "Generate final invoice", status: "success", timestamp: "16:45:13" },
      { name: "Send feedback request", status: "success", timestamp: "16:45:14" },
      { name: "Archive project files", status: "success", timestamp: "16:45:15" },
      { name: "Create project report", status: "success", timestamp: "16:45:15" },
    ],
    retries: 0,
  },
  {
    id: 4,
    automation: "Invoice Reminder - TechCorp",
    status: "failed",
    timestamp: "2025-11-08 10:20:33",
    duration: "5.2s",
    trigger: "Invoice overdue (7 days)",
    actions: [
      { name: "Send reminder email", status: "failed", timestamp: "10:20:34", error: "SMTP connection timeout" },
      { name: "Update invoice status", status: "skipped", timestamp: "-" },
      { name: "Log activity", status: "success", timestamp: "10:20:38" },
    ],
    retries: 2,
    nextRetry: "2025-11-10 16:00:00",
  },
  {
    id: 5,
    automation: "Invoice Reminder - TechCorp",
    status: "retrying",
    timestamp: "2025-11-10 14:00:15",
    duration: "0.8s",
    trigger: "Retry attempt #1",
    actions: [
      { name: "Send reminder email", status: "success", timestamp: "14:00:16" },
      { name: "Update invoice status", status: "success", timestamp: "14:00:16" },
      { name: "Log activity", status: "success", timestamp: "14:00:16" },
    ],
    retries: 1,
  },
];

export function Logs() {
  const [selectedLog, setSelectedLog] = useState<typeof logs[0] | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredLogs = logs.filter((log) => {
    const matchesStatus = statusFilter === "all" || log.status === statusFilter;
    const matchesSearch =
      searchQuery === "" ||
      log.automation.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const handleViewDetails = (log: typeof logs[0]) => {
    setSelectedLog(log);
    setDialogOpen(true);
  };

  const handleRetry = (logId: number) => {
    alert(`Retrying automation log #${logId}...`);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl text-gray-900">Activity Logs</h1>
        <p className="text-gray-600 mt-1">
          View and manage automation execution history
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-6 sm:grid-cols-4">
        <Card className="p-6">
          <div className="flex items-center space-x-3 mb-2">
            <div className="bg-green-100 p-2 rounded-lg">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl text-gray-900">142</p>
              <p className="text-sm text-gray-600">Successful</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center space-x-3 mb-2">
            <div className="bg-red-100 p-2 rounded-lg">
              <XCircle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl text-gray-900">3</p>
              <p className="text-sm text-gray-600">Failed</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center space-x-3 mb-2">
            <div className="bg-blue-100 p-2 rounded-lg">
              <RefreshCw className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl text-gray-900">2</p>
              <p className="text-sm text-gray-600">Retrying</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center space-x-3 mb-2">
            <div className="bg-purple-100 p-2 rounded-lg">
              <Clock className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl text-gray-900">2.1s</p>
              <p className="text-sm text-gray-600">Avg Duration</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search automations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-48">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="success">Success</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
              <SelectItem value="retrying">Retrying</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Logs Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Automation</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Timestamp</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead>Retries</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredLogs.map((log) => (
              <TableRow key={log.id} className="cursor-pointer hover:bg-gray-50">
                <TableCell>
                  <div>
                    <p className="text-gray-900">{log.automation}</p>
                    <p className="text-sm text-gray-500">{log.trigger}</p>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge
                    className={
                      log.status === "success"
                        ? "bg-green-100 text-green-700"
                        : log.status === "failed"
                        ? "bg-red-100 text-red-700"
                        : "bg-blue-100 text-blue-700"
                    }
                  >
                    {log.status === "success" && (
                      <CheckCircle className="h-3 w-3 mr-1" />
                    )}
                    {log.status === "failed" && (
                      <XCircle className="h-3 w-3 mr-1" />
                    )}
                    {log.status === "retrying" && (
                      <RefreshCw className="h-3 w-3 mr-1" />
                    )}
                    {log.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-gray-600">
                  {log.timestamp}
                </TableCell>
                <TableCell className="text-sm text-gray-600">{log.duration}</TableCell>
                <TableCell>
                  {log.retries > 0 ? (
                    <Badge variant="outline" className="border-orange-200 text-orange-700">
                      {log.retries} {log.retries === 1 ? "retry" : "retries"}
                    </Badge>
                  ) : (
                    <span className="text-sm text-gray-400">-</span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end space-x-2">
                    {log.status === "failed" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRetry(log.id);
                        }}
                      >
                        <RefreshCw className="h-3 w-3 mr-1" />
                        Retry
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleViewDetails(log)}
                    >
                      Details
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {/* Details Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Automation Execution Details</DialogTitle>
            <DialogDescription>
              Detailed breakdown of automation execution
            </DialogDescription>
          </DialogHeader>

          {selectedLog && (
            <div className="space-y-6 mt-4">
              {/* Summary */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Automation</p>
                  <p className="text-gray-900">{selectedLog.automation}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Status</p>
                  <Badge
                    className={
                      selectedLog.status === "success"
                        ? "bg-green-100 text-green-700"
                        : selectedLog.status === "failed"
                        ? "bg-red-100 text-red-700"
                        : "bg-blue-100 text-blue-700"
                    }
                  >
                    {selectedLog.status}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Timestamp</p>
                  <p className="text-gray-900">{selectedLog.timestamp}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Duration</p>
                  <p className="text-gray-900">{selectedLog.duration}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Trigger</p>
                  <p className="text-gray-900">{selectedLog.trigger}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Retries</p>
                  <p className="text-gray-900">{selectedLog.retries}</p>
                </div>
              </div>

              {/* Actions Timeline */}
              <div>
                <h4 className="text-gray-900 mb-4">Actions Executed</h4>
                <div className="space-y-3">
                  {selectedLog.actions.map((action, index) => (
                    <div key={index} className="flex items-start space-x-3">
                      <div className="flex-shrink-0 mt-1">
                        {action.status === "success" ? (
                          <div className="bg-green-100 p-1 rounded-full">
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          </div>
                        ) : action.status === "failed" ? (
                          <div className="bg-red-100 p-1 rounded-full">
                            <XCircle className="h-4 w-4 text-red-600" />
                          </div>
                        ) : (
                          <div className="bg-gray-100 p-1 rounded-full">
                            <Clock className="h-4 w-4 text-gray-400" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <p className="text-gray-900">{action.name}</p>
                          <span className="text-xs text-gray-500">
                            {action.timestamp}
                          </span>
                        </div>
                        {action.error && (
                          <p className="text-sm text-red-600 mt-1">{action.error}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Retry Info */}
              {selectedLog.status === "failed" && (
                <Card className="p-4 bg-orange-50 border-orange-200">
                  <div className="flex items-start space-x-3">
                    <RefreshCw className="h-5 w-5 text-orange-600 mt-0.5" />
                    <div>
                      <p className="text-gray-900 mb-1">Automatic Retry Scheduled</p>
                      <p className="text-sm text-gray-600">
                        This automation will automatically retry at {selectedLog.nextRetry}.
                        Current retry attempt: {selectedLog.retries} of 3
                      </p>
                    </div>
                  </div>
                </Card>
              )}

              {/* Actions */}
              <div className="flex justify-end space-x-3 pt-4 border-t">
                {selectedLog.status === "failed" && (
                  <Button onClick={() => handleRetry(selectedLog.id)}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Retry Now
                  </Button>
                )}
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
