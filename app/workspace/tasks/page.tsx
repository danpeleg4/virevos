"use client"

import { useState } from "react";
import { Card } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Input } from "../../components/ui/input";
import { Checkbox } from "../../components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "../../components/ui/dialog";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "../../components/ui/select";
import { Plus, Search, Clock, Flag } from "lucide-react";
import { TaskDetailModal } from "../../components/tasks/TaskDetailModal";
import AddNewTask from "@/app/components/AddNewTask";

interface Task {
    id: number;
    title: string;
    project: string;
    priority: "high" | "medium" | "low";
    status: "todo" | "in-progress" | "completed";
    dueDate: string;
    assignee: string;
}

const initialTasks: Task[] = [
    {
        id: 1,
        title: "Review TechCorp wireframes",
        project: "TechCorp Website Redesign",
        priority: "high",
        status: "todo",
        dueDate: "Today",
        assignee: "You",
    },
    {
        id: 2,
        title: "Send invoice to DesignCo",
        project: "DesignCo Brand Refresh",
        priority: "high",
        status: "todo",
        dueDate: "Today",
        assignee: "You",
    },
    {
        id: 3,
        title: "Update project timeline",
        project: "TechCorp Website Redesign",
        priority: "medium",
        status: "in-progress",
        dueDate: "Tomorrow",
        assignee: "You",
    },
    {
        id: 4,
        title: "Client meeting with StartupXYZ",
        project: "StartupXYZ MVP Development",
        priority: "high",
        status: "in-progress",
        dueDate: "Tomorrow",
        assignee: "Team",
    },
    {
        id: 5,
        title: "Design mockups review",
        project: "DesignCo Brand Refresh",
        priority: "medium",
        status: "completed",
        dueDate: "Yesterday",
        assignee: "You",
    },
    {
        id: 6,
        title: "Testing phase completion",
        project: "StartupXYZ MVP Development",
        priority: "low",
        status: "completed",
        dueDate: "2 days ago",
        assignee: "Team",
    },
];

