import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Progress } from "../ui/progress";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { Checkbox } from "../ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Avatar, AvatarFallback } from "../ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import {
  ArrowLeft,
  Calendar,
  Clock,
  Users,
  FileText,
  Upload,
  Plus,
  CheckCircle,
  Circle,
  Edit,
  Trash2,
  Tag,
  Download,
  MoreVertical,
  Paperclip,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { motion } from "motion/react";

interface ProjectStage {
  id: string;
  name: string;
  status: "completed" | "in-progress" | "pending";
  startDate: string;
  endDate: string;
  progress: number;
  tasks: number;
  completedTasks: number;
}

interface ProjectTask {
  id: string;
  title: string;
  completed: boolean;
  assignee?: string;
  dueDate?: string;
  priority: "high" | "medium" | "low";
}

interface ProjectFile {
  id: string;
  name: string;
  size: string;
  uploadedBy: string;
  uploadedAt: string;
  type: string;
}

interface ProjectNote {
  id: string;
  content: string;
  author: string;
  createdAt: string;
}

interface ProjectDetailViewProps {
  project: {
    id: number;
    name: string;
    client: string;
    status: string;
    progress: number;
    dueDate: string;
    priority: string;
  };
  onBack: () => void;
}

const mockStages: ProjectStage[] = [
  {
    id: "1",
    name: "Discovery & Planning",
    status: "completed",
    startDate: "Oct 15, 2025",
    endDate: "Oct 25, 2025",
    progress: 100,
    tasks: 8,
    completedTasks: 8,
  },
  {
    id: "2",
    name: "Design & Mockups",
    status: "completed",
    startDate: "Oct 26, 2025",
    endDate: "Nov 5, 2025",
    progress: 100,
    tasks: 12,
    completedTasks: 12,
  },
  {
    id: "3",
    name: "Development",
    status: "in-progress",
    startDate: "Nov 6, 2025",
    endDate: "Nov 20, 2025",
    progress: 65,
    tasks: 20,
    completedTasks: 13,
  },
  {
    id: "4",
    name: "Testing & QA",
    status: "pending",
    startDate: "Nov 21, 2025",
    endDate: "Nov 28, 2025",
    progress: 0,
    tasks: 10,
    completedTasks: 0,
  },
  {
    id: "5",
    name: "Launch & Deployment",
    status: "pending",
    startDate: "Nov 29, 2025",
    endDate: "Dec 3, 2025",
    progress: 0,
    tasks: 5,
    completedTasks: 0,
  },
];

const mockTasks: ProjectTask[] = [
  {
    id: "1",
    title: "Build responsive navigation component",
    completed: true,
    assignee: "JD",
    dueDate: "Nov 8, 2025",
    priority: "high",
  },
  {
    id: "2",
    title: "Implement user authentication flow",
    completed: true,
    assignee: "SJ",
    dueDate: "Nov 10, 2025",
    priority: "high",
  },
  {
    id: "3",
    title: "Create dashboard analytics widgets",
    completed: false,
    assignee: "MC",
    dueDate: "Nov 15, 2025",
    priority: "medium",
  },
  {
    id: "4",
    title: "Integrate payment gateway",
    completed: false,
    assignee: "JD",
    dueDate: "Nov 18, 2025",
    priority: "high",
  },
  {
    id: "5",
    title: "Setup email notification system",
    completed: false,
    dueDate: "Nov 20, 2025",
    priority: "low",
  },
];

const mockFiles: ProjectFile[] = [
  {
    id: "1",
    name: "Design_Mockups_v3.fig",
    size: "12.4 MB",
    uploadedBy: "Sarah Johnson",
    uploadedAt: "Nov 5, 2025",
    type: "figma",
  },
  {
    id: "2",
    name: "Project_Requirements.pdf",
    size: "2.1 MB",
    uploadedBy: "John Doe",
    uploadedAt: "Oct 20, 2025",
    type: "pdf",
  },
  {
    id: "3",
    name: "Brand_Assets.zip",
    size: "45.8 MB",
    uploadedBy: "Client",
    uploadedAt: "Oct 18, 2025",
    type: "zip",
  },
];

const mockNotes: ProjectNote[] = [
  {
    id: "1",
    content: "Client requested to change the primary color scheme from blue to green. Updated design files accordingly.",
    author: "Sarah Johnson",
    createdAt: "Nov 8, 2025",
  },
  {
    id: "2",
    content: "Meeting with stakeholders went well. They approved the new dashboard layout. Next step: start development.",
    author: "John Doe",
    createdAt: "Nov 6, 2025",
  },
];

export function ProjectDetailView({ project, onBack }: ProjectDetailViewProps) {
  const [stages] = useState<ProjectStage[]>(mockStages);
  const [tasks, setTasks] = useState<ProjectTask[]>(mockTasks);
  const [files] = useState<ProjectFile[]>(mockFiles);
  const [notes, setNotes] = useState<ProjectNote[]>(mockNotes);
  const [newNote, setNewNote] = useState("");
  const [newTask, setNewTask] = useState("");

  const toggleTask = (taskId: string) => {
    setTasks(
      tasks.map((task) =>
        task.id === taskId ? { ...task, completed: !task.completed } : task
      )
    );
  };

  const addNote = () => {
    if (newNote.trim()) {
      setNotes([
        {
          id: String(notes.length + 1),
          content: newNote,
          author: "John Doe",
          createdAt: "Just now",
        },
        ...notes,
      ]);
      setNewNote("");
    }
  };

  const addTask = () => {
    if (newTask.trim()) {
      setTasks([
        ...tasks,
        {
          id: String(tasks.length + 1),
          title: newTask,
          completed: false,
          priority: "medium",
        },
      ]);
      setNewTask("");
    }
  };

  const getStageStatusColor = (status: ProjectStage["status"]) => {
    switch (status) {
      case "completed":
        return "text-green-600 bg-green-100";
      case "in-progress":
        return "text-blue-600 bg-blue-100";
      case "pending":
        return "text-gray-600 bg-gray-100";
    }
  };

  const getStageIcon = (status: ProjectStage["status"]) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case "in-progress":
        return <Circle className="h-5 w-5 text-blue-600 animate-pulse" />;
      case "pending":
        return <Circle className="h-5 w-5 text-gray-400" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-4">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl text-gray-900">{project.name}</h1>
            <p className="text-gray-600 mt-1">{project.client}</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
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
            {project.priority} priority
          </Badge>
          <Button variant="outline">
            <Edit className="h-4 w-4 mr-2" />
            Edit Project
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Overall Progress</p>
                <p className="text-2xl text-gray-900 mt-1">{project.progress}%</p>
              </div>
              <Progress value={project.progress} className="w-16 h-16" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Due Date</p>
                <p className="text-sm text-gray-900 mt-1">{project.dueDate}</p>
              </div>
              <Calendar className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Tasks</p>
                <p className="text-2xl text-gray-900 mt-1">
                  {tasks.filter((t) => t.completed).length}/{tasks.length}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Files</p>
                <p className="text-2xl text-gray-900 mt-1">{files.length}</p>
              </div>
              <FileText className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Stages Timeline */}
        <div className="lg:col-span-2 space-y-6">
          {/* Project Stages */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Clock className="h-5 w-5 mr-2 text-blue-600" />
                Project Timeline & Stages
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative">
                {/* Vertical Timeline Line */}
                <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200" />

                {/* Stages */}
                <div className="space-y-6">
                  {stages.map((stage, index) => (
                    <motion.div
                      key={stage.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="relative"
                    >
                      {/* Stage Indicator */}
                      <div className="absolute left-0 top-0 flex items-center">
                        <div
                          className={`w-12 h-12 rounded-full flex items-center justify-center border-4 border-white ${
                            stage.status === "completed"
                              ? "bg-green-500"
                              : stage.status === "in-progress"
                              ? "bg-blue-500"
                              : "bg-gray-300"
                          }`}
                        >
                          {getStageIcon(stage.status)}
                        </div>
                      </div>

                      {/* Stage Content */}
                      <div className="ml-20 pb-6">
                        <Card
                          className={`${
                            stage.status === "in-progress"
                              ? "border-blue-500 shadow-md"
                              : ""
                          }`}
                        >
                          <CardContent className="pt-6">
                            <div className="flex items-start justify-between mb-3">
                              <div>
                                <h3 className="text-lg text-gray-900 mb-1">
                                  {stage.name}
                                </h3>
                                <div className="flex items-center space-x-4 text-sm text-gray-600">
                                  <span>{stage.startDate}</span>
                                  <span>→</span>
                                  <span>{stage.endDate}</span>
                                </div>
                              </div>
                              <Badge className={getStageStatusColor(stage.status)}>
                                {stage.status === "in-progress"
                                  ? "In Progress"
                                  : stage.status === "completed"
                                  ? "Completed"
                                  : "Pending"}
                              </Badge>
                            </div>

                            {/* Progress Bar */}
                            <div className="space-y-2">
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-600">Progress</span>
                                <span className="text-gray-900">
                                  {stage.progress}%
                                </span>
                              </div>
                              <Progress value={stage.progress} />
                            </div>

                            {/* Task Count */}
                            <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-200">
                              <span className="text-sm text-gray-600">Tasks</span>
                              <span className="text-sm text-gray-900">
                                {stage.completedTasks}/{stage.tasks} completed
                              </span>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tasks List */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center">
                  <CheckCircle className="h-5 w-5 mr-2 text-green-600" />
                  Tasks & To-Dos
                </CardTitle>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Task
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add New Task</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 mt-4">
                      <Input
                        placeholder="Task title..."
                        value={newTask}
                        onChange={(e) => setNewTask(e.target.value)}
                      />
                      <div className="flex justify-end space-x-2">
                        <Button variant="outline">Cancel</Button>
                        <Button onClick={addTask}>Add Task</Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {tasks.map((task) => (
                  <div
                    key={task.id}
                    className={`flex items-center space-x-3 p-3 rounded-lg border ${
                      task.completed
                        ? "bg-gray-50 border-gray-200"
                        : "bg-white border-gray-200 hover:border-blue-300"
                    }`}
                  >
                    <Checkbox
                      checked={task.completed}
                      onCheckedChange={() => toggleTask(task.id)}
                    />
                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-sm ${
                          task.completed
                            ? "line-through text-gray-500"
                            : "text-gray-900"
                        }`}
                      >
                        {task.title}
                      </p>
                      <div className="flex items-center space-x-3 mt-1">
                        {task.assignee && (
                          <div className="flex items-center text-xs text-gray-500">
                            <Avatar className="h-4 w-4 mr-1">
                              <AvatarFallback className="text-xs">
                                {task.assignee}
                              </AvatarFallback>
                            </Avatar>
                            <span>{task.assignee}</span>
                          </div>
                        )}
                        {task.dueDate && (
                          <span className="text-xs text-gray-500">
                            Due {task.dueDate}
                          </span>
                        )}
                        <Badge
                          variant="outline"
                          className={`text-xs ${
                            task.priority === "high"
                              ? "border-red-200 text-red-600"
                              : task.priority === "medium"
                              ? "border-yellow-200 text-yellow-600"
                              : "border-gray-200 text-gray-600"
                          }`}
                        >
                          {task.priority}
                        </Badge>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>Edit</DropdownMenuItem>
                        <DropdownMenuItem className="text-red-600">
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Files & Notes */}
        <div className="space-y-6">
          {/* Tags */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center text-base">
                <Tag className="h-4 w-4 mr-2 text-purple-600" />
                Tags
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">Web Design</Badge>
                <Badge variant="secondary">Responsive</Badge>
                <Badge variant="secondary">E-commerce</Badge>
                <Button size="sm" variant="outline" className="h-6">
                  <Plus className="h-3 w-3 mr-1" />
                  Add
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Files */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center text-base">
                  <Paperclip className="h-4 w-4 mr-2 text-blue-600" />
                  Files
                </CardTitle>
                <Button size="sm" variant="outline">
                  <Upload className="h-4 w-4 mr-2" />
                  Upload
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {files.map((file) => (
                  <div
                    key={file.id}
                    className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex items-center space-x-3 flex-1 min-w-0">
                      <FileText className="h-8 w-8 text-blue-500 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm text-gray-900 truncate">
                          {file.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {file.size} • {file.uploadedAt}
                        </p>
                      </div>
                    </div>
                    <Button size="icon" variant="ghost">
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center text-base">
                <FileText className="h-4 w-4 mr-2 text-green-600" />
                Notes
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Textarea
                  placeholder="Add a note..."
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  rows={3}
                />
                <Button size="sm" className="mt-2" onClick={addNote}>
                  Add Note
                </Button>
              </div>

              <div className="space-y-3">
                {notes.map((note) => (
                  <div
                    key={note.id}
                    className="p-3 bg-gray-50 rounded-lg border border-gray-200"
                  >
                    <p className="text-sm text-gray-700 mb-2">{note.content}</p>
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>{note.author}</span>
                      <span>{note.createdAt}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
