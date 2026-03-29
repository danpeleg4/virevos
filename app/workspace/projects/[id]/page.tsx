"use client";

import { useRouter } from "next/navigation";
import { use } from "react";
import { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Badge } from "@/app/components/ui/badge";
import { Textarea } from "@/app/components/ui/textarea";
import { Checkbox } from "@/app/components/ui/checkbox";
import {
  ArrowLeft,
  Calendar,
  FileText,
  Upload,
  CheckCircle,
  Download,
  MoreVertical,
  Paperclip,
  Trash2,
  Flag,
  Loader2,
  AlertCircle,
  TrendingUp,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/app/components/ui/dropdown-menu";
import axios from "axios";
import { TaskDetailModal } from "@/app/components/TaskDetailModal";
import { task_percentage } from "@/lib/task_percentage";
import AddNewTask from "@/app/components/AddNewTask";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  addFileMetadata,
  addProjectNotes,
  deleteProject,
  deleteProjectFile,
} from "@/lib/projects";
import { deleteTask, updateTaskStatus } from "@/lib/tasks";
import { Project, ProjectFile, ProjectNote } from "@/types/projects";
import { Task } from "@/types/tasks";

export default function ProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const projectQuery = useQuery({
    queryKey: ["project", id],
    queryFn: async () => {
      const res = await axios.get(`/api/projects/${id}`);
      return res.data as Project;
    },
    enabled: !!id,
  });

  if (projectQuery.isLoading)
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  if (projectQuery.isError)
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <AlertCircle className="h-10 w-10 text-red-400 mx-auto mb-3" />
          <p className="text-gray-600">Failed to load project</p>
        </div>
      </div>
    );

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <ProjectDetailView
        project={projectQuery.data!}
        onBackAction={() => router.push("/workspace/projects")}
      />
    </div>
  );
}

