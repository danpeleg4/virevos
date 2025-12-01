import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Badge } from "../ui/badge";
import { Label } from "../ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import {
  Zap,
  Plus,
  Mail,
  MessageSquare,
  CheckCircle,
  Clock,
  Filter,
  AlertCircle,
  X,
  GripVertical,
  Play,
  Save,
} from "lucide-react";
import { motion } from "motion/react";

interface AutomationNode {
  id: string;
  type: "trigger" | "condition" | "action" | "delay";
  name: string;
  icon: any;
  config: Record<string, any>;
}

const availableBlocks = [
  {
    type: "trigger",
    items: [
      { id: "new-client", name: "New Client Added", icon: Plus },
      { id: "task-complete", name: "Task Completed", icon: CheckCircle },
      { id: "invoice-overdue", name: "Invoice Overdue", icon: AlertCircle },
      { id: "project-start", name: "Project Started", icon: Play },
    ],
  },
  {
    type: "condition",
    items: [
      { id: "if-status", name: "If Status Equals", icon: Filter },
      { id: "if-amount", name: "If Amount Greater Than", icon: Filter },
      { id: "if-date", name: "If Date Is", icon: Clock },
    ],
  },
  {
    type: "action",
    items: [
      { id: "send-email", name: "Send Email", icon: Mail },
      { id: "send-message", name: "Send Message", icon: MessageSquare },
      { id: "create-task", name: "Create Task", icon: Plus },
      { id: "update-status", name: "Update Status", icon: CheckCircle },
    ],
  },
  {
    type: "delay",
    items: [
      { id: "wait-hours", name: "Wait (Hours)", icon: Clock },
      { id: "wait-days", name: "Wait (Days)", icon: Clock },
    ],
  },
];

interface AutomationBuilderProps {
  onSave?: (nodes: AutomationNode[]) => void;
  onClose?: () => void;
}