export default function Tasks() {
    const [tasks, setTasks] = useState<Task[]>(initialTasks);
    const [searchQuery, setSearchQuery] = useState("");
    const [activeTab, setActiveTab] = useState("all");
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const [taskDetailOpen, setTaskDetailOpen] = useState(false);

    const toggleTaskStatus = (taskId: number) => {
        setTasks((prev) =>
            prev.map((task) =>
                task.id === taskId
                    ? {
                        ...task,
                        status: task.status === "completed" ? "todo" : "completed",
                    }
                    : task
            )
        );
    };

    const handleTaskClick = (task: Task) => {
        setSelectedTask(task);
        setTaskDetailOpen(true);
    };

    const handleTaskUpdate = (updatedTask: Task) => {
        setTasks((prev) =>
            prev.map((task) => (task.id === updatedTask.id ? updatedTask : task))
        );
    };

    const filteredTasks = tasks.filter((task) => {
        const matchesSearch = task.title
            .toLowerCase()
            .includes(searchQuery.toLowerCase());
        const matchesTab =
            activeTab === "all" ||
            (activeTab === "todo" && task.status === "todo") ||
            (activeTab === "in-progress" && task.status === "in-progress") ||
            (activeTab === "completed" && task.status === "completed");
        return matchesSearch && matchesTab;
    });

    const taskCounts = {
        all: tasks.length,
        todo: tasks.filter((t) => t.status === "todo").length,
        inProgress: tasks.filter((t) => t.status === "in-progress").length,
        completed: tasks.filter((t) => t.status === "completed").length,
    };

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl text-gray-900">Tasks</h1>
                    <p className="text-gray-600 mt-1">Manage your tasks and to-dos</p>
                </div>
                <AddNewTask />
            </div>

            {/* Search */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                    placeholder="Search tasks..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                />
            </div>

            {/* Stats */}
            <div className="grid gap-6 sm:grid-cols-4">
                <Card className="p-6">
                    <p className="text-sm text-gray-600">Total Tasks</p>
                    <p className="text-3xl text-gray-900 mt-2">{taskCounts.all}</p>
                </Card>
                <Card className="p-6">
                    <p className="text-sm text-gray-600">To Do</p>
                    <p className="text-3xl text-gray-900 mt-2">{taskCounts.todo}</p>
                </Card>
                <Card className="p-6">
                    <p className="text-sm text-gray-600">In Progress</p>
                    <p className="text-3xl text-gray-900 mt-2">{taskCounts.inProgress}</p>
                </Card>
                <Card className="p-6">
                    <p className="text-sm text-gray-600">Completed</p>
                    <p className="text-3xl text-gray-900 mt-2">{taskCounts.completed}</p>
                </Card>
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList>
                    <TabsTrigger value="all">All ({taskCounts.all})</TabsTrigger>
                    <TabsTrigger value="todo">To Do ({taskCounts.todo})</TabsTrigger>
                    <TabsTrigger value="in-progress">
                        In Progress ({taskCounts.inProgress})
                    </TabsTrigger>
                    <TabsTrigger value="completed">
                        Completed ({taskCounts.completed})
                    </TabsTrigger>
                </TabsList>

                <TabsContent value={activeTab} className="mt-6">
                    <Card className="divide-y">
                        {filteredTasks.map((task) => (
                            <div
                                key={task.id}
                                className="p-4 hover:bg-gray-50 transition-colors cursor-pointer"
                                onClick={() => handleTaskClick(task)}
                            >
                                <div className="flex items-start space-x-4">
                                    <Checkbox
                                        checked={task.status === "completed"}
                                        onCheckedChange={() => toggleTaskStatus(task.id)}
                                        className="mt-1"
                                        onClick={(e) => e.stopPropagation()}
                                    />
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-start justify-between mb-2">
                                            <div className="flex-1">
                                                <h3
                                                    className={`text-gray-900 ${
                                                        task.status === "completed"
                                                            ? "line-through text-gray-500"
                                                            : ""
                                                    }`}
                                                >
                                                    {task.title}
                                                </h3>
                                                <p className="text-sm text-gray-600 mt-1">
                                                    {task.project}
                                                </p>
                                            </div>
                                            <div className="flex items-center space-x-2 ml-4">
                                                <Badge
                                                    variant="outline"
                                                    className={
                                                        task.priority === "high"
                                                            ? "border-red-200 text-red-700"
                                                            : task.priority === "medium"
                                                                ? "border-yellow-200 text-yellow-700"
                                                                : "border-gray-200 text-gray-700"
                                                    }
                                                >
                                                    <Flag className="h-3 w-3 mr-1" />
                                                    {task.priority}
                                                </Badge>
                                                <Badge
                                                    className={
                                                        task.status === "completed"
                                                            ? "bg-green-100 text-green-700"
                                                            : task.status === "in-progress"
                                                                ? "bg-blue-100 text-blue-700"
                                                                : "bg-gray-100 text-gray-700"
                                                    }
                                                >
                                                    {task.status === "in-progress"
                                                        ? "In Progress"
                                                        : task.status === "completed"
                                                            ? "Completed"
                                                            : "To Do"}
                                                </Badge>
                                            </div>
                                        </div>
                                        <div className="flex items-center space-x-4 text-sm text-gray-500">
                                            <div className="flex items-center">
                                                <Clock className="h-4 w-4 mr-1" />
                                                {task.dueDate}
                                            </div>
                                            <span>•</span>
                                            <span>{task.assignee}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}

                        {filteredTasks.length === 0 && (
                            <div className="p-12 text-center">
                                <p className="text-gray-500">No tasks found</p>
                            </div>
                        )}
                    </Card>
                </TabsContent>
            </Tabs>

            {/* Task Detail Modal */}
            <TaskDetailModal
                task={selectedTask}
                open={taskDetailOpen}
                onOpenChange={setTaskDetailOpen}
                onUpdate={handleTaskUpdate}
            />
        </div>
    );
}