import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Card, CardContent } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Badge } from "../ui/badge";
import { Avatar, AvatarFallback } from "../ui/avatar";
import { Separator } from "../ui/separator";
import {
  Mail,
  MessageSquare,
  Search,
  Clock,
  Star,
  CheckCircle2,
  Calendar,
  Download,
} from "lucide-react";
import { motion } from "motion/react";
import { ActionItemsDialog } from "./ActionItemsDialog";
import { toast } from "sonner";

interface Message {
  id: string;
  type: "email" | "chat";
  from: string;
  to: string;
  subject?: string;
  content: string;
  timestamp: string;
  date: Date;
  starred: boolean;
  actionItems?: string[];
}

interface MessageThreadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientName: string;
  clientInitials: string;
  dateRange: string;
  totalMessages: number;
}

// Mock conversation data
const getMockMessages = (clientName: string): Message[] => {
  const baseDate = new Date("2025-11-11");

  return [
    {
      id: "1",
      type: "email",
      from: "Sarah Johnson",
      to: "You",
      subject: "Q4 Project Timeline Question",
      content:
        "Hi team, I wanted to follow up on the timeline we discussed for the Q4 rollout. Can we schedule a quick call to review the milestones? I have a few questions about the API integration phase and want to make sure we're aligned on the approach. Looking forward to your thoughts.",
      timestamp: "Nov 11, 9:30 AM",
      date: new Date(baseDate.getTime() - 2 * 60 * 60 * 1000),
      starred: true,
      actionItems: [
        "Schedule Q4 timeline review call",
        "Review API integration approach",
      ],
    },
    {
      id: "2",
      type: "chat",
      from: "You",
      to: "Sarah Johnson",
      content:
        "Absolutely! I'm available tomorrow afternoon or Thursday morning. Which works better for you? I'll prepare some documentation on the API integration approach so we can discuss it in detail.",
      timestamp: "Nov 11, 10:15 AM",
      date: new Date(baseDate.getTime() - 1.25 * 60 * 60 * 1000),
      starred: false,
    },
    {
      id: "3",
      type: "chat",
      from: "Sarah Johnson",
      to: "You",
      content:
        "Thursday morning works perfectly! Let's do 10 AM. Thanks for preparing the docs in advance - that will really help us make the most of our time.",
      timestamp: "Nov 11, 10:45 AM",
      date: new Date(baseDate.getTime() - 45 * 60 * 1000),
      starred: false,
    },
    {
      id: "4",
      type: "email",
      from: "You",
      to: "Sarah Johnson",
      subject: "Re: Q4 Project Timeline Question",
      content:
        "Great! I've scheduled our call for Thursday at 10 AM. I've also attached the API integration documentation and a proposed timeline for review. Please take a look before our call if you have time. Looking forward to discussing this with you!",
      timestamp: "Nov 11, 11:20 AM",
      date: new Date(baseDate.getTime() - 30 * 60 * 1000),
      starred: false,
      actionItems: ["Prepare for Thursday 10 AM call"],
    },
    {
      id: "5",
      type: "email",
      from: "Sarah Johnson",
      to: "You",
      subject: "Resource Allocation for Q4",
      content:
        "Quick question about the resource allocation for Q4. We're considering bringing in an additional backend developer for the integration phase. What's your take on this? Would it help accelerate the timeline or would onboarding slow things down?",
      timestamp: "Nov 11, 2:15 PM",
      date: new Date(baseDate.getTime()),
      starred: true,
      actionItems: ["Review resource needs for Q4"],
    },
    {
      id: "6",
      type: "chat",
      from: "You",
      to: "Sarah Johnson",
      content:
        "Good question! Given the complexity of the integration, I think adding another developer could be beneficial, but timing is key. If we can bring them on before the integration phase kicks off (ideally within the next 2 weeks), we can use the onboarding period productively. I can prepare a detailed analysis for our Thursday call.",
      timestamp: "Nov 11, 3:00 PM",
      date: new Date(baseDate.getTime() + 45 * 60 * 1000),
      starred: false,
    },
  ];
};

