import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Badge } from "../ui/badge";
import { Avatar, AvatarFallback } from "../ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import {
  FileText,
  Search,
  Sparkles,
  Calendar,
  TrendingUp,
  MessageSquare,
  Mail,
  Download,
  ExternalLink,
} from "lucide-react";
import { motion } from "motion/react";

interface ConversationSummary {
  id: string;
  client: string;
  initials: string;
  dateRange: string;
  messageCount: number;
  emailCount: number;
  chatCount: number;
  summary: string;
  keyTopics: string[];
  sentiment: "positive" | "neutral" | "needs-attention";
  actionItems: number;
  lastUpdated: string;
}

const mockSummaries: ConversationSummary[] = [
  {
    id: "1",
    client: "Acme Corp",
    initials: "AC",
    dateRange: "Nov 1-11, 2025",
    messageCount: 24,
    emailCount: 15,
    chatCount: 9,
    summary:
      "Discussions primarily focused on Q4 project timeline and resource allocation. Client expressed satisfaction with progress but raised concerns about API integration complexity. Agreement reached on phased rollout approach. Weekly check-ins established.",
    keyTopics: [
      "Q4 Timeline",
      "API Integration",
      "Resource Planning",
      "Weekly Updates",
    ],
    sentiment: "positive",
    actionItems: 3,
    lastUpdated: "2 hours ago",
  },
  {
    id: "2",
    client: "TechStart Inc",
    initials: "TI",
    dateRange: "Nov 1-11, 2025",
    messageCount: 18,
    emailCount: 10,
    chatCount: 8,
    summary:
      "Ongoing technical discussions about platform integration. Client requested additional documentation and training materials. Some delays in receiving feedback on mockups. Follow-up meeting scheduled to review architecture decisions.",
    keyTopics: [
      "Platform Integration",
      "Documentation",
      "Training",
      "Architecture Review",
    ],
    sentiment: "neutral",
    actionItems: 5,
    lastUpdated: "5 hours ago",
  },
  {
    id: "3",
    client: "DesignCo",
    initials: "DC",
    dateRange: "Nov 1-11, 2025",
    messageCount: 31,
    emailCount: 20,
    chatCount: 11,
    summary:
      "Excellent collaboration on new dashboard design. Client provided detailed feedback promptly. Minor revisions requested on color scheme and typography. Overall very pleased with direction. Payment received on time.",
    keyTopics: ["Dashboard Design", "UI Feedback", "Color Scheme", "Payment"],
    sentiment: "positive",
    actionItems: 2,
    lastUpdated: "1 day ago",
  },
  {
    id: "4",
    client: "Global Solutions",
    initials: "GS",
    dateRange: "Nov 1-11, 2025",
    messageCount: 12,
    emailCount: 8,
    chatCount: 4,
    summary:
      "Limited communication this period. Client hasn't responded to last two check-in emails. Project appears to be on hold pending budget approval. May need to schedule call to address concerns and maintain relationship.",
    keyTopics: ["Budget Approval", "Project Status", "Check-in Needed"],
    sentiment: "needs-attention",
    actionItems: 1,
    lastUpdated: "3 days ago",
  },
];

export function ConversationSummaries() {
  const [summaries] = useState<ConversationSummary[]>(mockSummaries);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterSentiment, setFilterSentiment] = useState("all");

  const filteredSummaries = summaries.filter((summary) => {
    const matchesSearch =
      summary.client.toLowerCase().includes(searchQuery.toLowerCase()) ||
      summary.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
      summary.keyTopics.some((topic) =>
        topic.toLowerCase().includes(searchQuery.toLowerCase())
      );
    const matchesSentiment =
      filterSentiment === "all" || summary.sentiment === filterSentiment;
    return matchesSearch && matchesSentiment;
  });

  const getSentimentBadge = (sentiment: ConversationSummary["sentiment"]) => {
    switch (sentiment) {
      case "positive":
        return (
          <Badge className="bg-green-100 text-green-700">
            <TrendingUp className="h-3 w-3 mr-1" />
            Positive
          </Badge>
        );
      case "neutral":
        return <Badge variant="outline">Neutral</Badge>;
      case "needs-attention":
        return (
          <Badge className="bg-red-100 text-red-700">Needs Attention</Badge>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Clients</p>
                <p className="text-2xl text-gray-900 mt-1">
                  {summaries.length}
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
                <p className="text-sm text-gray-600">Positive Sentiment</p>
                <p className="text-2xl text-gray-900 mt-1">
                  {summaries.filter((s) => s.sentiment === "positive").length}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Need Attention</p>
                <p className="text-2xl text-gray-900 mt-1">
                  {
                    summaries.filter((s) => s.sentiment === "needs-attention")
                      .length
                  }
                </p>
              </div>
              <Badge className="h-8 w-8 bg-red-100 text-red-600 flex items-center justify-center">
                !
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Messages</p>
                <p className="text-2xl text-gray-900 mt-1">
                  {summaries.reduce((sum, s) => sum + s.messageCount, 0)}
                </p>
              </div>
              <MessageSquare className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search summaries..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterSentiment} onValueChange={setFilterSentiment}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sentiments</SelectItem>
                <SelectItem value="positive">Positive</SelectItem>
                <SelectItem value="neutral">Neutral</SelectItem>
                <SelectItem value="needs-attention">Needs Attention</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Summaries List */}
      <div className="space-y-4">
        {filteredSummaries.map((summary, index) => (
          <motion.div
            key={summary.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4">
                    <Avatar className="h-12 w-12">
                      <AvatarFallback>{summary.initials}</AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center space-x-3 mb-2">
                        <CardTitle className="text-lg">
                          {summary.client}
                        </CardTitle>
                        {getSentimentBadge(summary.sentiment)}
                        <Badge className="bg-purple-100 text-purple-700">
                          <Sparkles className="h-3 w-3 mr-1" />
                          AI Summary
                        </Badge>
                      </div>
                      <div className="flex items-center space-x-4 text-sm text-gray-600">
                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 mr-1" />
                          {summary.dateRange}
                        </div>
                        <div className="flex items-center">
                          <Mail className="h-4 w-4 mr-1" />
                          {summary.emailCount} emails
                        </div>
                        <div className="flex items-center">
                          <MessageSquare className="h-4 w-4 mr-1" />
                          {summary.chatCount} chats
                        </div>
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500">
                    Updated {summary.lastUpdated}
                  </p>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="text-sm text-gray-700 mb-2">Summary</h4>
                  <p className="text-sm text-gray-600">{summary.summary}</p>
                </div>

                <div>
                  <h4 className="text-sm text-gray-700 mb-2">Key Topics</h4>
                  <div className="flex flex-wrap gap-2">
                    {summary.keyTopics.map((topic) => (
                      <Badge key={topic} variant="secondary">
                        {topic}
                      </Badge>
                    ))}
                  </div>
                </div>

                {summary.actionItems > 0 && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <p className="text-sm text-blue-900">
                      <strong>{summary.actionItems}</strong> action items
                      identified from these conversations
                    </p>
                  </div>
                )}

                <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                  <div className="flex items-center space-x-2">
                    <Button size="sm" variant="outline">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      View Messages
                    </Button>
                    <Button size="sm" variant="outline">
                      <Download className="h-4 w-4 mr-2" />
                      Export Summary
                    </Button>
                  </div>
                  <Button size="sm">Generate New Summary</Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {filteredSummaries.length === 0 && (
        <Card>
          <CardContent className="py-24 text-center">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No conversation summaries found</p>
            <p className="text-sm text-gray-500 mt-1">
              Summaries are automatically generated for each client
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