export function ProjectDetailView({
  onBackAction,
  project,
}: {
  onBackAction: () => void;
  project: Project;
}) {
  const [newNote, setNewNote] = useState("");
  const [selectedTask, setSelectedTask] = useState<Task>();
  const [taskDetailOpen, setTaskDetailOpen] = useState(false);
  const queryClient = useQueryClient();

  const handleUpload = async (file: File) => {
    try {
      const formData = new FormData();
      formData.append("file", file);
      const result = await addFileMetadata({ projectId: project.id }, formData);
      console.log("Uploaded:", result);
      await queryClient.invalidateQueries({ queryKey: ["files", project.id] });
    } catch (err) {
      console.error("Upload failed:", err);
    }
  };

  const projectsTasksQuery = useQuery({
    queryKey: ["projectsTasks", project.id],
    enabled: !!project.id,
    queryFn: async () => {
      const res = await axios.get(`/api/projects/${project.id}/tasks`);
      return res.data;
    },
  });

  const projectNotesQuery = useQuery({
    queryKey: ["projectNotes", project.id],
    queryFn: async () => {
      const res = await axios.get(`/api/projects/${project.id}/notes`);
      return res.data;
    },
    enabled: !!project.id,
  });

  const fileQuery = useQuery({
    queryKey: ["files", project.id],
    enabled: !!project.id,
    queryFn: async () => {
      const res = await axios.get(`/api/files/${project.id}/get-files`);
      return res.data;
    },
  });

  const addFile = useMutation({
    mutationFn: handleUpload,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["files", project.id] });
    },
  });

  const addSomeNote = useMutation({
    mutationFn: async ({
      newNote,
      projectId,
    }: {
      newNote: string;
      projectId: number;
    }) => {
      await addProjectNotes(newNote, projectId);
    },
    onSuccess: () => {
      setNewNote("");
      queryClient.invalidateQueries({ queryKey: ["projectNotes", project.id] });
    },
  });

  const deleteSomeTask = useMutation({
    mutationFn: async (taskId: number) => {
      await deleteTask(taskId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["projectsTasks", project.id],
      });
    },
  });

  const deleteSomeProject = useMutation({
    mutationFn: async (projectId: number) => {
      deleteProject(projectId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      onBackAction();
    },
  });

  const changeTaskStatus = useMutation({
    mutationFn: async ({
      status,
      taskId,
    }: {
      status: string;
      taskId: number;
    }) => {
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
      queryClient.setQueryData<Task[]>(["projectsTasks", project.id], (old) =>
        old?.map((task) => (task.id === taskId ? { ...task, status } : task))
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

  const deleteProjectFileMutation = useMutation({
    mutationFn: async (fileId: number) => {
      await deleteProjectFile(fileId);
    },
    onMutate: async (fileId) => {
      await queryClient.cancelQueries({ queryKey: ["files", project.id] });
      const previousFiles = queryClient.getQueryData<ProjectFile[]>([
        "files",
        project.id,
      ]);
      queryClient.setQueryData<ProjectFile[]>(["files", project.id], (old) =>
        old?.filter((f) => f.id !== fileId)
      );
      return { previousFiles };
    },
    onError: (_err, _fileId, context) => {
      queryClient.setQueryData(["files", project.id], context?.previousFiles);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["files", project.id] });
    },
  });

  const onBackFunction = async () => {
    queryClient.invalidateQueries({ queryKey: ["projects"] });
    onBackAction();
  };

  if (
    projectNotesQuery.isLoading ||
    projectsTasksQuery.isLoading ||
    fileQuery.isLoading
  ) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (projectNotesQuery.isError || projectsTasksQuery.isError) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <AlertCircle className="h-10 w-10 text-red-400 mx-auto mb-3" />
          <p className="text-gray-600">Error loading project data</p>
        </div>
      </div>
    );
  }

  const toggleTaskStatus = async (taskId: number) => {
    const updated = projectsTasksQuery.data?.find((t: Task) => t.id === taskId);
    const newStatus = updated?.status === "completed" ? "todo" : "completed";
    try {
      changeTaskStatus.mutate({ status: newStatus, taskId });
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
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="flex items-start space-x-2 sm:space-x-4">
          <Button
            className="cursor-pointer shrink-0"
            variant="ghost"
            size="icon"
            onClick={onBackFunction}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl text-gray-900 truncate">
              {project.name}
            </h1>
            <p className="text-gray-600 mt-1 truncate">{project.clientName}</p>
          </div>
        </div>
        <div className="flex items-center space-x-2 ml-10 sm:ml-0">
          <Badge
            variant="outline"
            className={`shrink-0 ${
              project.priority === "high"
                ? "border-red-200 text-red-700"
                : project.priority === "medium"
                  ? "border-yellow-200 text-yellow-700"
                  : "border-gray-200 text-gray-700"
            }`}
          >
            {project.priority} priority
          </Badge>
          <Button
            className="cursor-pointer shrink-0"
            variant="outline"
            size="sm"
            onClick={() => deleteSomeProject.mutate(project.id)}
          >
            <Trash2 className="h-4 w-4 text-red-500" />
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-lg bg-blue-100">
              <TrendingUp className="h-6 w-6 text-blue-600" />
            </div>
          </div>
          <p className="text-2xl text-gray-900 mb-1">
            {task_percentage(projectsTasksQuery.data ?? [])}%
          </p>
          <p className="text-sm text-gray-600">Overall Progress</p>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-lg bg-orange-100">
              <Calendar className="h-6 w-6 text-orange-600" />
            </div>
          </div>
          <p className="text-2xl text-gray-900 mb-1">
            {project.dueDate || "—"}
          </p>
          <p className="text-sm text-gray-600">Due Date</p>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-lg bg-green-100">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
          </div>
          <p className="text-2xl text-gray-900 mb-1">
            {projectsTasksQuery.data?.filter(
              (t: Task) => t.status === "completed"
            ).length ?? 0}
            /{projectsTasksQuery.data?.length ?? 0}
          </p>
          <p className="text-sm text-gray-600">Tasks Completed</p>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-lg bg-purple-100">
              <FileText className="h-6 w-6 text-purple-600" />
            </div>
          </div>
          <p className="text-2xl text-gray-900 mb-1">
            {fileQuery?.data?.length || 0}
          </p>
          <p className="text-sm text-gray-600">Files</p>
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
                      task.status === "completed"
                        ? "bg-gray-50 border-gray-200"
                        : "bg-white border-gray-200 hover:border-blue-300"
                    }`}
                  >
                    <Checkbox
                      className="cursor-pointer"
                      checked={task.status === "completed"}
                      onCheckedChange={() => toggleTaskStatus(task.id)}
                    />
                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-sm ${
                          task.status === "completed"
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
                        <span
                          className={`inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-md font-medium ${
                            task.priority === "high"
                              ? "bg-red-50 text-red-700 border border-red-200"
                              : task.priority === "medium"
                                ? "bg-yellow-50 text-yellow-700 border border-yellow-200"
                                : "bg-gray-50 text-gray-500 border border-gray-200"
                          }`}
                        >
                          <Flag className="h-3 w-3" />
                          {task.priority}
                        </span>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="cursor-pointer"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => handleTaskClick(task)}
                          className="cursor-pointer"
                        >
                          View
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-red-600 cursor-pointer"
                          onClick={() => deleteSomeTask.mutate(task.id)}
                        >
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
                <input
                  type="file"
                  id="fileInput"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) addFile.mutate(file);
                  }}
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => document.getElementById("fileInput")?.click()}
                  disabled={fileQuery?.data?.length >= 3}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Upload
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {fileQuery?.data?.slice(0, 8).map((file: ProjectFile) => (
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
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => {
                        window.location.href = `/api/files/${file.id}/download`;
                      }}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => deleteProjectFileMutation.mutate(file.id)}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
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
                {projectNotesQuery.data?.map((note: ProjectNote) => (
                  <div
                    key={note.id}
                    className="p-3 bg-gray-50 rounded-lg border border-gray-200"
                  >
                    <p className="text-sm  mb-2">{note.content}</p>
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>
                        {(() => {
                          const raw = note.createdAt;
                          if (!raw) return "";
                          const utcStr =
                            raw instanceof Date
                              ? raw.toISOString()
                              : typeof raw === "string" &&
                                  !raw.endsWith("Z") &&
                                  !raw.includes("+")
                                ? raw.replace(" ", "T") + "Z"
                                : String(raw);
                          return new Date(utcStr).toLocaleString("en-US", {
                            year: "numeric",
                            month: "2-digit",
                            day: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                            hour12: true,
                            timeZone:
                              Intl.DateTimeFormat().resolvedOptions().timeZone,
                          });
                        })()}
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
      {selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          open={taskDetailOpen}
          onOpenChange={setTaskDetailOpen}
          projectId={project.id}
        />
      )}
    </div>
  );
}
