"use client"

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Progress } from "../../components/ui/progress";
import { Textarea } from "../../components/ui/textarea";
import { Checkbox } from "../../components/ui/checkbox";
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
} from "../../components/ui/dropdown-menu";
import axios from "axios";
import {TaskDetailModal} from "@/app/components/tasks/TaskDetailModal";
import {taskPercentage} from "@/lib/taskPercentage";
import AddNewTask from "@/app/workspace/projects/AddNewTask";
import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import {addNotes, deleteProject, deleteTask, updateTaskStatus} from '@/lib/mutations'

export function ProjectDetailView({ onBackAction, project }: { onBackAction: () => void; project: Project }) {
    const [files] = useState<ProjectFile[]>();
    const [newNote, setNewNote] = useState("");
    const [selectedTask, setSelectedTask] = useState<Task>();
    const [taskDetailOpen, setTaskDetailOpen] = useState(false);

    const queryClient = useQueryClient();

    const getNotes = async (projectId: number) => {
        const res = await axios.get(`/api/projects/${projectId}/notes`);
        return res.data;
    }

    const getProjectTasks = async (projectId: number) => {
        const res = await axios.get(`/api/projects/${projectId}/tasks`);
        return res.data;
    }

    const projectsTasksQuery = useQuery({
        queryKey: ["projectsTasks", project.id],
        queryFn: () => getProjectTasks(project.id),
    })

    const notesQuery = useQuery({
        queryKey: ["notes", project],
        queryFn: () => getNotes(project.id),
        enabled: !!project,
    })

    const addSomeNote = useMutation({
        mutationFn: async ({ newNote, projectId }: { newNote: string; projectId: number }) => {
            await addNotes(newNote, projectId)
        },
        onSuccess: () => {
            setNewNote("");
            queryClient.invalidateQueries({ queryKey: ["notes", project] })
        }
    });

    const deleteSomeTask = useMutation({
        mutationFn: async (taskId: number) => {
            await deleteTask(taskId)
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["projectsTasks", project.id] })
        }
    })

    const deleteSomeProject = useMutation({
        mutationFn: async (projectId: number) => {
            deleteProject(projectId)
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["projects"] })
            onBackAction();
        }
    })

    const changeTaskStatus = useMutation({
        mutationFn: async ({ status, taskId }: { status: string; taskId: number }) => {
            await updateTaskStatus(status, taskId);
        },

        onMutate: async ({ status, taskId }) => {
            await queryClient.cancelQueries({
                queryKey: ["projectsTasks", project.id],
            });

            const previousTasks = queryClient.getQueryData<Task[]>([
                "projectsTasks",
                project.id,
            ]);

            // Update ONLY the task, keep order
            queryClient.setQueryData<Task[]>(
                ["projectsTasks", project.id],
                (old) =>
                    old?.map((task) =>
                        task.id === taskId
                            ? { ...task, status }
                            : task
                    )
            );

            return { previousTasks };
        },

        onError: (_err, _vars, context) => {
            // rollback if API fails
            queryClient.setQueryData(
                ["projectsTasks", project.id],
                context?.previousTasks
            );
        },
    });

    const onBackFunction = async () => {
        queryClient.invalidateQueries({ queryKey: ["projects"] })
        onBackAction();
    }

    if (notesQuery.isLoading || projectsTasksQuery.isLoading) {
        return <p>Loading...</p>
    }

    if (notesQuery.isError || projectsTasksQuery.isError) {
        return <p>Error loading data</p>
    }

    const toggleTaskStatus = async (taskId: number) => {
        const updated = projectsTasksQuery.data?.find((t: Task) => t.id === taskId);
        const newStatus = updated?.status === "completed" ? "todo" : "completed";
        try {
            changeTaskStatus.mutate({status: newStatus, taskId})
        } catch (err) {
            console.error("Failed to update status:", err);
        }
    };

    const handleTaskClick = (task: Task) => {
        setSelectedTask(task);
        setTaskDetailOpen(true);
    };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-4">
          <Button className="cursor-pointer" variant="ghost" size="icon" onClick={onBackFunction}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl text-gray-900">{project.name}</h1>
            <p className="text-gray-600 mt-1">{project.clientName}</p>
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
                onClick={() => deleteSomeProject.mutate(project.id)}
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
                  <p className="text-2xl text-gray-900 mt-1">{taskPercentage(projectsTasksQuery.data)}%</p>
              </div>
                <Progress value={taskPercentage(projectsTasksQuery.data)} className="w-16 h-16" />
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
                    {projectsTasksQuery.data?.filter((t: Task) => t.status === "completed").length}/{projectsTasksQuery.data?.length}
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
                <p className="text-2xl text-gray-900 mt-1">{files?.length}</p>
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
                  <AddNewTask projectId={project.id} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {projectsTasksQuery.data?.map((task: Task) => (
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
                        <DropdownMenuItem className="text-red-600 cursor-pointer" onClick={() => deleteSomeTask.mutate(task.id)}>
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
                {files?.map((file) => (
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
                  <Button
                      size="sm"
                      className="cursor-pointer mt-2"
                      disabled={addSomeNote.isPending || !newNote.trim()}
                      onClick={() =>
                          addSomeNote.mutate({ newNote, projectId: project.id })
                      }
                  >
                      {addSomeNote.isPending ? "Adding..." : "Add Note"}
                  </Button>

              </div>

              <div className="space-y-3">
                {notesQuery.data?.map((note: Note) => (
                  <div
                    key={note.id}
                    className="p-3 bg-gray-50 rounded-lg border border-gray-200"
                  >
                    <p className="text-sm text-gray-700 mb-2">{note.content}</p>
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>{new Date(note.createdAt!).toLocaleString("en-US", {
                          year: "numeric",
                          month: "2-digit",
                          day: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                          hour12: true,
                      })}
                      </span>
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
            task={selectedTask!}
            open={taskDetailOpen}
            onOpenChange={setTaskDetailOpen}
        />
    </div>
  );
}