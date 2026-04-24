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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/app/components/ui/tabs";
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
  StickyNote,
  FileUp,
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
import { toast } from "sonner";

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatNoteDate(raw: Date | string | null | undefined): string {
  if (!raw) return "";
  const utcStr =
    raw instanceof Date
      ? raw.toISOString()
      : typeof raw === "string" && !raw.endsWith("Z") && !raw.includes("+")
        ? raw.replace(" ", "T") + "Z"
        : String(raw);
  return new Date(utcStr).toLocaleString("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  });
}

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
          <p className="text-muted-foreground">Failed to load project</p>
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
  const [taskFilter, setTaskFilter] = useState<"all" | "todo" | "completed">(
    "all"
  );
  const [isDragging, setIsDragging] = useState(false);
  const queryClient = useQueryClient();

  const handleUpload = async (file: File) => {
    try {
      const formData = new FormData();
      formData.append("file", file);
      await addFileMetadata({ projectId: project.id }, formData);
      await queryClient.invalidateQueries({ queryKey: ["files", project.id] });
    } catch (err) {
      console.error("Upload failed:", err);
      toast.error(
        "Failed to upload file. You may have reached your storage limit."
      );
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

      queryClient.setQueryData<Task[]>(["projectsTasks", project.id], (old) =>
        old?.map((task) => (task.id === taskId ? { ...task, status } : task))
      );
      return { previousTasks };
    },

    onError: (_err, _vars, context) => {
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
          <p className="text-muted-foreground">Error loading project data</p>
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

  const allTasks: Task[] = projectsTasksQuery.data ?? [];
  const filteredTasks =
    taskFilter === "all"
      ? allTasks
      : allTasks.filter((t) =>
          taskFilter === "completed"
            ? t.status === "completed"
            : t.status !== "completed"
        );

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) addFile.mutate(file);
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
            <h1 className="text-xl sm:text-2xl text-foreground truncate">
              {project.name}
            </h1>
            <p className="text-muted-foreground mt-1 truncate">
              {project.clientName}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2 ml-10 sm:ml-0">
          <Badge
            variant="outline"
            className={`shrink-0 ${
              project.priority === "high"
                ? "border-red-200 dark:border-red-800 text-red-700 dark:text-red-300"
                : project.priority === "medium"
                  ? "border-yellow-200 dark:border-yellow-800 text-yellow-700 dark:text-yellow-300"
                  : "border-border text-muted-foreground"
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
          <p className="text-2xl text-foreground mb-1">
            {task_percentage(projectsTasksQuery.data ?? [])}%
          </p>
          <p className="text-sm text-muted-foreground">Overall Progress</p>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-lg bg-orange-100">
              <Calendar className="h-6 w-6 text-orange-600" />
            </div>
          </div>
          <p className="text-2xl text-foreground mb-1">
            {project.dueDate || "—"}
          </p>
          <p className="text-sm text-muted-foreground">Due Date</p>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-lg bg-green-100">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
          </div>
          <p className="text-2xl text-foreground mb-1">
            {projectsTasksQuery.data?.filter(
              (t: Task) => t.status === "completed"
            ).length ?? 0}
            /{projectsTasksQuery.data?.length ?? 0}
          </p>
          <p className="text-sm text-muted-foreground">Tasks Completed</p>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-lg bg-purple-100">
              <FileText className="h-6 w-6 text-purple-600" />
            </div>
          </div>
          <p className="text-2xl text-foreground mb-1">
            {fileQuery?.data?.length || 0}
          </p>
          <p className="text-sm text-muted-foreground">Files</p>
        </Card>
      </div>

      {/* Tabbed Main Content */}
      <Tabs defaultValue="tasks">
        <TabsList>
          <TabsTrigger value="tasks" className="gap-2">
            <CheckCircle className="h-4 w-4" />
            Tasks
            {allTasks.length > 0 && (
              <span className="ml-1 text-xs bg-muted px-1.5 py-0.5 rounded-full">
                {allTasks.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="files" className="gap-2">
            <Paperclip className="h-4 w-4" />
            Files
            {(fileQuery?.data?.length ?? 0) > 0 && (
              <span className="ml-1 text-xs bg-muted px-1.5 py-0.5 rounded-full">
                {fileQuery.data.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="notes" className="gap-2">
            <StickyNote className="h-4 w-4" />
            Notes
            {(projectNotesQuery.data?.length ?? 0) > 0 && (
              <span className="ml-1 text-xs bg-muted px-1.5 py-0.5 rounded-full">
                {projectNotesQuery.data.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ── Tasks Tab ── */}
        <TabsContent value="tasks" className="mt-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <CardTitle className="flex items-center">
                    <CheckCircle className="h-5 w-5 mr-2 text-green-600" />
                    Tasks & To-Dos
                  </CardTitle>
                  <span className="text-xs text-muted-foreground">
                    {filteredTasks.length} of {allTasks.length}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {/* Filter buttons */}
                  <div className="flex rounded-lg border border-border overflow-hidden text-xs">
                    {(["all", "todo", "completed"] as const).map((f) => (
                      <button
                        key={f}
                        onClick={() => setTaskFilter(f)}
                        className={`px-3 py-1.5 capitalize transition-colors ${
                          taskFilter === f
                            ? "bg-foreground text-background"
                            : "hover:bg-muted text-muted-foreground"
                        }`}
                      >
                        {f === "todo" ? "To-Do" : f === "all" ? "All" : "Done"}
                      </button>
                    ))}
                  </div>
                  <AddNewTask projectId={project.id} />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {filteredTasks.length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-14 text-center">
                  <div className="p-4 rounded-full bg-muted">
                    <CheckCircle className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {taskFilter === "all"
                        ? "No tasks yet"
                        : taskFilter === "completed"
                          ? "No completed tasks"
                          : "No pending tasks"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {taskFilter === "all"
                        ? "Add a task to get started"
                        : "Change the filter to see other tasks"}
                    </p>
                  </div>
                  {taskFilter === "all" && (
                    <AddNewTask projectId={project.id} />
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredTasks.map((task: Task) => (
                    <div
                      key={task.id}
                      className={`flex items-center space-x-3 p-3 rounded-lg border ${
                        task.status === "completed"
                          ? "bg-muted/50 border-border"
                          : "bg-card border-border hover:border-blue-300"
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
                              ? "line-through text-muted-foreground"
                              : "text-foreground"
                          }`}
                        >
                          {task.title}
                        </p>
                        <div className="flex items-center space-x-3 mt-1">
                          {task.dueDate && (
                            <span className="text-xs text-muted-foreground">
                              Due {task.dueDate}
                            </span>
                          )}
                          <span
                            className={`inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-md font-medium ${
                              task.priority === "high"
                                ? "bg-red-50 dark:bg-red-950/50 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800"
                                : task.priority === "medium"
                                  ? "bg-yellow-50 dark:bg-yellow-950/50 text-yellow-700 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-800"
                                  : "bg-muted text-muted-foreground border border-border"
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
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Files Tab ── */}
        <TabsContent value="files" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center text-base">
                <Paperclip className="h-4 w-4 mr-2 text-blue-600" />
                Files
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Upload Zone */}
              <input
                type="file"
                id="fileInput"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) addFile.mutate(file);
                  e.target.value = "";
                }}
              />
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => document.getElementById("fileInput")?.click()}
                className={`flex flex-col items-center justify-center gap-2 p-8 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${
                  isDragging
                    ? "border-blue-400 bg-blue-50 dark:bg-blue-950/20"
                    : "border-border hover:border-blue-300 hover:bg-muted/50"
                }`}
              >
                {addFile.isPending ? (
                  <>
                    <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                    <p className="text-sm text-muted-foreground">
                      Uploading...
                    </p>
                  </>
                ) : (
                  <>
                    <FileUp className="h-8 w-8 text-muted-foreground" />
                    <div className="text-center">
                      <p className="text-sm font-medium text-foreground">
                        Click to upload or drag & drop
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Any file type supported
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-1 pointer-events-none"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Browse Files
                    </Button>
                  </>
                )}
              </div>

              {/* File List */}
              {fileQuery?.data?.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-8 text-center">
                  <Paperclip className="h-8 w-8 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    No files uploaded yet
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {fileQuery?.data?.map((file: ProjectFile) => (
                    <div
                      key={file.id}
                      className="flex items-center justify-between p-3 border border-border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center space-x-3 flex-1 min-w-0">
                        <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/30 flex-shrink-0">
                          <FileText className="h-5 w-5 text-blue-500" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm text-foreground truncate font-medium">
                            {file.name}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {file.size} · {file.uploadedAt}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
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
                          onClick={() =>
                            deleteProjectFileMutation.mutate(file.id)
                          }
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Notes Tab ── */}
        <TabsContent value="notes" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center text-base">
                <StickyNote className="h-4 w-4 mr-2 text-green-600" />
                Notes
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Add Note Input */}
              <div className="space-y-2">
                <Textarea
                  placeholder="Write a note..."
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  rows={4}
                  className="resize-none"
                />
                <Button
                  size="sm"
                  className="cursor-pointer"
                  disabled={addSomeNote.isPending || !newNote.trim()}
                  onClick={() =>
                    addSomeNote.mutate({ newNote, projectId: project.id })
                  }
                >
                  {addSomeNote.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    "Add Note"
                  )}
                </Button>
              </div>

              {/* Notes List */}
              {projectNotesQuery.data?.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-10 text-center">
                  <div className="p-4 rounded-full bg-muted">
                    <StickyNote className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground">No notes yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {projectNotesQuery.data?.map((note: ProjectNote) => (
                    <div
                      key={note.id}
                      className="p-4 bg-muted/50 rounded-xl border border-border"
                    >
                      <p className="text-sm whitespace-pre-wrap leading-relaxed">
                        {note.content}
                      </p>
                      <p className="text-xs text-muted-foreground mt-3 pt-3 border-t border-border">
                        {formatNoteDate(note.createdAt)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

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
