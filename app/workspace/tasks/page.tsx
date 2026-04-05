"use client";

import { useState, useEffect, useRef } from "react";
import { Card } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Button } from "../../components/ui/button";
import { Checkbox } from "../../components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu";
import {
  Search,
  Flag,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  SlidersHorizontal,
  ListTodo,
  Briefcase,
  Calendar,
  CheckIcon,
  Target,
} from "lucide-react";
import { TaskDetailModal } from "../../components/TaskDetailModal";
import axios from "axios";
import AddNewTask from "@/app/components/AddNewTask";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { updateTaskStatus } from "@/lib/tasks";
import { Task } from "@/types/tasks";

const ROW_HEIGHT = 48;

const STATUS_TABS = ["all", "todo", "in-progress", "completed"] as const;
type StatusTab = (typeof STATUS_TABS)[number];

function PriorityBadge({ priority }: { priority: string }) {
  const styles =
    priority === "high"
      ? "bg-red-50 dark:bg-red-950/50 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800"
      : priority === "medium"
        ? "bg-yellow-50 dark:bg-yellow-950/50 text-yellow-700 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-800"
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

function StatusBadge({ status }: { status: string }) {
  if (status === "completed") {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-0.5 rounded-md font-medium bg-green-50 dark:bg-green-950/50 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800">
        <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
        Completed
      </span>
    );
  }
  if (status === "in-progress") {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-0.5 rounded-md font-medium bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 inline-block" />
        In Progress
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-0.5 rounded-md font-medium bg-muted text-muted-foreground border border-border">
      <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground inline-block" />
      To Do
    </span>
  );
}

function ProjectPill({ name }: { name: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs bg-muted text-muted-foreground rounded-full px-2.5 py-0.5">
      <span className="w-2 h-2 rounded-full bg-muted-foreground inline-block flex-shrink-0" />
      {name}
    </span>
  );
}

