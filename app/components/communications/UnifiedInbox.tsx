import { useState } from "react";
import { Card, CardContent } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Badge } from "../ui/badge";
import { Avatar, AvatarFallback } from "../ui/avatar";
import { Textarea } from "../ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import {
  Mail,
  MessageSquare,
  Search,
  Filter,
  Star,
  Archive,
  Trash2,
  Send,
  Sparkles,
  Clock,
  Paperclip,
  MoreVertical,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { Separator } from "../ui/separator";
import { motion } from "motion/react";
import { AIReplyComposer } from "./AIReplyComposer";

interface Message {
  id: string;
  type: "email" | "chat";
  from: string;
  initials: string;
  subject?: string;
  preview: string;
  timestamp: string;
  unread: boolean;
  starred: boolean;
  client: string;
  tags: string[];
  lastMessage?: string;
}

const mockMessages: Message[] = [
  {
    id: "1",
    type: "email",
    from: "Sarah Johnson",
    initials: "SJ",
    subject: "Q4 Project Timeline Question",
    preview: "Hey team, I wanted to follow up on the timeline we discussed for the Q4 rollout...",
    timestamp: "10 minutes ago",
    unread: true,
    starred: false,
    client: "Acme Corp",
    tags: ["urgent", "project"],
  },
  {
    id: "2",
    type: "chat",
    from: "Mike Chen",
    initials: "MC",
    preview: "Quick question about the API integration we discussed yesterday",
    timestamp: "1 hour ago",
    unread: true,
    starred: true,
    client: "TechStart Inc",
    tags: ["technical"],
  },
  {
    id: "3",
    type: "email",
    from: "Alex Kim",
    initials: "AK",
    subject: "Invoice #1234 Payment Confirmation",
    preview: "Thank you for your service this month. Payment has been processed...",
    timestamp: "3 hours ago",
    unread: true,
    starred: false,
    client: "DesignCo",
    tags: ["billing"],
  },
  {
    id: "4",
    type: "chat",
    from: "Emily Davis",
    initials: "ED",
    preview: "The new dashboard looks amazing! Just a few minor tweaks needed",
    timestamp: "Yesterday",
    unread: false,
    starred: false,
    client: "Global Solutions",
    tags: ["feedback"],
  },
  {
    id: "5",
    type: "email",
    from: "Robert Wilson",
    initials: "RW",
    subject: "Meeting Notes Follow-up",
    preview: "Following up on our call this morning. Here are the action items we discussed...",
    timestamp: "2 days ago",
    unread: false,
    starred: true,
    client: "Enterprise Ltd",
    tags: ["meeting"],
  },
];

