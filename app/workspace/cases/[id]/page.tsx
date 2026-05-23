"use client";

import { useRouter } from "next/navigation";
import { use, useState } from "react";
import { Card } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Badge } from "@/app/components/ui/badge";
import { Textarea } from "@/app/components/ui/textarea";
import { Checkbox } from "@/app/components/ui/checkbox";
import { Input } from "@/app/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/app/components/ui/dialog";
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
  Search,
  ListTodo,
  Target,
  Clock,
  Plus,
  SlidersHorizontal,
  CheckIcon,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/app/components/ui/dropdown-menu";
import axios from "axios";
import { TaskDetailModal } from "@/app/components/TaskDetailModal";
import { task_percentage } from "@/lib/util/task_percentage";
import AddNewTask from "@/app/components/AddNewTask";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  addFileMetadata,
  addCaseNotes,
  deleteCase,
  deleteCaseFile,
} from "@/lib/workspace/cases";
import { deleteTask, updateTaskStatus } from "@/lib/workspace/tasks";
import { Case, CaseFile, CaseNote } from "@/types/cases";
import { Task } from "@/types/tasks";
import { toast } from "sonner";

function formatNoteDate(raw: Date | string | null | undefined): string {
  if (!raw) return "";
  return new Date(raw).toLocaleString("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

type Section = "tasks" | "files" | "notes";
type TaskStatusFilter = "all" | "in-progress" | "completed";

const TASK_STATUS_FILTERS: {
  label: string;
  value: TaskStatusFilter;
}[] = [
  { label: "All", value: "all" },
  { label: "In Progress", value: "in-progress" },
  { label: "Completed", value: "completed" },
];

function PriorityBadge({ priority }: { priority: string }) {
  const styles =
    priority === "high"
      ? "bg-red-50 dark:bg-red-950/50 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800"
      : priority === "medium"
        ? "bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300 border border-yellow-300 dark:border-yellow-700"
        : "bg-muted text-muted-foreground border border-border";
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-md font-medium ${styles}`}
    >
      <Flag className="h-3 w-3" />
      {priority}
    </span>
  );
}

function TaskStatusBadge({ status }: { status: string }) {
  if (status === "completed") {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-0.5 rounded-md font-medium bg-green-50 dark:bg-green-950/50 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800">
        <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
        Completed
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-0.5 rounded-md font-medium bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
      <span className="w-1.5 h-1.5 rounded-full bg-blue-500 inline-block" />
      In Progress
    </span>
  );
}

export default function CasePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const caseQuery = useQuery({
    queryKey: ["case", id],
    queryFn: async () => {
      const res = await axios.get(`/api/cases/${id}`);
      return res.data as Case;
    },
    enabled: !!id,
  });

  if (caseQuery.isLoading)
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  if (caseQuery.isError)
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <AlertCircle className="h-10 w-10 text-red-400 mx-auto mb-3" />
          <p className="text-muted-foreground">Failed to load case</p>
        </div>
      </div>
    );

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <CaseDetailView
        aCase={caseQuery.data!}
        onBackAction={() => router.push("/workspace/cases")}
      />
    </div>
  );
}

export function CaseDetailView({
  onBackAction,
  aCase,
}: {
  onBackAction: () => void;
  aCase: Case;
}) {
  const [newNote, setNewNote] = useState("");
  const [selectedTask, setSelectedTask] = useState<Task>();
  const [taskDetailOpen, setTaskDetailOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<Section>("tasks");
  const [search, setSearch] = useState("");
  const [taskStatusFilter, setTaskStatusFilter] =
    useState<TaskStatusFilter>("all");
  const [noteDialogOpen, setNoteDialogOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const queryClient = useQueryClient();

  const handleUpload = async (file: File) => {
    try {
      const formData = new FormData();
      formData.append("file", file);
      await addFileMetadata({ caseId: aCase.id }, formData);
      await queryClient.invalidateQueries({ queryKey: ["files", aCase.id] });
    } catch (err) {
      console.error("Upload failed:", err);
      toast.error(
        "Failed to upload file. You may have reached your storage limit."
      );
    }
  };

  const caseTasksQuery = useQuery({
    queryKey: ["caseTasks", aCase.id],
    enabled: !!aCase.id,
    queryFn: async () => {
      const res = await axios.get(`/api/cases/${aCase.id}/tasks`);
      return res.data;
    },
  });

  const caseNotesQuery = useQuery({
    queryKey: ["caseNotes", aCase.id],
    queryFn: async () => {
      const res = await axios.get(`/api/cases/${aCase.id}/notes`);
      return res.data;
    },
    enabled: !!aCase.id,
  });

  const fileQuery = useQuery({
    queryKey: ["files", aCase.id],
    enabled: !!aCase.id,
    queryFn: async () => {
      const res = await axios.get(`/api/files/${aCase.id}/get-files`);
      return res.data;
    },
  });

  const addFile = useMutation({
    mutationFn: handleUpload,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["files", aCase.id] });
    },
  });

  const addSomeNote = useMutation({
    mutationFn: async ({
      newNote,
      caseId,
    }: {
      newNote: string;
      caseId: number;
    }) => {
      await addCaseNotes(newNote, caseId);
    },
    onSuccess: () => {
      setNewNote("");
      setNoteDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["caseNotes", aCase.id] });
    },
  });

  const deleteSomeTask = useMutation({
    mutationFn: async (taskId: number) => {
      await deleteTask(taskId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["caseTasks", aCase.id],
      });
    },
  });

  const deleteSomeCase = useMutation({
    mutationFn: async (caseId: number) => {
      deleteCase(caseId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cases"] });
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
        queryKey: ["caseTasks", aCase.id],
      });

      const previousTasks = queryClient.getQueryData<Task[]>([
        "caseTasks",
        aCase.id,
      ]);

      queryClient.setQueryData<Task[]>(["caseTasks", aCase.id], (old) =>
        old?.map((task) => (task.id === taskId ? { ...task, status } : task))
      );
      return { previousTasks };
    },

    onError: (_err, _vars, context) => {
      queryClient.setQueryData(["caseTasks", aCase.id], context?.previousTasks);
    },
  });

  const deleteCaseFileMutation = useMutation({
    mutationFn: async (fileId: number) => {
      await deleteCaseFile(fileId);
    },
    onMutate: async (fileId) => {
      await queryClient.cancelQueries({ queryKey: ["files", aCase.id] });
      const previousFiles = queryClient.getQueryData<CaseFile[]>([
        "files",
        aCase.id,
      ]);
      queryClient.setQueryData<CaseFile[]>(["files", aCase.id], (old) =>
        old?.filter((f) => f.id !== fileId)
      );
      return { previousFiles };
    },
    onError: (_err, _fileId, context) => {
      queryClient.setQueryData(["files", aCase.id], context?.previousFiles);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["files", aCase.id] });
    },
  });

  const onBackFunction = async () => {
    queryClient.invalidateQueries({ queryKey: ["cases"] });
    onBackAction();
  };

  if (
    caseNotesQuery.isLoading ||
    caseTasksQuery.isLoading ||
    fileQuery.isLoading
  ) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (caseNotesQuery.isError || caseTasksQuery.isError) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <AlertCircle className="h-10 w-10 text-red-400 mx-auto mb-3" />
          <p className="text-muted-foreground">Error loading case data</p>
        </div>
      </div>
    );
  }

  const toggleTaskStatus = (taskId: number) => {
    const updated = caseTasksQuery.data?.find((t: Task) => t.id === taskId);
    const newStatus = updated?.status === "completed" ? "todo" : "completed";
    changeTaskStatus.mutate({ status: newStatus, taskId });
  };

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
    setTaskDetailOpen(true);
  };

  const allTasks: Task[] = caseTasksQuery.data ?? [];
  const allFiles: CaseFile[] = fileQuery.data ?? [];
  const allNotes: CaseNote[] = caseNotesQuery.data ?? [];

  const completedTaskCount = allTasks.filter(
    (t) => t.status === "completed"
  ).length;

  const filteredTasks = allTasks.filter((t) => {
    const matchesStatus =
      taskStatusFilter === "all" ||
      (taskStatusFilter === "completed"
        ? t.status === "completed"
        : t.status !== "completed");
    const matchesSearch = t.title.toLowerCase().includes(search.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const filteredFiles = allFiles.filter((f) =>
    f.name.toLowerCase().includes(search.toLowerCase())
  );

  const filteredNotes = allNotes.filter((n) =>
    (n.content ?? "").toLowerCase().includes(search.toLowerCase())
  );

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) addFile.mutate(file);
  };

  const SECTIONS: {
    value: Section;
    label: string;
    icon: React.ReactNode;
    count: number;
  }[] = [
    {
      value: "tasks",
      label: "Tasks",
      icon: <CheckCircle className="h-3.5 w-3.5" />,
      count: allTasks.length,
    },
    {
      value: "files",
      label: "Files",
      icon: <Paperclip className="h-3.5 w-3.5" />,
      count: allFiles.length,
    },
    {
      value: "notes",
      label: "Notes",
      icon: <StickyNote className="h-3.5 w-3.5" />,
      count: allNotes.length,
    },
  ];

  const searchPlaceholder =
    activeSection === "tasks"
      ? "Search tasks..."
      : activeSection === "files"
        ? "Search files..."
        : "Search notes...";

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
              {aCase.name}
            </h1>
            <p className="text-muted-foreground mt-1 truncate">
              {aCase.clientName}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2 ml-10 sm:ml-0">
          <Badge
            variant="outline"
            className={`shrink-0 ${
              aCase.priority === "high"
                ? "border-red-200 dark:border-red-800 text-red-700 dark:text-red-300"
                : aCase.priority === "medium"
                  ? "border-yellow-300 dark:border-yellow-700 text-yellow-700 dark:text-yellow-300 bg-yellow-100 dark:bg-yellow-900/40"
                  : "border-border text-muted-foreground"
            }`}
          >
            {aCase.priority} priority
          </Badge>
          <Button
            className="cursor-pointer shrink-0"
            variant="outline"
            size="sm"
            onClick={() => deleteSomeCase.mutate(aCase.id)}
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
            {task_percentage(allTasks)}%
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
            {aCase.dueDate || "—"}
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
            {completedTaskCount}/{allTasks.length}
          </p>
          <p className="text-sm text-muted-foreground">Tasks Completed</p>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-lg bg-purple-100">
              <FileText className="h-6 w-6 text-purple-600" />
            </div>
          </div>
          <p className="text-2xl text-foreground mb-1">{allFiles.length}</p>
          <p className="text-sm text-muted-foreground">Files</p>
        </Card>
      </div>

      {/* Single tabbed Card with section navbar */}
      <Card className="overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-muted/50 flex-wrap">
          {/* Section navbar */}
          <div className="flex items-center gap-1">
            {SECTIONS.map((s) => (
              <button
                key={s.value}
                onClick={() => {
                  setActiveSection(s.value);
                  setSearch("");
                }}
                className={`cursor-pointer inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md transition-colors ${
                  activeSection === s.value
                    ? "bg-card border border-border text-foreground shadow-sm font-medium"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
                }`}
              >
                {s.icon}
                {s.label}
                <span
                  className={`ml-0.5 text-[10px] px-1.5 py-0.5 rounded-full ${
                    activeSection === s.value
                      ? "bg-muted text-muted-foreground"
                      : "text-muted-foreground"
                  }`}
                >
                  {s.count}
                </span>
              </button>
            ))}
          </div>

          {/* Section-specific controls (right side) */}
          <div className="flex items-center gap-2 ml-auto">
            <div className="relative w-48 sm:w-56 shrink-0">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder={searchPlaceholder}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-8 text-sm"
              />
            </div>

            {activeSection === "tasks" && (
              <>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="cursor-pointer inline-flex items-center gap-1.5 text-xs text-muted-foreground bg-card hover:bg-accent border border-border rounded-md px-3 py-1.5 transition-colors">
                      <SlidersHorizontal className="h-3 w-3" />
                      Filter
                      {taskStatusFilter !== "all" && (
                        <span className="ml-0.5 w-1.5 h-1.5 rounded-full bg-blue-500 inline-block" />
                      )}
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-40">
                    {TASK_STATUS_FILTERS.map(({ label, value }) => (
                      <DropdownMenuItem
                        key={value}
                        onClick={() => setTaskStatusFilter(value)}
                        className="flex items-center justify-between cursor-pointer"
                      >
                        {label}
                        {taskStatusFilter === value && (
                          <CheckIcon className="h-3.5 w-3.5 text-blue-600" />
                        )}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
                <AddNewTask caseId={aCase.id} />
              </>
            )}

            {activeSection === "files" && (
              <>
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
                <Button
                  size="sm"
                  className="cursor-pointer"
                  disabled={addFile.isPending}
                  onClick={() => document.getElementById("fileInput")?.click()}
                >
                  {addFile.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Upload
                    </>
                  )}
                </Button>
              </>
            )}

            {activeSection === "notes" && (
              <Dialog open={noteDialogOpen} onOpenChange={setNoteDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="cursor-pointer">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Note
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle>New Note</DialogTitle>
                    <DialogDescription>
                      Add a note to this case.
                    </DialogDescription>
                  </DialogHeader>
                  <Textarea
                    placeholder="Write a note..."
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    rows={6}
                    className="resize-none"
                  />
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => setNoteDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      disabled={addSomeNote.isPending || !newNote.trim()}
                      onClick={() =>
                        addSomeNote.mutate({ newNote, caseId: aCase.id })
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
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>

        {/* Tasks body */}
        {activeSection === "tasks" && (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-border">
                <tr>
                  <th className="w-10 px-3 py-2.5" />
                  <th className="text-left px-3 py-2.5">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                      <ListTodo className="h-3.5 w-3.5" />
                      Task
                    </div>
                  </th>
                  <th className="text-left px-3 py-2.5">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                      <Flag className="h-3.5 w-3.5" />
                      Priority
                    </div>
                  </th>
                  <th className="text-left px-3 py-2.5">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                      <Target className="h-3.5 w-3.5" />
                      Status
                    </div>
                  </th>
                  <th className="text-left px-3 py-2.5">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                      <Calendar className="h-3.5 w-3.5" />
                      Due date
                    </div>
                  </th>
                  <th className="w-10 px-2 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredTasks.map((task) => (
                  <tr
                    key={task.id}
                    onClick={() => handleTaskClick(task)}
                    className="cursor-pointer transition-colors hover:bg-muted/50 group"
                  >
                    <td
                      className="px-3 py-2.5"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Checkbox
                        checked={task.status === "completed"}
                        onCheckedChange={() => toggleTaskStatus(task.id)}
                        className="cursor-pointer h-3.5 w-3.5"
                      />
                    </td>
                    <td className="px-3 py-2.5">
                      <span
                        className={`text-sm font-medium ${
                          task.status === "completed"
                            ? "line-through text-muted-foreground"
                            : "text-foreground"
                        }`}
                      >
                        {task.title}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <PriorityBadge priority={task.priority} />
                    </td>
                    <td className="px-3 py-2.5">
                      <TaskStatusBadge status={task.status} />
                    </td>
                    <td className="px-3 py-2.5 text-xs text-muted-foreground">
                      {task.dueDate || "—"}
                    </td>
                    <td
                      className="px-2 py-2.5"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            className="cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity inline-flex items-center justify-center h-7 w-7 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent"
                            aria-label="Task actions"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </button>
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
                    </td>
                  </tr>
                ))}
                {filteredTasks.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-3 py-12 text-center text-sm text-muted-foreground"
                    >
                      {allTasks.length === 0
                        ? "No tasks yet — add one to get started"
                        : "No tasks match your filters"}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Files body */}
        {activeSection === "files" && (
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            className={`overflow-x-auto transition-colors ${
              isDragging ? "bg-blue-50 dark:bg-blue-950/20" : ""
            }`}
          >
            <table className="w-full">
              <thead className="border-b border-border">
                <tr>
                  <th className="text-left px-3 py-2.5">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                      <FileText className="h-3.5 w-3.5" />
                      Name
                    </div>
                  </th>
                  <th className="text-left px-3 py-2.5">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                      <FileUp className="h-3.5 w-3.5" />
                      Size
                    </div>
                  </th>
                  <th className="text-left px-3 py-2.5">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                      <Calendar className="h-3.5 w-3.5" />
                      Uploaded
                    </div>
                  </th>
                  <th className="w-24 px-2 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredFiles.map((file) => (
                  <tr
                    key={file.id}
                    className="transition-colors hover:bg-muted/50 group"
                  >
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2.5">
                        <div className="p-1.5 rounded-md bg-blue-50 dark:bg-blue-950/30 shrink-0">
                          <FileText className="h-4 w-4 text-blue-500" />
                        </div>
                        <span className="text-sm font-medium text-foreground truncate">
                          {file.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-xs text-muted-foreground">
                      {(Number(file.size) / (1024 * 1024)).toFixed(2) + "MB"}
                    </td>
                    <td className="px-3 py-2.5 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3 shrink-0" />
                        {formatNoteDate(file.createdAt)}
                      </div>
                    </td>
                    <td className="px-2 py-2.5">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 cursor-pointer"
                          onClick={() => {
                            window.location.href = `/api/files/${file.id}/download`;
                          }}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 cursor-pointer"
                          onClick={() => deleteCaseFileMutation.mutate(file.id)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredFiles.length === 0 && (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-3 py-12 text-center text-sm text-muted-foreground"
                    >
                      {allFiles.length === 0
                        ? "Drop files here or click Upload to add files"
                        : "No files match your search"}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Notes body */}
        {activeSection === "notes" && (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-border">
                <tr>
                  <th className="text-left px-3 py-2.5">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                      <StickyNote className="h-3.5 w-3.5" />
                      Note
                    </div>
                  </th>
                  <th className="text-left px-3 py-2.5 w-48">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                      <Calendar className="h-3.5 w-3.5" />
                      Created
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredNotes.map((note) => (
                  <tr
                    key={note.id}
                    className="transition-colors hover:bg-muted/50 align-top"
                  >
                    <td className="px-3 py-2.5">
                      <p className="text-sm whitespace-pre-wrap leading-relaxed text-foreground">
                        {note.content}
                      </p>
                    </td>
                    <td className="px-3 py-2.5 text-xs text-muted-foreground whitespace-nowrap">
                      {formatNoteDate(note.createdAt)}
                    </td>
                  </tr>
                ))}
                {filteredNotes.length === 0 && (
                  <tr>
                    <td
                      colSpan={2}
                      className="px-3 py-12 text-center text-sm text-muted-foreground"
                    >
                      {allNotes.length === 0
                        ? "No notes yet — click Add Note to write one"
                        : "No notes match your search"}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Task Detail Modal */}
      {selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          open={taskDetailOpen}
          onOpenChange={setTaskDetailOpen}
          caseId={aCase.id}
        />
      )}
    </div>
  );
}