export default function Tasks() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<StatusTab>("all");
  const [sortField, setSortField] = useState<"title" | "dueDate" | "priority">("dueDate");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [priorityFilter, setPriorityFilter] = useState<"all" | "high" | "medium" | "low">("all");
  const [selectedTask, setSelectedTask] = useState<Task>();
  const [taskDetailOpen, setTaskDetailOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(8);
  const tableRef = useRef<HTMLDivElement>(null);

  const queryClient = useQueryClient();

  useEffect(() => {
    const calculate = () => {
      if (!tableRef.current) return;
      const tableTop = tableRef.current.getBoundingClientRect().top;
      const reserved = 40 + 50 + 24;
      const available = window.innerHeight - tableTop - reserved;
      setItemsPerPage(Math.max(1, Math.floor(available / ROW_HEIGHT)));
    };
    calculate();
    window.addEventListener("resize", calculate);
    return () => window.removeEventListener("resize", calculate);
  }, []);

  const getTasks = useQuery({
    queryKey: ["allTasks"],
    queryFn: async () => {
      const res = await axios.get(`/api/tasks`);
      if (!Array.isArray(res.data)) return [];
      return res.data.map((t: { tasks: Task; projectName: string }) => ({
        ...t.tasks,
        projectName: t.projectName || "No Project",
      }));
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
      await queryClient.cancelQueries({ queryKey: ["allTasks"] });
      const previousTasks = queryClient.getQueryData<Task[]>(["allTasks"]);
      queryClient.setQueryData<Task[]>(["allTasks"], (old) =>
        old?.map((task) => (task.id === taskId ? { ...task, status } : task))
      );
      return { previousTasks };
    },
    onError: (_err, _vars, context) => {
      queryClient.setQueryData(["allTasks"], context?.previousTasks);
    },
  });

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
    setTaskDetailOpen(true);
  };

  const PRIORITY_ORDER: Record<string, number> = { high: 3, medium: 2, low: 1 };

  const filteredTasks = (
    getTasks?.data?.filter((task: Task) => {
      const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesTab =
        activeTab === "all" ||
        (activeTab === "todo" && task.status === "todo") ||
        (activeTab === "in-progress" && task.status === "in-progress") ||
        (activeTab === "completed" && task.status === "completed");
      const matchesPriority = priorityFilter === "all" || task.priority === priorityFilter;
      return matchesSearch && matchesTab && matchesPriority;
    }) ?? []
  ).sort((a: Task, b: Task) => {
    let cmp = 0;
    if (sortField === "title") cmp = a.title.localeCompare(b.title);
    else if (sortField === "dueDate") {
      const da = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
      const db = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
      cmp = da - db;
    } else if (sortField === "priority") {
      cmp = (PRIORITY_ORDER[a.priority] ?? 0) - (PRIORITY_ORDER[b.priority] ?? 0);
    }
    return sortDir === "asc" ? cmp : -cmp;
  });

  const taskCounts = {
    all: getTasks?.data?.length ?? 0,
    todo: getTasks?.data?.filter((t: Task) => t.status === "todo").length ?? 0,
    "in-progress":
      getTasks?.data?.filter((t: Task) => t.status === "in-progress").length ??
      0,
    completed:
      getTasks?.data?.filter((t: Task) => t.status === "completed").length ?? 0,
  };

  const totalPages = Math.ceil(filteredTasks.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedTasks = filteredTasks.slice(
    startIndex,
    startIndex + itemsPerPage
  );

  const TAB_LABELS: Record<StatusTab, string> = {
    all: "All",
    todo: "To Do",
    "in-progress": "In Progress",
    completed: "Completed",
  };

  return (
    <div className="p-4 sm:p-6 flex flex-col gap-6 h-full">

      {/* Tasks Table */}
      <div ref={tableRef} className="flex-1 min-h-0 flex flex-col">
        <Card className="overflow-hidden flex flex-col h-full">
          {/* Toolbar */}
          <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-muted/50 flex-wrap">
            {/* Status tabs */}
            <div className="flex items-center gap-1">
              {STATUS_TABS.map((tab) => (
                <button
                  key={tab}
                  onClick={() => {
                    setActiveTab(tab);
                    setCurrentPage(1);
                  }}
                  className={`cursor-pointer text-xs px-3 py-1.5 rounded-md transition-colors ${
                    activeTab === tab
                      ? "bg-card border border-border text-foreground shadow-sm font-medium"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent"
                  }`}
                >
                  {TAB_LABELS[tab]}
                  <span
                    className={`ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full ${
                      activeTab === tab
                        ? "bg-muted text-muted-foreground"
                        : "text-muted-foreground"
                    }`}
                  >
                    {tab === "in-progress"
                      ? taskCounts["in-progress"]
                      : taskCounts[tab as keyof typeof taskCounts]}
                  </span>
                </button>
              ))}
            </div>

            <div className="relative flex-1 max-w-xs ml-auto">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search tasks..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-8 h-8 text-sm"
              />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="cursor-pointer inline-flex items-center gap-1.5 text-xs text-muted-foreground bg-card hover:bg-accent border border-border rounded-md px-3 py-1.5 transition-colors">
                  <ArrowUpDown className="h-3 w-3" />
                  Sort
                  {sortField !== "dueDate" || sortDir !== "asc" ? (
                    <span className="ml-0.5 w-1.5 h-1.5 rounded-full bg-blue-500 inline-block" />
                  ) : null}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {(
                  [
                    { label: "Due Date (Earliest)", field: "dueDate", dir: "asc" },
                    { label: "Due Date (Latest)", field: "dueDate", dir: "desc" },
                    { label: "Title (A–Z)", field: "title", dir: "asc" },
                    { label: "Title (Z–A)", field: "title", dir: "desc" },
                    { label: "Priority (Highest)", field: "priority", dir: "desc" },
                    { label: "Priority (Lowest)", field: "priority", dir: "asc" },
                  ] as const
                ).map(({ label, field, dir }) => (
                  <DropdownMenuItem
                    key={label}
                    onClick={() => { setSortField(field); setSortDir(dir); setCurrentPage(1); }}
                    className="flex items-center justify-between"
                  >
                    {label}
                    {sortField === field && sortDir === dir && (
                      <CheckIcon className="h-3.5 w-3.5 text-blue-600" />
                    )}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="cursor-pointer inline-flex items-center gap-1.5 text-xs text-muted-foreground bg-card hover:bg-accent border border-border rounded-md px-3 py-1.5 transition-colors">
                  <SlidersHorizontal className="h-3 w-3" />
                  Filter
                  {priorityFilter !== "all" ? (
                    <span className="ml-0.5 w-1.5 h-1.5 rounded-full bg-blue-500 inline-block" />
                  ) : null}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-36">
                {(
                  [
                    { label: "All Priorities", value: "all" },
                    { label: "High", value: "high" },
                    { label: "Medium", value: "medium" },
                    { label: "Low", value: "low" },
                  ] as const
                ).map(({ label, value }) => (
                  <DropdownMenuItem
                    key={value}
                    onClick={() => { setPriorityFilter(value); setCurrentPage(1); }}
                    className="flex items-center justify-between"
                  >
                    {label}
                    {priorityFilter === value && (
                      <CheckIcon className="h-3.5 w-3.5 text-blue-600" />
                    )}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <AddNewTask />
          </div>

          <div className="overflow-x-auto flex-1">
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
                      <Briefcase className="h-3.5 w-3.5" />
                      Project
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
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {paginatedTasks.map((task: Task) => (
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
                        onCheckedChange={(checked) =>
                          changeTaskStatus.mutate({
                            status: checked ? "completed" : "todo",
                            taskId: task.id,
                          })
                        }
                        className="cursor-pointer h-3.5 w-3.5 data-[state=checked]:opacity-100 transition-opacity"
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
                      {task.projectName && (
                        <ProjectPill name={task.projectName} />
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      <PriorityBadge priority={task.priority} />
                    </td>
                    <td className="px-3 py-2.5">
                      <StatusBadge status={task.status} />
                    </td>
                    <td className="px-3 py-2.5 text-xs text-muted-foreground">
                      {task.dueDate
                        ? new Date(task.dueDate).toLocaleDateString()
                        : "—"}
                    </td>
                  </tr>
                ))}
                {paginatedTasks.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-3 py-12 text-center text-sm text-muted-foreground"
                    >
                      No tasks found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 sm:px-6 py-3 border-t border-border bg-muted/50">
            <div className="text-xs text-muted-foreground">
              Showing {filteredTasks.length === 0 ? 0 : startIndex + 1}–
              {Math.min(startIndex + itemsPerPage, filteredTasks.length)} of{" "}
              {filteredTasks.length} tasks
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="h-7 text-xs"
              >
                <ChevronLeft className="h-3.5 w-3.5 mr-1" />
                Previous
              </Button>
              <span className="px-2 py-1 text-xs text-muted-foreground">
                {currentPage} / {Math.max(1, totalPages)}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                }
                disabled={currentPage === totalPages || totalPages === 0}
                className="h-7 text-xs"
              >
                Next
                <ChevronRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            </div>
          </div>
        </Card>
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
