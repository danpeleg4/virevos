"use client"

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import {
    X,
    Send,
    Sparkles,
    Lightbulb,
    TrendingUp,
    Calendar,
    FileCode,
    ChevronDown,
    CheckCircle2,
    Circle,
    Loader2,
    ChevronRight
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";

interface AIAssistantProps {
    isOpen: boolean;
    onClose: () => void;
}

interface ThinkingStep {
    id: string;
    type: "planning" | "executing" | "analyzing" | "completed";
    title: string;
    description?: string;
    status: "pending" | "active" | "completed";
    details?: string[];
    files?: { name: string; changes: string }[];
}

interface Message {
    id: string;
    role: "user" | "assistant";
    content: string;
    thinking?: ThinkingStep[];
    suggestions?: string[];
    isThinking?: boolean;
    streamedContent?: string;
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
            content: "Hi! I'm your Virevos AI assistant. I can help you manage tasks, suggest automations, and optimize your workflow. What would you like to do?",
            suggestions: [
                "Create a new automation",
                "Show overdue tasks",
                "Suggest next actions",
            ],
        },
    ]);
    const [input, setInput] = useState("");
    const [selectedModel, setSelectedModel] = useState("gpt-4");
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const simulateThinking = (userInput: string): ThinkingStep[] => {
        const steps: ThinkingStep[] = [];

        if (userInput.toLowerCase().includes("automation") || userInput.toLowerCase().includes("workflow")) {
            steps.push(
                {
                    id: "1",
                    type: "planning",
                    title: "Analyzing your automation requirements",
                    status: "completed",
                    details: [
                        "Reviewing current workflow patterns",
                        "Identifying automation opportunities",
                        "Checking integration compatibility"
                    ]
                },
                {
                    id: "2",
                    type: "executing",
                    title: "Building automation template",
                    status: "completed",
                    files: [
                        { name: "client_onboarding.yml", changes: "+24 -0" },
                        { name: "automation_config.json", changes: "+12 -3" }
                    ],
                    details: [
                        "Creating trigger conditions",
                        "Setting up action sequences",
                        "Configuring notifications"
                    ]
                },
                {
                    id: "3",
                    type: "analyzing",
                    title: "Optimizing automation flow",
                    status: "completed",
                    details: [
                        "Testing trigger reliability",
                        "Validating action sequences",
                        "Estimating time savings: ~2.5 hrs/week"
                    ]
                },
                {
                    id: "4",
                    type: "completed",
                    title: "Automation ready to deploy",
                    status: "completed"
                }
            );
        } else if (userInput.toLowerCase().includes("task") || userInput.toLowerCase().includes("overdue")) {
            steps.push(
                {
                    id: "1",
                    type: "planning",
                    title: "Searching task database",
                    status: "completed",
                    details: [
                        "Querying active tasks",
                        "Filtering by status and deadlines",
                        "Sorting by priority"
                    ]
                },
                {
                    id: "2",
                    type: "analyzing",
                    title: "Analyzing task dependencies",
                    status: "completed",
                    details: [
                        "Found 3 overdue tasks",
                        "Identified 2 blocking dependencies",
                        "Calculated priority scores"
                    ]
                },
                {
                    id: "3",
                    type: "completed",
                    title: "Task analysis complete",
                    status: "completed"
                }
            );
        } else {
            steps.push(
                {
                    id: "1",
                    type: "planning",
                    title: "Understanding your request",
                    status: "completed",
                    details: [
                        "Processing natural language input",
                        "Identifying intent and context",
                        "Mapping to available actions"
                    ]
                },
                {
                    id: "2",
                    type: "analyzing",
                    title: "Generating personalized response",
                    status: "completed",
                    details: [
                        "Accessing your workflow history",
                        "Analyzing current project state",
                        "Crafting contextual suggestions"
                    ]
                },
                {
                    id: "3",
                    type: "completed",
                    title: "Response ready",
                    status: "completed"
                }
            );
        }

        return steps;
    };

    const handleSend = () => {
        if (!input.trim()) return;

        const userMessage: Message = {
            id: Date.now().toString(),
            role: "user",
            content: input,
        };

        setMessages((prev) => [...prev, userMessage]);
        const currentInput = input;
        setInput("");

        // Add thinking message
        const thinkingMessageId = (Date.now() + 1).toString();
        const thinkingMessage: Message = {
            id: thinkingMessageId,
            role: "assistant",
            content: "",
            isThinking: true,
            thinking: simulateThinking(currentInput),
        };

        setMessages((prev) => [...prev, thinkingMessage]);

        // Simulate thinking steps
        const steps = simulateThinking(currentInput);
        steps.forEach((step, index) => {
            setTimeout(() => {
                setMessages((prev) =>
                    prev.map((msg) =>
                        msg.id === thinkingMessageId
                            ? {
                                ...msg,
                                thinking: msg.thinking?.map((s, i) =>
                                    i === index ? { ...s, status: "active" as const } : s
                                ),
                            }
                            : msg
                    )
                );

                // Complete the step after a delay
                setTimeout(() => {
                    setMessages((prev) =>
                        prev.map((msg) =>
                            msg.id === thinkingMessageId
                                ? {
                                    ...msg,
                                    thinking: msg.thinking?.map((s, i) =>
                                        i === index ? { ...s, status: "completed" as const } : s
                                    ),
                                }
                                : msg
                        )
                    );
                }, 800);
            }, index * 1200);
        });

        // Generate response after thinking
        setTimeout(() => {
            let response = "";
            let suggestions: string[] = [];

            if (currentInput.toLowerCase().includes("automation")) {
                response = `I've designed a comprehensive automation workflow for you:\n\n**Client Onboarding Automation**\n\n• **Trigger**: New client added to system\n• **Actions**:\n  - Send personalized welcome email\n  - Create initial project structure\n  - Schedule kickoff meeting\n  - Assign onboarding tasks to team\n\n**Expected Benefits**:\n- Save ~2.5 hours per client\n- Ensure consistent onboarding experience\n- Reduce manual task creation by 85%\n\nWould you like me to activate this automation?`;
                suggestions = ["Activate automation", "Customize workflow", "Test with sample data"];
            } else if (currentInput.toLowerCase().includes("overdue") || currentInput.toLowerCase().includes("task")) {
                response = `Here's your task overview:\n\n**Overdue Tasks (3)**:\n\n1. **TechCorp website redesign review**\n   - Due: 2 days ago\n   - Priority: High\n   - Blocking: Final deployment\n\n2. **DesignCo proposal**\n   - Due: Yesterday  \n   - Priority: Medium\n   - Client follow-up needed\n\n3. **Monthly analytics report**\n   - Due: Today\n   - Priority: Medium\n   - Draft 80% complete\n\n**Recommendation**: Focus on TechCorp review first as it's blocking deployment.\n\nWould you like me to reschedule these tasks or send notifications?`;
                suggestions = ["Reschedule all", "Focus on high priority", "Send client updates"];
            } else {
                response = `I can assist you with:\n\n**Task Management**\n• View and organize tasks\n• Set priorities and deadlines\n• Track progress across projects\n\n**Automation**\n• Create custom workflows\n• Set up triggers and actions\n• Monitor automation performance\n\n**Project Insights**\n• Generate reports\n• Analyze team productivity\n• Forecast project timelines\n\nWhat would you like to explore?`;
                suggestions = ["Create automation", "View task analytics", "Generate project report"];
            }

            // Stream the response
            setMessages((prev) =>
                prev.map((msg) =>
                    msg.id === thinkingMessageId
                        ? {
                            ...msg,
                            isThinking: false,
                            streamedContent: "",
                        }
                        : msg
                )
            );

            // Simulate streaming
            let currentIndex = 0;
            const streamInterval = setInterval(() => {
                if (currentIndex < response.length) {
                    const chunk = response.slice(currentIndex, currentIndex + 3);
                    currentIndex += 3;

                    setMessages((prev) =>
                        prev.map((msg) =>
                            msg.id === thinkingMessageId
                                ? {
                                    ...msg,
                                    streamedContent: (msg.streamedContent || "") + chunk,
                                }
                                : msg
                        )
                    );
                } else {
                    clearInterval(streamInterval);
                    setMessages((prev) =>
                        prev.map((msg) =>
                            msg.id === thinkingMessageId
                                ? {
                                    ...msg,
                                    content: response,
                                    streamedContent: undefined,
                                    suggestions,
                                }
                                : msg
                        )
                    );
                }
            }, 20);
        }, steps.length * 1200 + 500);
    };

    const handleSuggestionClick = (suggestion: string) => {
        setInput(suggestion);
        setTimeout(() => handleSend(), 100);
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    key="ai-assistant-panel"
                    initial={{ x: "100%" }}
                    animate={{ x: 0 }}
                    exit={{ x: "100%" }}
                    transition={{ type: "spring", damping: 30, stiffness: 300 }}
                    className="fixed right-0 top-0 h-screen w-full sm:w-[480px] bg-white border-l border-gray-200 z-50 flex flex-col shadow-2xl"
                >
                    {/* Header */}
                    <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
                        <div className="flex items-center space-x-3">
                            <div className="bg-gradient-to-br from-purple-500 to-blue-600 p-2 rounded-lg">
                                <Sparkles className="h-5 w-5 text-white" />
                            </div>
                            <div>
                                <h3 className="text-gray-900">Virevos AI</h3>
                                <p className="text-xs text-gray-500">Reasoning Mode</p>
                            </div>
                        </div>
                        <div className="flex items-center space-x-2">
                            <Select value={selectedModel} onValueChange={setSelectedModel}>
                                <SelectTrigger className="w-[120px] h-8 bg-white border-gray-300 text-gray-900 text-xs">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="gpt-4">GPT-4</SelectItem>
                                    <SelectItem value="gpt-3.5">GPT-3.5</SelectItem>
                                    <SelectItem value="claude">Claude</SelectItem>
                                </SelectContent>
                            </Select>
                            <Button variant="ghost" size="icon" onClick={onClose} className="text-gray-500 hover:text-gray-900">
                                <X className="h-5 w-5" />
                            </Button>
                        </div>
                    </div>

                    {/* Next Best Actions */}
                    <div className="p-4 border-b border-gray-200 bg-gray-50">
                        <h4 className="text-sm text-gray-700 mb-3">Next Best Actions</h4>
                        <div className="space-y-2">
                            {nextBestActions.map((action, index) => (
                                <motion.div
                                    key={index}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.1 }}
                                >
                                    <Card
                                        className="p-3 transition-colors cursor-pointer bg-white border-gray-200 hover:bg-gray-100"
                                    >
                                        <div className="flex items-start space-x-3">
                                            <div className={`p-2 rounded-lg ${
                                                action.priority === "high"
                                                    ? "bg-red-50"
                                                    : action.priority === "medium"
                                                        ? "bg-yellow-50"
                                                        : "bg-green-50"
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
                                                        className={`text-xs border ${
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
                                </motion.div>
                            ))}
                        </div>
                    </div>

                    {/* Messages */}
                    <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-6 bg-gray-50">
                        {messages.map((message, msgIndex) => (
                            <motion.div
                                key={message.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: msgIndex * 0.1 }}
                                className={`flex ${
                                    message.role === "user" ? "justify-end" : "justify-start"
                                }`}
                            >
                                <div className={`max-w-[90%] ${message.role === "assistant" ? "w-full" : ""}`}>
                                    {message.role === "user" ? (
                                        <div className="bg-blue-600 text-white rounded-2xl px-4 py-2.5">
                                            <p className="text-sm">{message.content}</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {/* Thinking Steps */}
                                            {message.thinking && message.thinking.length > 0 && (
                                                <div className="space-y-2">
                                                    {message.thinking.map((step, stepIndex) => (
                                                        <ThinkingStepComponent
                                                            key={step.id}
                                                            step={step}
                                                            index={stepIndex}
                                                            isLast={stepIndex === message.thinking!.length - 1}
                                                        />
                                                    ))}
                                                </div>
                                            )}

                                            {/* Streamed or Final Content */}
                                            {(message.streamedContent || message.content) && (
                                                <div className="bg-white border border-gray-200 rounded-lg px-4 py-3">
                                                    <div className="prose prose-sm max-w-none">
                                                        <p className="text-sm text-gray-800 whitespace-pre-wrap">
                                                            {message.streamedContent || message.content}
                                                            {message.streamedContent && (
                                                                <motion.span
                                                                    animate={{ opacity: [1, 0] }}
                                                                    transition={{ duration: 0.8, repeat: Infinity }}
                                                                    className="inline-block w-1 h-4 bg-blue-500 ml-1"
                                                                />
                                                            )}
                                                        </p>
                                                    </div>

                                                    {message.suggestions && message.suggestions.length > 0 && !message.streamedContent && (
                                                        <div className="mt-4 space-y-2">
                                                            {message.suggestions.map((suggestion, index) => (
                                                                <motion.button
                                                                    key={index}
                                                                    initial={{ opacity: 0, x: -10 }}
                                                                    animate={{ opacity: 1, x: 0 }}
                                                                    transition={{ delay: index * 0.1 }}
                                                                    onClick={() => handleSuggestionClick(suggestion)}
                                                                    className="block w-full text-left text-xs px-3 py-2 bg-white text-gray-700 rounded-lg border border-gray-300 hover:bg-gray-50 hover:border-gray-400 transition-colors"
                                                                >
                                                                    {suggestion}
                                                                </motion.button>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        ))}
                    </div>

                    {/* Input */}
                    <div className="p-4 border-t border-gray-200 bg-gray-50">
                        <div className="flex space-x-2">
                            <Input
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyPress={(e) => e.key === "Enter" && handleSend()}
                                placeholder="Plan, search, build anything..."
                                className="flex-1 bg-white border-gray-300 text-gray-900 placeholder:text-gray-400"
                            />
                            <Button
                                onClick={handleSend}
                                size="icon"
                                className="bg-blue-600 hover:bg-blue-700"
                                disabled={!input.trim()}
                            >
                                <Send className="h-4 w-4" />
                            </Button>
                        </div>
                        <div className="flex items-center justify-between mt-2">
                            <p className="text-xs text-gray-500">
                                <Sparkles className="h-3 w-3 inline mr-1" />
                                Agent • {selectedModel}
                            </p>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

// Thinking Step Component
function ThinkingStepComponent({
                                   step,
                                   index,
                                   isLast
                               }: {
    step: ThinkingStep;
    index: number;
    isLast: boolean;
}) {
    const [isExpanded, setIsExpanded] = useState(false);

    return (
        <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.15 }}
            className="bg-white border border-gray-200 rounded-lg overflow-hidden"
        >
            <div
                className="p-3 cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="flex items-start space-x-3">
                    <div className="mt-0.5">
                        {step.status === "active" ? (
                            <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                            >
                                <Loader2 className="h-4 w-4 text-blue-500" />
                            </motion.div>
                        ) : step.status === "completed" ? (
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                        ) : (
                            <Circle className="h-4 w-4 text-gray-400" />
                        )}
                    </div>
                    <div className="flex-1">
                        <div className="flex items-center justify-between">
                            <p className="text-sm text-gray-900">{step.title}</p>
                            {(step.details || step.files) && (
                                <motion.div
                                    animate={{ rotate: isExpanded ? 180 : 0 }}
                                    transition={{ duration: 0.2 }}
                                >
                                    <ChevronDown className="h-4 w-4 text-gray-500" />
                                </motion.div>
                            )}
                        </div>
                        {step.description && (
                            <p className="text-xs text-gray-600 mt-1">{step.description}</p>
                        )}
                    </div>
                </div>
            </div>

            {/* Expanded Details */}
            <AnimatePresence>
                {isExpanded && (step.details || step.files) && (
                    <motion.div
                        key="step-details"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden border-t border-gray-200"
                    >
                        <div className="px-3 py-2 bg-gray-50">
                            {step.files && step.files.length > 0 && (
                                <div className="space-y-1.5 mb-2">
                                    {step.files.map((file, fileIndex) => (
                                        <motion.div
                                            key={fileIndex}
                                            initial={{ opacity: 0, y: -5 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: fileIndex * 0.05 }}
                                            className="flex items-center justify-between p-2 bg-gray-100 rounded hover:bg-gray-200 transition-colors group"
                                        >
                                            <div className="flex items-center space-x-2">
                                                <FileCode className="h-3.5 w-3.5 text-blue-600" />
                                                <span className="text-xs text-gray-700">{file.name}</span>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <span className="text-xs text-green-600">{file.changes}</span>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-6 px-2 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                    Open
                                                </Button>
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            )}

                            {step.details && step.details.length > 0 && (
                                <ul className="space-y-1">
                                    {step.details.map((detail, detailIndex) => (
                                        <motion.li
                                            key={detailIndex}
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: detailIndex * 0.05 }}
                                            className="text-xs text-gray-600 flex items-start space-x-2"
                                        >
                                            <ChevronRight className="h-3 w-3 mt-0.5 text-gray-400 flex-shrink-0" />
                                            <span>{detail}</span>
                                        </motion.li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}