export function AutomationBuilder({ onSave, onClose }: AutomationBuilderProps) {
  const [nodes, setNodes] = useState<AutomationNode[]>([]);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [automationName, setAutomationName] = useState("New Automation");

  const addNode = (blockId: string, blockName: string, blockType: string, icon: any) => {
    const newNode: AutomationNode = {
      id: `node-${Date.now()}`,
      type: blockType as any,
      name: blockName,
      icon,
      config: {},
    };
    setNodes([...nodes, newNode]);
    setSelectedNode(newNode.id);
  };

  const removeNode = (nodeId: string) => {
    setNodes(nodes.filter((node) => node.id !== nodeId));
    if (selectedNode === nodeId) {
      setSelectedNode(null);
    }
  };

  const updateNodeConfig = (nodeId: string, config: Record<string, any>) => {
    setNodes(
      nodes.map((node) =>
        node.id === nodeId ? { ...node, config: { ...node.config, ...config } } : node
      )
    );
  };

  const getNodeColor = (type: string) => {
    switch (type) {
      case "trigger":
        return "bg-purple-100 border-purple-500 text-purple-700";
      case "condition":
        return "bg-yellow-100 border-yellow-500 text-yellow-700";
      case "action":
        return "bg-blue-100 border-blue-500 text-blue-700";
      case "delay":
        return "bg-gray-100 border-gray-500 text-gray-700";
      default:
        return "bg-gray-100 border-gray-500 text-gray-700";
    }
  };

  const renderNodeConfig = (node: AutomationNode) => {
    switch (node.id.split("-")[0]) {
      case "send":
        if (node.id.includes("email")) {
          return (
            <div className="space-y-3">
              <div>
                <Label>To</Label>
                <Input
                  placeholder="client@example.com"
                  value={node.config.to || ""}
                  onChange={(e) =>
                    updateNodeConfig(node.id, { to: e.target.value })
                  }
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Subject</Label>
                <Input
                  placeholder="Email subject..."
                  value={node.config.subject || ""}
                  onChange={(e) =>
                    updateNodeConfig(node.id, { subject: e.target.value })
                  }
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Template</Label>
                <Select
                  value={node.config.template || ""}
                  onValueChange={(value) =>
                    updateNodeConfig(node.id, { template: value })
                  }
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select template" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="welcome">Welcome Email</SelectItem>
                    <SelectItem value="reminder">Reminder Email</SelectItem>
                    <SelectItem value="thank-you">Thank You Email</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          );
        }
        return null;

      case "if":
        return (
          <div className="space-y-3">
            <div>
              <Label>Field</Label>
              <Select
                value={node.config.field || ""}
                onValueChange={(value) =>
                  updateNodeConfig(node.id, { field: value })
                }
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select field" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="status">Status</SelectItem>
                  <SelectItem value="amount">Amount</SelectItem>
                  <SelectItem value="priority">Priority</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Condition</Label>
              <Select
                value={node.config.condition || ""}
                onValueChange={(value) =>
                  updateNodeConfig(node.id, { condition: value })
                }
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select condition" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="equals">Equals</SelectItem>
                  <SelectItem value="greater">Greater than</SelectItem>
                  <SelectItem value="less">Less than</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Value</Label>
              <Input
                placeholder="Enter value..."
                value={node.config.value || ""}
                onChange={(e) =>
                  updateNodeConfig(node.id, { value: e.target.value })
                }
                className="mt-1"
              />
            </div>
          </div>
        );

      case "wait":
        return (
          <div className="space-y-3">
            <div>
              <Label>Duration</Label>
              <Input
                type="number"
                placeholder="Enter number..."
                value={node.config.duration || ""}
                onChange={(e) =>
                  updateNodeConfig(node.id, { duration: e.target.value })
                }
                className="mt-1"
              />
            </div>
            <div>
              <Label>Unit</Label>
              <Select
                value={node.config.unit || "hours"}
                onValueChange={(value) =>
                  updateNodeConfig(node.id, { unit: value })
                }
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hours">Hours</SelectItem>
                  <SelectItem value="days">Days</SelectItem>
                  <SelectItem value="weeks">Weeks</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );

      case "create":
        return (
          <div className="space-y-3">
            <div>
              <Label>Task Title</Label>
              <Input
                placeholder="Task name..."
                value={node.config.title || ""}
                onChange={(e) =>
                  updateNodeConfig(node.id, { title: e.target.value })
                }
                className="mt-1"
              />
            </div>
            <div>
              <Label>Assign To</Label>
              <Select
                value={node.config.assignee || ""}
                onValueChange={(value) =>
                  updateNodeConfig(node.id, { assignee: value })
                }
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select assignee" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="me">Me</SelectItem>
                  <SelectItem value="team">Team</SelectItem>
                  <SelectItem value="client">Client</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );

      default:
        return <p className="text-sm text-gray-600">No configuration needed</p>;
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex-1 max-w-md">
            <Input
              value={automationName}
              onChange={(e) => setAutomationName(e.target.value)}
              className="text-xl"
            />
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={() => onSave?.(nodes)}>
              <Save className="h-4 w-4 mr-2" />
              Save Automation
            </Button>
          </div>
        </div>
        <p className="text-sm text-gray-600">
          Drag and drop blocks to build your automation workflow
        </p>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Blocks Palette */}
        <div className="w-64 border-r border-gray-200 bg-gray-50 overflow-y-auto">
          <div className="p-4 space-y-6">
            {availableBlocks.map((category) => (
              <div key={category.type}>
                <h3 className="text-xs text-gray-600 uppercase mb-3">
                  {category.type}s
                </h3>
                <div className="space-y-2">
                  {category.items.map((item) => (
                    <button
                      key={item.id}
                      onClick={() =>
                        addNode(item.id, item.name, category.type, item.icon)
                      }
                      className="w-full p-3 text-left rounded-lg border-2 border-dashed border-gray-300 hover:border-blue-400 hover:bg-white transition-all"
                    >
                      <div className="flex items-center space-x-2">
                        <item.icon className="h-4 w-4 text-gray-600" />
                        <span className="text-sm text-gray-900">{item.name}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Canvas */}
        <div className="flex-1 flex">
          {/* Flow Builder */}
          <div className="flex-1 p-8 overflow-y-auto bg-gray-50">
            {nodes.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center max-w-md">
                  <Zap className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg text-gray-900 mb-2">
                    Start Building Your Automation
                  </h3>
                  <p className="text-sm text-gray-600">
                    Select blocks from the left panel to create your workflow.
                    Start with a trigger, then add conditions and actions.
                  </p>
                </div>
              </div>
            ) : (
              <div className="max-w-2xl mx-auto space-y-4">
                {nodes.map((node, index) => (
                  <div key={node.id}>
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`relative border-2 rounded-lg p-4 cursor-pointer transition-all ${
                        selectedNode === node.id
                          ? "ring-2 ring-blue-500"
                          : ""
                      } ${getNodeColor(node.type)}`}
                      onClick={() => setSelectedNode(node.id)}
                    >
                      <div className="flex items-start space-x-3">
                        <GripVertical className="h-5 w-5 text-gray-400 flex-shrink-0 mt-0.5" />
                        <node.icon className="h-5 w-5 flex-shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <div>
                              <Badge
                                variant="outline"
                                className="text-xs mb-1"
                              >
                                {node.type}
                              </Badge>
                              <h4 className="text-sm">{node.name}</h4>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={(e) => {
                                e.stopPropagation();
                                removeNode(node.id);
                              }}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                          {Object.keys(node.config).length > 0 && (
                            <div className="mt-2 text-xs opacity-75">
                              {Object.entries(node.config).map(([key, value]) => (
                                <div key={key}>
                                  {key}: {value}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>

                    {/* Connector Line */}
                    {index < nodes.length - 1 && (
                      <div className="flex justify-center py-2">
                        <div className="w-0.5 h-6 bg-gray-300" />
                      </div>
                    )}
                  </div>
                ))}

                <button
                  className="w-full p-4 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-400 hover:text-blue-600 transition-colors"
                  onClick={() => {}}
                >
                  <Plus className="h-5 w-5 mx-auto mb-1" />
                  <span className="text-sm">Add Step</span>
                </button>
              </div>
            )}
          </div>

          {/* Configuration Panel */}
          <div className="w-80 border-l border-gray-200 bg-white overflow-y-auto">
            {selectedNode && nodes.find((n) => n.id === selectedNode) ? (
              <div className="p-6">
                <h3 className="text-lg text-gray-900 mb-4">
                  Configure Step
                </h3>
                <div className="mb-4">
                  <Badge className={getNodeColor(nodes.find((n) => n.id === selectedNode)!.type)}>
                    {nodes.find((n) => n.id === selectedNode)!.type}
                  </Badge>
                </div>
                <h4 className="text-sm text-gray-900 mb-4">
                  {nodes.find((n) => n.id === selectedNode)!.name}
                </h4>
                {renderNodeConfig(nodes.find((n) => n.id === selectedNode)!)}
              </div>
            ) : (
              <div className="p-6 text-center">
                <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-sm text-gray-600">
                  Select a step to configure its settings
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
