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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import {
  FileText,
  Search,
  Sparkles,
  TrendingUp,
  MessageSquare,
  Mail,
  ExternalLink,
  Loader2,
  Trash2,
  SlidersHorizontal,
  CheckIcon,
} from "lucide-react";
import { motion } from "motion/react";
import { toast } from "sonner";
import type { ConversationSummary } from "@/types/communications";
import type { ClientSummary } from "@/types/clients";

export function ConversationSummaries() {
  const [summaries, setSummaries] = useState<ConversationSummary[]>([]);
  const [clients, setClients] = useState<ClientSummary[]>([]);
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
          <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-0.5 rounded-md font-medium bg-green-50 text-green-700 border border-green-200">
            <TrendingUp className="h-3 w-3" />
            Positive
          </span>
        );
      case "needs-attention":
        return (
          <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-0.5 rounded-md font-medium bg-red-50 text-red-700 border border-red-200">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
            Needs Attention
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-0.5 rounded-md font-medium bg-gray-50 text-gray-500 border border-gray-200">
            <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
            Neutral
          </span>
        );
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
    <div className="space-y-6 overflow-y-auto h-full p-4 sm:p-6">
      {/* Generate New Summary */}
      {clientsWithoutSummary.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-700 mb-1">
                  Generate Summary
                </p>
                <p className="text-xs text-gray-500">
                  AI-powered analysis of email conversations with a client
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Select
                  value={selectedClientId}
                  onValueChange={setSelectedClientId}
                >
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
                  onClick={() =>
                    selectedClientId &&
                    generateSummary(parseInt(selectedClientId, 10))
                  }
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
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
          <Input
            placeholder="Search summaries..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-8 text-sm"
          />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="inline-flex items-center gap-1.5 text-xs text-gray-600 bg-white hover:bg-gray-100 border border-gray-200 rounded-md px-3 py-1.5 transition-colors">
              <SlidersHorizontal className="h-3.5 w-3.5" />
              {filterSentiment === "all"
                ? "All Sentiments"
                : filterSentiment === "positive"
                  ? "Positive"
                  : filterSentiment === "neutral"
                    ? "Neutral"
                    : "Needs Attention"}
              {filterSentiment !== "all" && (
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {[
              ["all", "All Sentiments"],
              ["positive", "Positive"],
              ["neutral", "Neutral"],
              ["needs-attention", "Needs Attention"],
            ].map(([value, label]) => (
              <DropdownMenuItem
                key={value}
                onClick={() => setFilterSentiment(value)}
                className="flex items-center justify-between cursor-pointer"
              >
                {label}
                {filterSentiment === value && (
                  <CheckIcon className="h-3.5 w-3.5 text-blue-600 ml-2" />
                )}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

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
                        <AvatarFallback>
                          {getInitials(summary.clientName)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="flex items-center space-x-3 mb-2">
                          <CardTitle className="text-lg">
                            {summary.clientName || "Unknown Client"}
                          </CardTitle>
                          {getSentimentBadge(summary.sentiment)}
                          <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-0.5 rounded-md font-medium bg-purple-50 text-purple-700 border border-purple-200">
                            <Sparkles className="h-3 w-3" />
                            AI Summary
                          </span>
                        </div>
                        <div className="flex items-center space-x-4 text-sm text-gray-600">
                          <div className="flex items-center">
                            <Mail className="h-4 w-4 mr-1" />
                            {summary.emailCount || 0} emails analyzed
                          </div>
                          {summary.generatedAt && (
                            <span className="text-xs text-gray-400">
                              Generated{" "}
                              {new Date(
                                summary.generatedAt
                              ).toLocaleDateString()}
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
                          <span
                            key={topic}
                            className="inline-flex items-center text-xs bg-gray-100 text-gray-700 rounded-full px-2.5 py-0.5"
                          >
                            {topic}
                          </span>
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
                          <li
                            key={i}
                            className="text-sm text-blue-800 flex items-start"
                          >
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
              Generate an AI summary for a client to see their communication
              overview
            </p>
            {clients.length > 0 && (
              <Button
                className="mt-4"
                onClick={() =>
                  selectedClientId &&
                  generateSummary(parseInt(selectedClientId, 10))
                }
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
