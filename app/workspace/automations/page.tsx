"use client"

import { useState } from "react";
import { motion } from "motion/react";
import { Card } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Switch } from "../../components/ui/switch";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "../../components/ui/dialog";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "../../components/ui/select";
import {
    Zap,
    Plus,
    Mail,
    UserPlus,
    CheckCircle,
    Settings,
    Play,
    Pause,
    Wrench,
} from "lucide-react";
import { AutomationBuilder } from "../../components/automations/AutomationBuilder";

const templates = [
    {
        id: 1,
        name: "Client Onboarding",
        description: "Automatically send welcome emails and create initial tasks when a new client is added",
        icon: UserPlus,
        color: "blue",
        triggers: ["New client added"],
        actions: [
            "Send welcome email",
            "Create onboarding checklist",
            "Schedule kickoff meeting",
            "Assign account manager",
        ],
        popular: true,
    },
    {
        id: 2,
        name: "Invoice Reminders",
        description: "Send automated payment reminders for overdue invoices at scheduled intervals",
        icon: Mail,
        color: "green",
        triggers: ["Invoice overdue"],
        actions: [
            "Send first reminder (3 days overdue)",
            "Send second reminder (7 days overdue)",
            "Send final notice (14 days overdue)",
            "Notify account manager",
        ],
        popular: true,
    },
    {
        id: 3,
        name: "Project Closure",
        description: "Streamline project completion with automated final deliverables and feedback requests",
        icon: CheckCircle,
        color: "purple",
        triggers: ["All tasks completed"],
        actions: [
            "Send final invoice",
            "Request client feedback",
            "Archive project files",
            "Generate project report",
        ],
        popular: true,
    },
];

const myAutomations = [
    {
        id: 1,
        name: "TechCorp Onboarding Flow",
        template: "Client Onboarding",
        status: "active",
        runsToday: 2,
        successRate: 100,
        lastRun: "2 hours ago",
    },
    {
        id: 2,
        name: "Monthly Invoice Reminders",
        template: "Invoice Reminders",
        status: "active",
        runsToday: 5,
        successRate: 95,
        lastRun: "30 minutes ago",
    },
    {
        id: 3,
        name: "Q4 Project Closures",
        template: "Project Closure",
        status: "paused",
        runsToday: 0,
        successRate: 100,
        lastRun: "3 days ago",
    },
];

const fadeInUp = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
};