export function MessageThreadDialog({
  open,
  onOpenChange,
  clientName,
  clientInitials,
  dateRange,
  totalMessages,
}: MessageThreadDialogProps) {
  const [messages] = useState<Message[]>(getMockMessages(clientName));
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"all" | "email" | "chat">("all");
  const [showActionItems, setShowActionItems] = useState(false);

  const filteredMessages = messages.filter((msg) => {
    const matchesSearch =
      msg.from.toLowerCase().includes(searchQuery.toLowerCase()) ||
      msg.subject?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      msg.content.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesType = filterType === "all" || msg.type === filterType;

    return matchesSearch && matchesType;
  });

  const totalActionItems = messages.reduce(
    (sum, msg) => sum + (msg.actionItems?.length || 0),
    0
  );

  const emailCount = messages.filter((m) => m.type === "email").length;
  const chatCount = messages.filter((m) => m.type === "chat").length;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <div className="flex items-center space-x-4">
              <Avatar className="h-12 w-12">
                <AvatarFallback>{clientInitials}</AvatarFallback>
              </Avatar>
              <div>
                <DialogTitle className="text-xl">
                  {clientName} - Conversation History
                </DialogTitle>
                <DialogDescription className="flex items-center space-x-4 mt-1">
                  <span className="flex items-center">
                    <Calendar className="h-3 w-3 mr-1" />
                    {dateRange}
                  </span>
                  <span className="flex items-center">
                    <Mail className="h-3 w-3 mr-1" />
                    {emailCount} emails
                  </span>
                  <span className="flex items-center">
                    <MessageSquare className="h-3 w-3 mr-1" />
                    {chatCount} chats
                  </span>
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4 flex-1 overflow-y-auto">
            {/* Stats Bar */}
            <div className="grid grid-cols-3 gap-3">
              <Card>
                <CardContent className="pt-4 pb-3">
                  <div className="text-center">
                    <p className="text-2xl text-gray-900">
                      {filteredMessages.length}
                    </p>
                    <p className="text-xs text-gray-600 mt-1">Total Messages</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 pb-3">
                  <div className="text-center">
                    <p className="text-2xl text-gray-900">{totalActionItems}</p>
                    <p className="text-xs text-gray-600 mt-1">Action Items</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 pb-3">
                  <div className="text-center">
                    <p className="text-2xl text-gray-900">
                      {messages.filter((m) => m.starred).length}
                    </p>
                    <p className="text-xs text-gray-600 mt-1">Starred</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Search and Filters */}
            <div className="flex items-center gap-2">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search messages..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant={filterType === "all" ? "default" : "outline"}
                  onClick={() => setFilterType("all")}
                >
                  All
                </Button>
                <Button
                  size="sm"
                  variant={filterType === "email" ? "default" : "outline"}
                  onClick={() => setFilterType("email")}
                >
                  <Mail className="h-4 w-4 mr-1" />
                  Email
                </Button>
                <Button
                  size="sm"
                  variant={filterType === "chat" ? "default" : "outline"}
                  onClick={() => setFilterType("chat")}
                >
                  <MessageSquare className="h-4 w-4 mr-1" />
                  Chat
                </Button>
              </div>
            </div>

            {/* Action Items Summary */}
            {totalActionItems > 0 && (
              <button
                onClick={() => setShowActionItems(true)}
                className="w-full"
              >
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 hover:bg-blue-100 transition-colors cursor-pointer">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <CheckCircle2 className="h-5 w-5 text-blue-600" />
                      <p className="text-sm text-blue-900">
                        <strong>{totalActionItems}</strong> action items
                        identified from these conversations
                      </p>
                    </div>
                    <Button size="sm" variant="ghost" className="text-blue-700">
                      View All
                    </Button>
                  </div>
                </div>
              </button>
            )}

            <Separator />

            {/* Messages Thread */}
            <div className="space-y-4">
              {filteredMessages.map((message, index) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card
                    className={
                      message.starred ? "border-yellow-200 bg-yellow-50/30" : ""
                    }
                  >
                    <CardContent className="pt-4 pb-4">
                      <div className="space-y-3">
                        {/* Message Header */}
                        <div className="flex items-start justify-between">
                          <div className="flex items-center space-x-3">
                            <Badge
                              variant={
                                message.type === "email"
                                  ? "default"
                                  : "secondary"
                              }
                            >
                              {message.type === "email" ? (
                                <Mail className="h-3 w-3 mr-1" />
                              ) : (
                                <MessageSquare className="h-3 w-3 mr-1" />
                              )}
                              {message.type}
                            </Badge>
                            <div className="flex items-center space-x-2">
                              <span className="text-sm text-gray-900 font-medium">
                                {message.from}
                              </span>
                              <span className="text-sm text-gray-500">→</span>
                              <span className="text-sm text-gray-600">
                                {message.to}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            {message.starred && (
                              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                            )}
                            <span className="text-xs text-gray-500 flex items-center">
                              <Clock className="h-3 w-3 mr-1" />
                              {message.timestamp}
                            </span>
                          </div>
                        </div>

                        {/* Subject (for emails) */}
                        {message.subject && (
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {message.subject}
                            </p>
                          </div>
                        )}

                        {/* Message Content */}
                        <div>
                          <p className="text-sm text-gray-700 leading-relaxed">
                            {message.content}
                          </p>
                        </div>

                        {/* Action Items */}
                        {message.actionItems &&
                          message.actionItems.length > 0 && (
                            <div className="bg-green-50 border border-green-200 rounded-md p-2">
                              <p className="text-xs text-green-800 font-medium mb-1 flex items-center">
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                Action Items from this message:
                              </p>
                              <ul className="space-y-1">
                                {message.actionItems.map((item, idx) => (
                                  <li
                                    key={idx}
                                    className="text-xs text-green-700 pl-4"
                                  >
                                    • {item}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>

            {filteredMessages.length === 0 && (
              <Card>
                <CardContent className="py-12 text-center">
                  <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No messages found</p>
                  <p className="text-sm text-gray-500 mt-1">
                    Try adjusting your search or filters
                  </p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-200">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                toast.success(`Conversation thread exported for ${clientName}`);
              }}
            >
              <Download className="h-4 w-4 mr-2" />
              Export Thread
            </Button>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onOpenChange(false)}
              >
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Action Items Dialog */}
      <ActionItemsDialog
        open={showActionItems}
        onOpenChange={setShowActionItems}
        clientName={clientName}
        existingItems={[]}
      />
    </>
  );
}
