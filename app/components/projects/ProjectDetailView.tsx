import {useEffect, useState} from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Progress } from "../ui/progress";
import { Textarea } from "../ui/textarea";
import { Checkbox } from "../ui/checkbox";
import {
    ArrowLeft,
    Calendar,
    FileText,
    Upload,
    CheckCircle,
    Download,
    MoreVertical,
    Paperclip, Trash2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import AddNewTask from "@/app/components/AddNewTask";
import {initialTasks, mockFiles, mockNotes} from "@/app/lib/mockData"
import axios from "axios";
import {TaskDetailModal} from "@/app/components/tasks/TaskDetailModal";
import {taskPercentage} from "@/app/lib/taskPercentage";

export function ProjectDetailView({ project, onBack, onDelete }: ProjectDetailViewProps) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [files] = useState<ProjectFile[]>(mockFiles);
  const [notes, setNotes] = useState<ProjectNote[]>(mockNotes);
  const [newNote, setNewNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<Task>(initialTasks[0]);
  const [taskDetailOpen, setTaskDetailOpen] = useState(false);

  //TODO Figure out the thing
    const toggleTaskStatus = async (taskId: number) => {
        setTasks((prev) => {
            return prev.map((task) =>
                task.id === taskId
                    ? {
                        ...task,
                        status: task.status === "completed" ? "todo" : "completed",
                    }
                    : task
            );
        });

        // Send request to backend using the *new* status
        const updated = tasks.find(t => t.id === taskId);
        const newStatus = updated?.status === "completed" ? "todo" : "completed";

        try {
            await axios.patch(`/api/tasks/${taskId}/status`, { status: newStatus });
        } catch (err) {
            console.error("Failed to update status:", err);
        }
    };

  useEffect(() => {
      const getProjectTasks = async () => {
          const res = await axios.get(`/api/projects/${project.id}/tasks`)
          setTasks(res.data)
          setLoading(false)
      }
      getProjectTasks()
  }, [])

    const handleTaskClick = (task: Task) => {
        setSelectedTask(task);
        setTaskDetailOpen(true);
    };

    const handleTaskUpdate = (updatedTask: Task) => {
        setTasks((prev) =>
            prev.map((task) => (task.id === updatedTask.id ? updatedTask : task))
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

    const deleteProject = async (projectId: number) => {
        try {
            await axios.delete(`/api/projects/${projectId}/project`);
            onDelete(projectId);      // <--- update parent state
        } catch (err) {
            console.error(err);
        }
    }

  const deleteTask = async (taskId: number) => {
      const res = await axios.delete(`/api/tasks/${taskId}/status`)
      if (res.status == 200) setTasks(tasks.filter(t => t.id !== taskId))
  }

    const addTaskToList = (newTask: Task) => {
        setTasks(prev => [newTask, ...prev]);
    };

    if (loading) return <div>Loading...</div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-4">
          <Button className="cursor-pointer" variant="ghost" size="icon" onClick={onBack}>
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
            <Button
                className="cursor-pointer"
                variant="outline"
                size="sm"
                onClick={() => deleteProject(project.id)}
            >
                <Trash2 className="h-4 w-4 text-red-500" />
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
                  <p className="text-2xl text-gray-900 mt-1">{taskPercentage(tasks)}%</p>
              </div>
                <Progress value={taskPercentage(tasks)} className="w-16 h-16" />
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
                    {tasks.filter((t) => t.status === "completed").length}/{tasks.length}
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

          {/* Tasks List */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center">
                  <CheckCircle className="h-5 w-5 mr-2 text-green-600" />
                  Tasks & To-Dos
                </CardTitle>
                  <AddNewTask onTaskCreatedAction={addTaskToList} isProject={true} projectName={project.name}/>
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
                        checked={task.status === "completed"}
                        onCheckedChange={() => toggleTaskStatus(task.id)}
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
                        <Button variant="ghost" size="icon" className="cursor-pointer">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleTaskClick(task)} className="cursor-pointer">Edit</DropdownMenuItem>
                        <DropdownMenuItem className="text-red-600 cursor-pointer" onClick={() => deleteTask(task.id)}>
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