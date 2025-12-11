"use client"

import {useEffect, useState} from "react";
import { Card } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Progress } from "../../components/ui/progress";
import { Input } from "../../components/ui/input";
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "../../components/ui/select";
import { Plus, Search, Clock, TrendingUp, AlertCircle, CheckCircle } from "lucide-react";
import { ProjectDetailView } from "@/app/components/projects/ProjectDetailView";
import axios from "axios";
import {clients} from "@/types/clients";
import { projectsMockData } from '@/app/lib/mockData'
import {taskPercentage} from "@/app/lib/taskPercentage";

export default function Projects() {
    const [searchQuery, setSearchQuery] = useState("");
    const [dialogOpen, setDialogOpen] = useState(false);
    const [activeTab, setActiveTab] = useState("all");
    const [projectsData, setProjectsData] = useState(projectsMockData);
    const [projectName, setProjectName] = useState("");
    const [client, setClient] = useState("");
    const [dueDate, setDueDate] = useState("");
    const [priority, setPriority] = useState("");
    const [selectedProject, setSelectedProject] = useState<typeof projectsMockData[0] | null>(null);
    const [clients, setClients] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const getClients = async () => {
            const res = await axios.get("/api/clients")
                setClients(res.data);
        }

        getClients();
    }, [])

    useEffect(() => {
        const fetchProjects = async () => {
            const res = await axios.get("/api/projects");
            if (res.status === 200) setLoading(false);
            setProjectsData(res.data);
        };
        fetchProjects();
    }, []);

    const filteredProjects = projectsData
        .filter((project) => {
            const matchesSearch = project.name
                .toLowerCase()
                .includes(searchQuery.toLowerCase());
            const matchesTab =
                activeTab === "all" ||
                (activeTab === "active" && project.status !== "completed") ||
                (activeTab === "completed" && project.status === "completed");
            return matchesSearch && matchesTab;
        });

    function handleTaskUpdate(
        projectId: number,
        updatedCompleted: number,
        updatedTotal: number
    ) {
        setProjectsData(prev =>
            prev.map(p => {
                if (p.id !== projectId) return p;

                const isCompleted =
                    updatedTotal > 0 && updatedCompleted === updatedTotal;

                return {
                    ...p,
                    tasksCompleted: updatedCompleted,
                    totalTasks: updatedTotal,
                    status: isCompleted ? "completed" : "in-progress",
                    health: isCompleted ? "completed" : "on-track"
                };
            })
        );
    }

    const handleDeleteProject = (projectId: number) => {
        setProjectsData(prev => prev.filter(p => p.id !== projectId));
        setSelectedProject(null); // go back to list
    };

    // If a project is selected, show the detail view
    if (selectedProject) {
        return (
            <div className="p-6">
                <ProjectDetailView
                    project={selectedProject}
                    onBack={() => setSelectedProject(null)}
                    onDelete={handleDeleteProject}
                    onTaskUpdate={handleTaskUpdate}
                />
            </div>
        );
    }

    function formatDate(dateStr: string) {
        const [year, month, day] = dateStr.split("-");
        return new Date(Number(year), Number(month) - 1, Number(day)).toLocaleDateString(
            "en-US",
            {
                month: "short",
                day: "numeric",
                year: "numeric",
            }
        );
    }

    const handleCreateProject = async () => {
        const newProject = {
            id: projectsData.length + 1,
            name: projectName,
            client,
            status: "in-progress",
            progress: 0,
            dueDate: dueDate ? formatDate(dueDate) : "",
            tasksCompleted: 0,
            totalTasks: 0,
            priority,
            health: "on-track",
        };

        const res = await axios.post("/api/projects", newProject);
        setProjectsData(res.data);

        setProjectsData([...projectsData, newProject]);
        setDialogOpen(false);

        setProjectName("");
        setClient("");
        setDueDate("");
        setPriority("");
    };

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl text-gray-900">Projects</h1>
                    <p className="text-gray-600 mt-1">Track and manage all your projects</p>
                </div>
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogTrigger asChild>
                        <Button className="cursor-pointer">
                            <Plus className="h-4 w-4 mr-2" />
                            New Project
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>Create New Project</DialogTitle>
                            <DialogDescription>
                                Start a new project for your client
                            </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-4 mt-4">
                            <div>
                                <Label>Project Name</Label>
                                <Input
                                    placeholder="Website Redesign"
                                    className="mt-2"
                                    value={projectName}
                                    onChange={(e) => setProjectName(e.target.value)}
                                />
                            </div>
                            <div>
                                <Label>Client</Label>
                                <Select onValueChange={setClient}>
                                    <SelectTrigger className="mt-2 cursor-pointer">
                                        <SelectValue placeholder="Select client" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {
                                            clients.map((client: clients) => (
                                                <SelectItem key={client.id} value={client.name}>
                                                    {client.name}
                                                </SelectItem>
                                            ))
                                        }
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label>Due Date</Label>
                                <Input
                                    type="date"
                                    className="mt-2"
                                    value={dueDate}
                                    onChange={(e) => setDueDate(e.target.value)}
                                />
                            </div>
                            <div>
                                <Label>Priority</Label>
                                <Select onValueChange={setPriority}>
                                    <SelectTrigger className="mt-2 cursor-pointer">
                                        <SelectValue placeholder="Select priority" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="high">High</SelectItem>
                                        <SelectItem value="medium">Medium</SelectItem>
                                        <SelectItem value="low">Low</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="flex justify-end space-x-3 pt-4">
                                <Button className="cursor-pointer" variant="outline" onClick={() => setDialogOpen(false)}>
                                    Cancel
                                </Button>
                                <Button className="cursor-pointer" onClick={handleCreateProject}>
                                    Create Project
                                </Button>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            {
                loading ? (
                        <div className="p-6">
                            <p className="text-gray-500">Loading tasks...</p>
                        </div>
                    ) :
                    (<>
            {/* Search */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                    placeholder="Search projects..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                />
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList>
                    <TabsTrigger className="cursor-pointer" value="all">
                        All Projects ({projectsData.length})
                    </TabsTrigger>

                    <TabsTrigger className="cursor-pointer" value="active">
                        Active ({projectsData.filter((p) => p.status !== "completed").length})
                    </TabsTrigger>

                    <TabsTrigger className="cursor-pointer" value="completed">
                        Completed ({projectsData.filter((p) => p.status === "completed").length})
                    </TabsTrigger>
                </TabsList>


                <TabsContent value={activeTab} className="mt-6">
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {filteredProjects.map((project) => (
                            <Card
                                key={project.id}
                                className="p-6 hover:shadow-lg transition-shadow cursor-pointer"
                                onClick={() => setSelectedProject(project)}
                            >
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex-1">
                                        <h3 className="text-lg text-gray-900 mb-1">{project.name}</h3>
                                        <p className="text-sm text-gray-600">{project.client}</p>
                                    </div>
                                    <Badge
                                        variant="outline"
                                        className={
                                            project.health === "on-track"
                                                ? "border-green-200 text-green-700"
                                                : project.health === "at-risk"
                                                    ? "border-orange-200 text-orange-700"
                                                    : "border-blue-200 text-blue-700"
                                        }
                                    >
                                        {project.health === "on-track" && (
                                            <TrendingUp className="h-3 w-3 mr-1" />
                                        )}
                                        {project.health === "at-risk" && (
                                            <AlertCircle className="h-3 w-3 mr-1" />
                                        )}
                                        {project.health === "completed" && (
                                            <CheckCircle className="h-3 w-3 mr-1" />
                                        )}
                                        {project.health === "on-track"
                                            ? "On Track"
                                            : project.health === "at-risk"
                                                ? "At Risk"
                                                : "Completed"}
                                    </Badge>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-sm text-gray-600">Progress</span>
                                            <span className="text-sm text-gray-900">
                                                {taskPercentage({
                                                    completed: project.tasksCompleted,
                                                    total: project.totalTasks
                                                })}%
                                            </span>
                                        </div>
                                        <Progress value={taskPercentage({
                                            completed: project.tasksCompleted,
                                            total: project.totalTasks
                                        })}/>
                                    </div>

                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-gray-600">Tasks</span>
                                        <span className="text-gray-900">
                      {project.tasksCompleted}/{project.totalTasks}
                    </span>
                                    </div>

                                    <div className="flex items-center justify-between text-sm pt-4 border-t">
                                        <div className="flex items-center text-gray-600">
                                            <Clock className="h-4 w-4 mr-1" />
                                            Due {project.dueDate}
                                        </div>
                                        <Badge
                                            variant="outline"
                                            className={
                                                project.priority === "high"
                                                    ? "border-red-200 text-red-700"
                                                    : project.priority === "medium"
                                                        ? "border-yellow-200 text-yellow-700"
                                                        : "border-gray-200 text-gray-700"
                                            }
                                        >
                                            {project.priority}
                                        </Badge>
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </div>
                </TabsContent>
            </Tabs>
                    </>)}
        </div>
    )}