import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { X, Send, Sparkles, Lightbulb, TrendingUp, Calendar } from "lucide-react";
import { ScrollArea } from "./ui/scroll-area";

interface AIAssistantProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  suggestions?: string[];
}

const nextBestActions = [
  {
    icon: Lightbulb,
    title: "Follow up with TechCorp",
    description: "Project milestone due in 2 days - send status update",
    priority: "high",
  },
  {
    icon: Calendar,
    title: "Schedule DesignCo kickoff",
    description: "New client onboarding scheduled for tomorrow",
    priority: "medium",
  },
  {
    icon: TrendingUp,
    title: "Review Q4 automation performance",
    description: "3 automations completed today with 95% success rate",
    priority: "low",
  },
];

export function AIAssistant({ isOpen, onClose }: AIAssistantProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      content: "Hi! I'm your FlowTask AI assistant. I can help you manage tasks, suggest automations, and optimize your workflow. What would you like to do?",
      suggestions: [
        "Create a new automation",
        "Show overdue tasks",
        "Suggest next actions",
      ],
    },
  ]);
  const [input, setInput] = useState("");

  const handleSend = () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
    };

    setMessages((prev) => [...prev, userMessage]);

    // Simulate AI response
    setTimeout(() => {
      let response = "";
      let suggestions: string[] = [];

      if (input.toLowerCase().includes("automation")) {
        response = "I can help you create an automation! Here are some templates I recommend: Invoice Reminders (sends automatic payment reminders), Client Onboarding (automates welcome emails and task creation), or Project Closure (handles final deliverables and feedback). Which would you like to set up?";
        suggestions = ["Invoice Reminders", "Client Onboarding", "Project Closure"];
      } else if (input.toLowerCase().includes("overdue")) {
        response = "You have 3 overdue tasks: 1) TechCorp website redesign review (due 2 days ago), 2) DesignCo proposal (due yesterday), 3) Monthly analytics report (due today). Would you like me to reschedule any of these?";
        suggestions = ["Reschedule all", "Show task details", "Send reminders"];
      } else if (input.toLowerCase().includes("next") || input.toLowerCase().includes("action")) {
        response = "Based on your current projects and deadlines, I suggest: 1) Follow up with TechCorp on their milestone (due in 2 days), 2) Prepare for DesignCo kickoff meeting tomorrow, 3) Review this week's automation performance. Would you like me to create tasks for any of these?";
        suggestions = ["Create tasks", "Show more suggestions", "Schedule meetings"];
      } else {
        response = "I can help you with task management, automation setup, project tracking, and workflow optimization. What specific area would you like assistance with?";
        suggestions = ["Task management", "Automations", "Reports"];
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: response,
        suggestions,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    }, 1000);

    setInput("");
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInput(suggestion);
    handleSend();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ x: 400 }}
          animate={{ x: 0 }}
          exit={{ x: 400 }}
          transition={{ type: "spring", damping: 30, stiffness: 300 }}
          className="fixed right-0 top-0 h-screen w-full sm:w-96 bg-white border-l border-gray-200 z-50 flex flex-col shadow-2xl"
        >
          {/* Header */}
          <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-purple-50 to-blue-50">
            <div className="flex items-center space-x-2">
              <div className="bg-purple-100 p-2 rounded-lg">
                <Sparkles className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <h3 className="text-gray-900">AI Assistant</h3>
                <p className="text-xs text-gray-500">Suggest Mode</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Next Best Actions */}
          <div className="p-4 border-b border-gray-200 bg-gray-50">
            <h4 className="text-sm text-gray-700 mb-3">Next Best Actions</h4>
            <div className="space-y-2">
              {nextBestActions.map((action, index) => (
                <Card
                  key={index}
                  className="p-3 hover:shadow-md transition-shadow cursor-pointer"
                >
                  <div className="flex items-start space-x-3">
                    <div className={`p-2 rounded-lg ${
                      action.priority === "high"
                        ? "bg-red-100"
                        : action.priority === "medium"
                        ? "bg-yellow-100"
                        : "bg-green-100"
                    }`}>
                      <action.icon className={`h-4 w-4 ${
                        action.priority === "high"
                          ? "text-red-600"
                          : action.priority === "medium"
                          ? "text-yellow-600"
                          : "text-green-600"
                      }`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm text-gray-900">{action.title}</p>
                        <Badge
                          variant="outline"
                          className={`text-xs ${
                            action.priority === "high"
                              ? "border-red-200 text-red-700"
                              : action.priority === "medium"
                              ? "border-yellow-200 text-yellow-700"
                              : "border-green-200 text-green-700"
                          }`}
                        >
                          {action.priority}
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-600">{action.description}</p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${
                    message.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg p-3 ${
                      message.role === "user"
                        ? "bg-blue-600 text-white"
                        : "bg-gray-100 text-gray-900"
                    }`}
                  >
                    <p className="text-sm">{message.content}</p>
                    {message.suggestions && message.suggestions.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {message.suggestions.map((suggestion, index) => (
                          <button
                            key={index}
                            onClick={() => handleSuggestionClick(suggestion)}
                            className="block w-full text-left text-xs px-3 py-2 bg-white text-gray-700 rounded border border-gray-200 hover:bg-gray-50 transition-colors"
                          >
                            {suggestion}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>

          {/* Input */}
          <div className="p-4 border-t border-gray-200 bg-white">
            <div className="flex space-x-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleSend()}
                placeholder="Ask me anything..."
                className="flex-1"
              />
              <Button onClick={handleSend} size="icon">
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
