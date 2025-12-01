import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../ui/card";
import { Button } from "../ui/button";
import { Switch } from "../ui/switch";
import { Label } from "../ui/label";
import { Badge } from "../ui/badge";
import { Separator } from "../ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import {
  Brain,
  AlertTriangle,
  CheckCircle,
  Clock,
  Zap,
} from "lucide-react";

export function AutoScheduleSettings() {
  const [autoReschedule, setAutoReschedule] = useState(true);
  const [conflictDetection, setConflictDetection] = useState(true);
  const [smartSuggestions, setSmartSuggestions] = useState(true);
  const [notifyAttendees, setNotifyAttendees] = useState(true);
  const [requireApproval, setRequireApproval] = useState(false);
  
  const [reschedulePriority, setReschedulePriority] = useState("workload");
  const [conflictWindow, setConflictWindow] = useState("24");
  const [maxReschedules, setMaxReschedules] = useState("3");

  return (
    <div className="space-y-6">
      {/* Auto-Reschedule Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Zap className="h-5 w-5 mr-2 text-yellow-600" />
            Auto-Reschedule
            <Badge className="ml-2 bg-yellow-100 text-yellow-700">Smart</Badge>
          </CardTitle>
          <CardDescription>
            Automatically reschedule meetings when conflicts are detected
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>Enable Auto-Reschedule</Label>
              <p className="text-sm text-gray-600">
                Automatically move meetings when conflicts arise
              </p>
            </div>
            <Switch checked={autoReschedule} onCheckedChange={setAutoReschedule} />
          </div>

          {autoReschedule && (
            <>
              <Separator />

              <div className="space-y-2">
                <Label htmlFor="priority">Rescheduling Priority</Label>
                <Select value={reschedulePriority} onValueChange={setReschedulePriority}>
                  <SelectTrigger id="priority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="workload">Workload-Aware (Recommended)</SelectItem>
                    <SelectItem value="time">Earliest Available Time</SelectItem>
                    <SelectItem value="attendees">Optimize for All Attendees</SelectItem>
                    <SelectItem value="importance">By Meeting Importance</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500">
                  {reschedulePriority === "workload" &&
                    "AI considers your current task load and energy levels"}
                  {reschedulePriority === "time" &&
                    "Finds the next available slot that works for everyone"}
                  {reschedulePriority === "attendees" &&
                    "Prioritizes times that work best for all participants"}
                  {reschedulePriority === "importance" &&
                    "High-priority meetings get better time slots"}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="max-reschedules">Max Auto-Reschedules Per Meeting</Label>
                <Select value={maxReschedules} onValueChange={setMaxReschedules}>
                  <SelectTrigger id="max-reschedules">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 time</SelectItem>
                    <SelectItem value="2">2 times</SelectItem>
                    <SelectItem value="3">3 times</SelectItem>
                    <SelectItem value="5">5 times</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Require Approval</Label>
                  <p className="text-sm text-gray-600">
                    Get notified before auto-rescheduling
                  </p>
                </div>
                <Switch checked={requireApproval} onCheckedChange={setRequireApproval} />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Notify Attendees</Label>
                  <p className="text-sm text-gray-600">
                    Send email notifications when meetings are rescheduled
                  </p>
                </div>
                <Switch checked={notifyAttendees} onCheckedChange={setNotifyAttendees} />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Conflict Detection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <AlertTriangle className="h-5 w-5 mr-2 text-red-600" />
            Conflict Detection
            <Badge className="ml-2 bg-red-100 text-red-700">AI</Badge>
          </CardTitle>
          <CardDescription>
            Proactively identify and resolve scheduling conflicts
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>Enable Conflict Detection</Label>
              <p className="text-sm text-gray-600">
                Monitor for conflicts with tasks, projects, and other meetings
              </p>
            </div>
            <Switch checked={conflictDetection} onCheckedChange={setConflictDetection} />
          </div>

          {conflictDetection && (
            <>
              <Separator />

              <div className="space-y-2">
                <Label htmlFor="conflict-window">Detection Window</Label>
                <Select value={conflictWindow} onValueChange={setConflictWindow}>
                  <SelectTrigger id="conflict-window">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="12">12 hours ahead</SelectItem>
                    <SelectItem value="24">24 hours ahead</SelectItem>
                    <SelectItem value="48">48 hours ahead</SelectItem>
                    <SelectItem value="168">1 week ahead</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500">
                  How far in advance to check for conflicts
                </p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="text-sm text-blue-900 mb-2">What We Check For:</h4>
                <ul className="space-y-1 text-sm text-blue-800">
                  <li className="flex items-start">
                    <CheckCircle className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
                    <span>Overlapping meetings on your calendar</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
                    <span>Tasks with approaching deadlines</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
                    <span>Exceeding daily meeting hour limits</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
                    <span>Insufficient buffer time between meetings</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
                    <span>High workload periods (based on project data)</span>
                  </li>
                </ul>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Smart Suggestions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Brain className="h-5 w-5 mr-2 text-purple-600" />
            AI-Powered Suggestions
            <Badge className="ml-2 bg-purple-100 text-purple-700">Beta</Badge>
          </CardTitle>
          <CardDescription>
            Get intelligent recommendations for optimal meeting times
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>Smart Time Suggestions</Label>
              <p className="text-sm text-gray-600">
                AI suggests best times based on your patterns and productivity
              </p>
            </div>
            <Switch checked={smartSuggestions} onCheckedChange={setSmartSuggestions} />
          </div>

          {smartSuggestions && (
            <>
              <Separator />

              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <h4 className="text-sm text-purple-900 mb-2">AI Considers:</h4>
                <ul className="space-y-1 text-sm text-purple-800">
                  <li className="flex items-start">
                    <Brain className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
                    <span>Your historical productivity patterns</span>
                  </li>
                  <li className="flex items-start">
                    <Brain className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
                    <span>Time zones for all attendees</span>
                  </li>
                  <li className="flex items-start">
                    <Brain className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
                    <span>Meeting duration and complexity</span>
                  </li>
                  <li className="flex items-start">
                    <Brain className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
                    <span>Pre and post-meeting buffer needs</span>
                  </li>
                  <li className="flex items-start">
                    <Brain className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
                    <span>Current project deadlines and priorities</span>
                  </li>
                </ul>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Activity Log */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Clock className="h-5 w-5 mr-2 text-blue-600" />
            Recent Auto-Schedule Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-start space-x-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <Zap className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-gray-900">
                  Sprint Planning auto-rescheduled
                </p>
                <p className="text-xs text-gray-600 mt-1">
                  Moved from 2:00 PM to 3:30 PM due to urgent client call conflict
                </p>
                <p className="text-xs text-gray-500 mt-1">2 hours ago</p>
              </div>
              <Badge variant="outline" className="bg-white">Success</Badge>
            </div>

            <div className="flex items-start space-x-3 p-3 bg-red-50 border border-red-200 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-gray-900">
                  Conflict detected: Q4 Planning Session
                </p>
                <p className="text-xs text-gray-600 mt-1">
                  Exceeds daily meeting capacity (6 hours) - awaiting approval
                </p>
                <p className="text-xs text-gray-500 mt-1">3 hours ago</p>
              </div>
              <Button size="sm" variant="outline">Review</Button>
            </div>

            <div className="flex items-start space-x-3 p-3 bg-green-50 border border-green-200 rounded-lg">
              <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-gray-900">
                  Optimal time suggested for Design Review
                </p>
                <p className="text-xs text-gray-600 mt-1">
                  AI recommended 11:00 AM based on your productivity patterns
                </p>
                <p className="text-xs text-gray-500 mt-1">Yesterday</p>
              </div>
              <Badge variant="outline" className="bg-white">Applied</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