export default function Automations() {
    const [selectedTemplate, setSelectedTemplate] = useState<number | null>(null);
    const [automations, setAutomations] = useState(myAutomations);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [showBuilder, setShowBuilder] = useState(false);

    const toggleAutomation = (id: number) => {
        setAutomations((prev) =>
            prev.map((auto) =>
                auto.id === id
                    ? {
                        ...auto,
                        status: auto.status === "active" ? "paused" : "active",
                    }
                    : auto
            )
        );
    };

    if (showBuilder) {
        return (
            <div className="h-screen flex flex-col">
                <AutomationBuilder
                    onSave={(nodes) => {
                        console.log("Saved automation:", nodes);
                        setShowBuilder(false);
                    }}
                    onClose={() => setShowBuilder(false)}
                />
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl text-gray-900">Automations</h1>
                    <p className="text-gray-600 mt-1">
                        Automate repetitive tasks and streamline your workflow
                    </p>
                </div>
                <div className="flex items-center space-x-2">
                    <Button variant="outline" onClick={() => setShowBuilder(true)}>
                        <Wrench className="h-4 w-4 mr-2" />
                        Automation Builder
                    </Button>
                    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                        <DialogTrigger asChild>
                            <Button>
                                <Plus className="h-4 w-4 mr-2" />
                                Create Automation
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                            <DialogHeader>
                                <DialogTitle>Create New Automation</DialogTitle>
                                <DialogDescription>
                                    Choose a template or create a custom automation from scratch
                                </DialogDescription>
                            </DialogHeader>

                            <div className="space-y-6 mt-4">
                                <div>
                                    <Label>Automation Name</Label>
                                    <Input placeholder="e.g., Weekly Status Updates" className="mt-2" />
                                </div>

                                <div>
                                    <Label>Select Template</Label>
                                    <Select onValueChange={(value) => setSelectedTemplate(Number(value))}>
                                        <SelectTrigger className="mt-2">
                                            <SelectValue placeholder="Choose a template" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {templates.map((template) => (
                                                <SelectItem key={template.id} value={template.id.toString()}>
                                                    {template.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div>
                                    <Label>Description</Label>
                                    <Textarea
                                        placeholder="Describe what this automation does..."
                                        className="mt-2"
                                        rows={3}
                                    />
                                </div>

                                <div>
                                    <Label>Trigger</Label>
                                    <Select>
                                        <SelectTrigger className="mt-2">
                                            <SelectValue placeholder="Select trigger" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="new-client">New client added</SelectItem>
                                            <SelectItem value="invoice-overdue">Invoice overdue</SelectItem>
                                            <SelectItem value="task-complete">All tasks completed</SelectItem>
                                            <SelectItem value="manual">Manual trigger</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="flex justify-end space-x-3 pt-4">
                                    <Button variant="outline" onClick={() => setDialogOpen(false)}>
                                        Cancel
                                    </Button>
                                    <Button onClick={() => setDialogOpen(false)}>
                                        Create Automation
                                    </Button>
                                </div>
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            {/* Templates */}
            <div>
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl text-gray-900">Automation Templates</h2>
                    <Badge variant="outline">3 Templates</Badge>
                </div>

                <motion.div
                    initial="hidden"
                    animate="visible"
                    variants={{
                        visible: {
                            transition: {
                                staggerChildren: 0.1,
                            },
                        },
                    }}
                    className="grid gap-6 md:grid-cols-2 lg:grid-cols-3"
                >
                    {templates.map((template) => (
                        <motion.div key={template.id} variants={fadeInUp}>
                            <Card className="p-6 h-full hover:shadow-lg transition-all duration-300">
                                <div className="flex items-start justify-between mb-4">
                                    <div
                                        className={`p-3 rounded-lg ${
                                            template.color === "blue"
                                                ? "bg-blue-100"
                                                : template.color === "green"
                                                    ? "bg-green-100"
                                                    : "bg-purple-100"
                                        }`}
                                    >
                                        <template.icon
                                            className={`h-6 w-6 ${
                                                template.color === "blue"
                                                    ? "text-blue-600"
                                                    : template.color === "green"
                                                        ? "text-green-600"
                                                        : "text-purple-600"
                                            }`}
                                        />
                                    </div>
                                    {template.popular && (
                                        <Badge className="bg-orange-100 text-orange-700">Popular</Badge>
                                    )}
                                </div>

                                <h3 className="text-lg text-gray-900 mb-2">{template.name}</h3>
                                <p className="text-sm text-gray-600 mb-4">{template.description}</p>

                                <div className="space-y-3 mb-4">
                                    <div>
                                        <p className="text-xs text-gray-500 mb-2">TRIGGERS</p>
                                        <div className="space-y-1">
                                            {template.triggers.map((trigger, index) => (
                                                <p key={index} className="text-sm text-gray-700">
                                                    • {trigger}
                                                </p>
                                            ))}
                                        </div>
                                    </div>

                                    <div>
                                        <p className="text-xs text-gray-500 mb-2">ACTIONS</p>
                                        <div className="space-y-1">
                                            {template.actions.slice(0, 3).map((action, index) => (
                                                <p key={index} className="text-sm text-gray-700">
                                                    • {action}
                                                </p>
                                            ))}
                                            {template.actions.length > 3 && (
                                                <p className="text-sm text-gray-500">
                                                    +{template.actions.length - 3} more
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <Button className="w-full" onClick={() => setDialogOpen(true)}>
                                    <Plus className="h-4 w-4 mr-2" />
                                    Use Template
                                </Button>
                            </Card>
                        </motion.div>
                    ))}
                </motion.div>
            </div>

            {/* My Automations */}
            <div>
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl text-gray-900">My Automations</h2>
                    <Badge variant="outline">{automations.length} Active</Badge>
                </div>

                <div className="space-y-4">
                    {automations.map((automation) => (
                        <Card key={automation.id} className="p-6">
                            <div className="flex items-start justify-between">
                                <div className="flex items-start space-x-4 flex-1">
                                    <div className="bg-blue-100 p-3 rounded-lg">
                                        <Zap className="h-5 w-5 text-blue-600" />
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center space-x-3 mb-2">
                                            <h3 className="text-lg text-gray-900">{automation.name}</h3>
                                            <Badge
                                                className={
                                                    automation.status === "active"
                                                        ? "bg-green-100 text-green-700"
                                                        : "bg-gray-100 text-gray-700"
                                                }
                                            >
                                                {automation.status}
                                            </Badge>
                                        </div>
                                        <p className="text-sm text-gray-600 mb-4">
                                            Template: {automation.template}
                                        </p>

                                        <div className="grid grid-cols-3 gap-4">
                                            <div>
                                                <p className="text-sm text-gray-500">Runs Today</p>
                                                <p className="text-lg text-gray-900">{automation.runsToday}</p>
                                            </div>
                                            <div>
                                                <p className="text-sm text-gray-500">Success Rate</p>
                                                <p className="text-lg text-gray-900">
                                                    {automation.successRate}%
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-sm text-gray-500">Last Run</p>
                                                <p className="text-sm text-gray-900">{automation.lastRun}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center space-x-3">
                                    <div className="flex items-center space-x-2">
                                        <Switch
                                            checked={automation.status === "active"}
                                            onCheckedChange={() => toggleAutomation(automation.id)}
                                        />
                                        <span className="text-sm text-gray-600">
                      {automation.status === "active" ? (
                          <Play className="h-4 w-4" />
                      ) : (
                          <Pause className="h-4 w-4" />
                      )}
                    </span>
                                    </div>
                                    <Button variant="outline" size="icon">
                                        <Settings className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            </div>
        </div>
    );
}