export function UnifiedInbox() {
  const [messages, setMessages] = useState<Message[]>(mockMessages);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"all" | "email" | "chat">("all");
  const [filterStatus, setFilterStatus] = useState<"all" | "unread" | "starred">("all");
  const [showAIComposer, setShowAIComposer] = useState(false);

  const filteredMessages = messages.filter((msg) => {
    const matchesSearch =
      msg.from.toLowerCase().includes(searchQuery.toLowerCase()) ||
      msg.subject?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      msg.preview.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesType = filterType === "all" || msg.type === filterType;
    const matchesStatus =
      filterStatus === "all" ||
      (filterStatus === "unread" && msg.unread) ||
      (filterStatus === "starred" && msg.starred);
    
    return matchesSearch && matchesType && matchesStatus;
  });

  const toggleStar = (id: string) => {
    setMessages(
      messages.map((msg) =>
        msg.id === id ? { ...msg, starred: !msg.starred } : msg
      )
    );
  };

  const markAsRead = (id: string) => {
    setMessages(
      messages.map((msg) =>
        msg.id === id ? { ...msg, unread: false } : msg
      )
    );
  };

  const handleSelectMessage = (message: Message) => {
    setSelectedMessage(message);
    markAsRead(message.id);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Message List */}
      <div className="lg:col-span-1">
        <Card>
          <CardContent className="p-4 space-y-4">
            {/* Search and Filters */}
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search messages..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              <div className="flex gap-2">
                <Select value={filterType} onValueChange={(v: any) => setFilterType(v)}>
                  <SelectTrigger className="flex-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Messages</SelectItem>
                    <SelectItem value="email">
                      <div className="flex items-center">
                        <Mail className="h-4 w-4 mr-2" />
                        Email Only
                      </div>
                    </SelectItem>
                    <SelectItem value="chat">
                      <div className="flex items-center">
                        <MessageSquare className="h-4 w-4 mr-2" />
                        Chat Only
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>

                <Select value={filterStatus} onValueChange={(v: any) => setFilterStatus(v)}>
                  <SelectTrigger className="flex-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="unread">Unread</SelectItem>
                    <SelectItem value="starred">Starred</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Separator />

            {/* Message List */}
            <div className="space-y-2">
              {filteredMessages.map((message, index) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => handleSelectMessage(message)}
                  className={`p-3 rounded-lg cursor-pointer transition-colors ${
                    selectedMessage?.id === message.id
                      ? "bg-blue-50 border-blue-200 border"
                      : message.unread
                      ? "bg-gray-50 hover:bg-gray-100"
                      : "hover:bg-gray-50"
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    <Avatar className="h-10 w-10 flex-shrink-0">
                      <AvatarFallback>{message.initials}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center space-x-2">
                          <span
                            className={`text-sm ${
                              message.unread ? "font-semibold" : ""
                            } text-gray-900 truncate`}
                          >
                            {message.from}
                          </span>
                          {message.type === "email" ? (
                            <Mail className="h-3 w-3 text-gray-400" />
                          ) : (
                            <MessageSquare className="h-3 w-3 text-gray-400" />
                          )}
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleStar(message.id);
                          }}
                        >
                          <Star
                            className={`h-4 w-4 ${
                              message.starred
                                ? "fill-yellow-400 text-yellow-400"
                                : "text-gray-400"
                            }`}
                          />
                        </button>
                      </div>
                      {message.subject && (
                        <p
                          className={`text-sm ${
                            message.unread ? "font-medium" : ""
                          } text-gray-700 truncate mb-1`}
                        >
                          {message.subject}
                        </p>
                      )}
                      <p className="text-xs text-gray-500 truncate mb-2">
                        {message.preview}
                      </p>
                      <div className="flex items-center justify-between">
                        <Badge variant="outline" className="text-xs">
                          {message.client}
                        </Badge>
                        <span className="text-xs text-gray-400">
                          {message.timestamp}
                        </span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Message Detail & Reply */}
      <div className="lg:col-span-2">
        {selectedMessage ? (
          <Card>
            <CardContent className="p-6 space-y-6">
              {/* Message Header */}
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-4">
                  <Avatar className="h-12 w-12">
                    <AvatarFallback>{selectedMessage.initials}</AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="text-lg text-gray-900">{selectedMessage.from}</h3>
                    <p className="text-sm text-gray-600">{selectedMessage.client}</p>
                    {selectedMessage.subject && (
                      <p className="text-sm text-gray-900 mt-2">
                        {selectedMessage.subject}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge>
                    {selectedMessage.type === "email" ? (
                      <Mail className="h-3 w-3 mr-1" />
                    ) : (
                      <MessageSquare className="h-3 w-3 mr-1" />
                    )}
                    {selectedMessage.type}
                  </Badge>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>
                        <Archive className="h-4 w-4 mr-2" />
                        Archive
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Star className="h-4 w-4 mr-2" />
                        {selectedMessage.starred ? "Unstar" : "Star"}
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-red-600">
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              <Separator />

              {/* Message Content */}
              <div className="prose prose-sm max-w-none">
                <p className="text-gray-700">
                  {selectedMessage.preview}
                </p>
                <p className="text-gray-700 mt-4">
                  Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do
                  eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim
                  ad minim veniam, quis nostrud exercitation ullamco laboris.
                </p>
                <p className="text-gray-700 mt-4">
                  I'm looking forward to hearing your thoughts on this. Please let me
                  know if you have any questions or need any clarification.
                </p>
                <p className="text-gray-700 mt-4">Best regards,<br />{selectedMessage.from}</p>
              </div>

              <div className="flex flex-wrap gap-2">
                {selectedMessage.tags.map((tag) => (
                  <Badge key={tag} variant="secondary">
                    {tag}
                  </Badge>
                ))}
              </div>

              <Separator />

              {/* Reply Section */}
              {!showAIComposer ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm text-gray-700">Reply</h4>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setShowAIComposer(true)}
                    >
                      <Sparkles className="h-4 w-4 mr-2" />
                      Use AI Draft
                    </Button>
                  </div>
                  <Textarea
                    placeholder="Type your reply..."
                    rows={4}
                    className="resize-none"
                  />
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Button size="sm" variant="outline">
                        <Paperclip className="h-4 w-4 mr-2" />
                        Attach
                      </Button>
                      <Button size="sm" variant="outline">
                        <Clock className="h-4 w-4 mr-2" />
                        Schedule
                      </Button>
                    </div>
                    <Button size="sm">
                      <Send className="h-4 w-4 mr-2" />
                      Send Reply
                    </Button>
                  </div>
                </div>
              ) : (
                <AIReplyComposer
                  message={selectedMessage}
                  onClose={() => setShowAIComposer(false)}
                />
              )}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="py-24 text-center">
              <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Select a message to view</p>
              <p className="text-sm text-gray-500 mt-1">
                Choose from {filteredMessages.length} messages in your inbox
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
