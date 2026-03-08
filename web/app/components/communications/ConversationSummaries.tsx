"use client";

import { useState, useEffect } from "react";
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
  TrendingUp,
  MessageSquare,
  Mail,
  Download,
  ExternalLink,
  Loader2,
  Plus,
  Trash2,
} from "lucide-react";
import { motion } from "motion/react";
import { toast } from "sonner";

interface ConversationSummary {
  id: number;
  clientId: number;
  clientName: string | null;
  summary: string;
  keyTopics: string[] | null;
  actionItems: string[] | null;
  sentiment: string | null;
  emailCount: number | null;
  generatedAt: string | null;
}

interface Client {
  id: number;
  name: string;
}

export function ConversationSummaries() {
  const [summaries, setSummaries] = useState<ConversationSummary[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterSentiment, setFilterSentiment] = useState("all");
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState<number | null>(null); // clientId being generated
  const [selectedClientId, setSelectedClientId] = useState<string>("");

  useEffect(() => {
    fetchSummaries();
    fetchClients();
  }, []);

  const fetchSummaries = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/communications/summaries");
      if (res.ok) {
        const data = await res.json();
        setSummaries(data.summaries || []);
      }
    } catch (err) {
      console.error("Failed to fetch summaries:", err);
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

  const generateSummary = async (clientId: number) => {
    setIsGenerating(clientId);
    try {
      const res = await fetch("/api/communications/summaries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId }),
      });
      if (res.ok) {
        const data = await res.json();
        setSummaries((prev) => {
          const existing = prev.find((s) => s.clientId === clientId);
          if (existing) {
            return prev.map((s) =>
              s.clientId === clientId ? { ...data.summary } : s
            );
          }
          return [...prev, data.summary];
        });
        toast.success("Summary generated successfully");
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to generate summary");
      }
    } catch {
      toast.error("Failed to generate summary");
    } finally {
      setIsGenerating(null);
    }
  };

  const deleteSummary = async (clientId: number) => {
    try {
      const res = await fetch("/api/communications/summaries", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId }),
      });
      if (res.ok) {
        setSummaries((prev) => prev.filter((s) => s.clientId !== clientId));
        toast.success("Summary deleted");
      } else {
        toast.error("Failed to delete summary");
      }
    } catch {
      toast.error("Failed to delete summary");
    }
  };

  const filteredSummaries = summaries.filter((summary) => {
    const clientName = summary.clientName || "";
    const matchesSearch =
      clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      summary.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (summary.keyTopics || []).some((topic) =>
        topic.toLowerCase().includes(searchQuery.toLowerCase())
      );
    const matchesSentiment =
      filterSentiment === "all" || summary.sentiment === filterSentiment;
    return matchesSearch && matchesSentiment;
  });

  const getSentimentBadge = (sentiment: string | null) => {
    switch (sentiment) {
      case "positive":
        return (
          <Badge className="bg-green-100 text-green-700">
            <TrendingUp className="h-3 w-3 mr-1" />
            Positive
          </Badge>
        );
      case "needs-attention":
        return (
          <Badge className="bg-red-100 text-red-700">Needs Attention</Badge>
        );
      default:
        return <Badge variant="outline">Neutral</Badge>;
    }
  };

  const getInitials = (name: string | null): string => {
    if (!name) return "?";
    return name
      .split(" ")
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() || "")
      .join("");
  };

  // Clients that don't yet have a summary
  const clientsWithoutSummary = clients.filter(
    (c) => !summaries.find((s) => s.clientId === c.id)
  );

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Clients</p>
                <p className="text-2xl text-gray-900 mt-1">{summaries.length}</p>
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
                  {summaries.filter((s) => s.sentiment === "needs-attention").length}
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
                <p className="text-sm text-gray-600">Total Emails</p>
                <p className="text-2xl text-gray-900 mt-1">
                  {summaries.reduce((sum, s) => sum + (s.emailCount || 0), 0)}
                </p>
              </div>
              <MessageSquare className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Generate New Summary */}
      {clientsWithoutSummary.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-700 mb-1">Generate Summary</p>
                <p className="text-xs text-gray-500">
                  AI-powered analysis of email conversations with a client
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Select client..." />
                  </SelectTrigger>
                  <SelectContent>
                    {clientsWithoutSummary.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  onClick={() => selectedClientId && generateSummary(parseInt(selectedClientId, 10))}
                  disabled={!selectedClientId || isGenerating !== null}
                >
                  {isGenerating !== null ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4 mr-2" />
                  )}
                  Generate
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

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
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      ) : (
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
                        <AvatarFallback>{getInitials(summary.clientName)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="flex items-center space-x-3 mb-2">
                          <CardTitle className="text-lg">
                            {summary.clientName || "Unknown Client"}
                          </CardTitle>
                          {getSentimentBadge(summary.sentiment)}
                          <Badge className="bg-purple-100 text-purple-700">
                            <Sparkles className="h-3 w-3 mr-1" />
                            AI Summary
                          </Badge>
                        </div>
                        <div className="flex items-center space-x-4 text-sm text-gray-600">
                          <div className="flex items-center">
                            <Mail className="h-4 w-4 mr-1" />
                            {summary.emailCount || 0} emails analyzed
                          </div>
                          {summary.generatedAt && (
                            <span className="text-xs text-gray-400">
                              Generated{" "}
                              {new Date(summary.generatedAt).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => deleteSummary(summary.clientId)}
                    >
                      <Trash2 className="h-4 w-4 text-red-400" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="text-sm text-gray-700 mb-2">Summary</h4>
                    <p className="text-sm text-gray-600">{summary.summary}</p>
                  </div>

                  {(summary.keyTopics || []).length > 0 && (
                    <div>
                      <h4 className="text-sm text-gray-700 mb-2">Key Topics</h4>
                      <div className="flex flex-wrap gap-2">
                        {(summary.keyTopics || []).map((topic) => (
                          <Badge key={topic} variant="secondary">
                            {topic}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {(summary.actionItems || []).length > 0 && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <p className="text-sm text-blue-900 font-medium mb-2">
                        Action Items ({(summary.actionItems || []).length})
                      </p>
                      <ul className="space-y-1">
                        {(summary.actionItems || []).map((item, i) => (
                          <li key={i} className="text-sm text-blue-800 flex items-start">
                            <span className="mr-2">•</span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                    <div className="flex items-center space-x-2">
                      <Button size="sm" variant="outline">
                        <ExternalLink className="h-4 w-4 mr-2" />
                        View Messages
                      </Button>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => generateSummary(summary.clientId)}
                      disabled={isGenerating === summary.clientId}
                    >
                      {isGenerating === summary.clientId ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Sparkles className="h-4 w-4 mr-2" />
                      )}
                      Regenerate
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {!isLoading && filteredSummaries.length === 0 && (
        <Card>
          <CardContent className="py-24 text-center">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No conversation summaries found</p>
            <p className="text-sm text-gray-500 mt-1">
              Generate an AI summary for a client to see their communication overview
            </p>
            {clients.length > 0 && (
              <Button
                className="mt-4"
                onClick={() => selectedClientId && generateSummary(parseInt(selectedClientId, 10))}
                disabled={!selectedClientId || isGenerating !== null}
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Generate First Summary
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
