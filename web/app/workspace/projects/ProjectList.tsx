"use client";

import { useState, useEffect, useRef } from "react";
import { Card } from "@/app/components/ui/card";
import { Input } from "@/app/components/ui/input";
import { Button } from "@/app/components/ui/button";
import { Avatar, AvatarFallback } from "@/app/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/app/components/ui/dropdown-menu";
import {
  CheckCircle,
  Clock,
  FolderOpen,
  Search,
  TrendingUp,
  Flag,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  SlidersHorizontal,
  Briefcase,
  Calendar,
  CheckIcon,
  MoreVertical,
  Target,
  ListChecks,
} from "lucide-react";
import { task_percentage } from "@/lib/task_percentage";
import { Progress } from "@/app/components/ui/progress";
import { Project } from "@/types/projects";
import type { clients } from "@/types/clients";
import { ProjectEditDialog } from "./ProjectEditDialog";

const ROW_HEIGHT = 52;

const STATUS_TABS = ["all", "active", "completed"] as const;
type StatusTab = (typeof STATUS_TABS)[number];

const TAB_LABELS: Record<StatusTab, string> = {
  all: "All Projects",
  active: "Active",
  completed: "Completed",
};

function StatusBadge({ status }: { status: string }) {
  if (status === "completed") {
    return (
      <span className="inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-md font-medium bg-blue-50 text-blue-700 border border-blue-200">
        <CheckCircle className="h-3 w-3" />
        Completed
      </span>
    );
  }
  if (status === "inactive") {
    return (
      <span className="inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-md font-medium bg-gray-50 text-gray-500 border border-gray-200">
        <Clock className="h-3 w-3" />
        Inactive
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-md font-medium bg-green-50 text-green-700 border border-green-200">
      <TrendingUp className="h-3 w-3" />
      Active
    </span>
  );
}

function PriorityBadge({ priority }: { priority: string }) {
  const styles =
    priority === "high"
      ? "bg-red-50 text-red-700 border border-red-200"
      : priority === "medium"
        ? "bg-yellow-50 text-yellow-700 border border-yellow-200"
        : "bg-gray-50 text-gray-500 border border-gray-200";
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-md font-medium ${styles}`}
    >
      <Flag className="h-3 w-3" />
      {priority}
    </span>
  );
}

function ClientPill({ name }: { name: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs bg-gray-100 text-gray-700 rounded-full px-2.5 py-0.5">
      <span className="w-2 h-2 rounded-full bg-gray-400 inline-block flex-shrink-0" />
      {name}
    </span>
  );
}

interface ProjectListProps {
  projects: Project[];
  clients: clients[];
  onSelect: (project: Project) => void;
}

export function ProjectList({ projects, clients, onSelect }: ProjectListProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<StatusTab>("all");
  const [sortField, setSortField] = useState<
    "name" | "progress" | "dueDate" | "priority"
  >("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "active" | "inactive" | "completed"
  >("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(8);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const tableRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const calculate = () => {
      if (!tableRef.current) return;
      const tableTop = tableRef.current.getBoundingClientRect().top;
      const reserved = 40 + 50 + 50 + 24;
      const available = window.innerHeight - tableTop - reserved;
      setItemsPerPage(Math.max(1, Math.floor(available / ROW_HEIGHT)));
    };
    calculate();
    window.addEventListener("resize", calculate);
    return () => window.removeEventListener("resize", calculate);
  }, []);

  const PRIORITY_ORDER: Record<string, number> = { high: 3, medium: 2, low: 1 };

  const filteredProjects = projects
    .filter((project) => {
      const matchesSearch = project.name
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
      const matchesTab =
        activeTab === "all" ||
        (activeTab === "active" && project.status !== "completed") ||
        (activeTab === "completed" && project.status === "completed");
      const matchesHealth =
        statusFilter === "all" || project.status === statusFilter;
      return matchesSearch && matchesTab && matchesHealth;
    })
    .sort((a, b) => {
      let cmp = 0;
      if (sortField === "name") cmp = a.name.localeCompare(b.name);
      else if (sortField === "progress") {
        const pctA = a.stats.totalTasks
          ? a.stats.completedTasks / a.stats.totalTasks
          : 0;
        const pctB = b.stats.totalTasks
          ? b.stats.completedTasks / b.stats.totalTasks
          : 0;
        cmp = pctA - pctB;
      } else if (sortField === "dueDate") {
        const da = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
        const db = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
        cmp = da - db;
      } else if (sortField === "priority") {
        cmp =
          (PRIORITY_ORDER[a.priority] ?? 0) - (PRIORITY_ORDER[b.priority] ?? 0);
      }
      return sortDir === "asc" ? cmp : -cmp;
    });

  const totalPages = Math.max(
    1,
    Math.ceil(filteredProjects.length / itemsPerPage)
  );
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedProjects = filteredProjects.slice(
    startIndex,
    startIndex + itemsPerPage
  );

  const tabCounts = {
    all: projects.length,
    active: projects.filter((p) => p.status !== "completed").length,
    completed: projects.filter((p) => p.status === "completed").length,
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, activeTab]);

  if (projects.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="rounded-full bg-gray-100 p-5 mb-4">
          <FolderOpen className="h-10 w-10 text-gray-400" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-1">
          No projects yet
        </h3>
        <p className="text-sm text-gray-500 max-w-xs">
          Create your first project to start tracking tasks, files, and
          progress.
        </p>
      </div>
    );
  }

  return (
    <div ref={tableRef}>
      <Card className="overflow-hidden">
        {/* Toolbar */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-200 bg-gray-50/50 flex-wrap">
          {/* Status tabs */}
          <div className="flex items-center gap-1">
            {STATUS_TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`cursor-pointer text-xs px-3 py-1.5 rounded-md transition-colors ${
                  activeTab === tab
                    ? "bg-white border border-gray-200 text-gray-900 shadow-sm font-medium"
                    : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                }`}
              >
                {TAB_LABELS[tab]}
                <span
                  className={`ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full ${
                    activeTab === tab
                      ? "bg-gray-100 text-gray-600"
                      : "text-gray-400"
                  }`}
                >
                  {tabCounts[tab]}
                </span>
              </button>
            ))}
          </div>

          <div className="relative flex-1 max-w-xs ml-auto">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
            <Input
              placeholder="Search projects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-8 text-sm"
            />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="cursor-pointer inline-flex items-center gap-1.5 text-xs text-gray-600 bg-white hover:bg-gray-100 border border-gray-200 rounded-md px-3 py-1.5 transition-colors">
                <ArrowUpDown className="h-3 w-3" />
                Sort
                {sortField !== "name" || sortDir !== "asc" ? (
                  <span className="ml-0.5 w-1.5 h-1.5 rounded-full bg-blue-500 inline-block" />
                ) : null}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {(
                [
                  { label: "Name (A–Z)", field: "name", dir: "asc" },
                  { label: "Name (Z–A)", field: "name", dir: "desc" },
                  {
                    label: "Progress (Highest)",
                    field: "progress",
                    dir: "desc",
                  },
                  { label: "Progress (Lowest)", field: "progress", dir: "asc" },
                  {
                    label: "Due Date (Earliest)",
                    field: "dueDate",
                    dir: "asc",
                  },
                  { label: "Due Date (Latest)", field: "dueDate", dir: "desc" },
                  {
                    label: "Priority (Highest)",
                    field: "priority",
                    dir: "desc",
                  },
                  { label: "Priority (Lowest)", field: "priority", dir: "asc" },
                ] as const
              ).map(({ label, field, dir }) => (
                <DropdownMenuItem
                  key={label}
                  onClick={() => {
                    setSortField(field);
                    setSortDir(dir);
                    setCurrentPage(1);
                  }}
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
              <button className="cursor-pointer inline-flex items-center gap-1.5 text-xs text-gray-600 bg-white hover:bg-gray-100 border border-gray-200 rounded-md px-3 py-1.5 transition-colors">
                <SlidersHorizontal className="h-3 w-3" />
                Filter
                {statusFilter !== "all" ? (
                  <span className="ml-0.5 w-1.5 h-1.5 rounded-full bg-blue-500 inline-block" />
                ) : null}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              {(
                [
                  { label: "All Status", value: "all" },
                  { label: "Active", value: "active" },
                  { label: "Inactive", value: "inactive" },
                  { label: "Completed", value: "completed" },
                ] as const
              ).map(({ label, value }) => (
                <DropdownMenuItem
                  key={value}
                  onClick={() => {
                    setStatusFilter(value);
                    setCurrentPage(1);
                  }}
                  className="flex items-center justify-between"
                >
                  {label}
                  {statusFilter === value && (
                    <CheckIcon className="h-3.5 w-3.5 text-blue-600" />
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-2.5">
                  <div className="flex items-center gap-1.5 text-xs text-gray-500 font-medium">
                    <FolderOpen className="h-3.5 w-3.5" />
                    Project
                  </div>
                </th>
                <th className="text-left px-4 py-2.5">
                  <div className="flex items-center gap-1.5 text-xs text-gray-500 font-medium">
                    <Briefcase className="h-3.5 w-3.5" />
                    Client
                  </div>
                </th>
                <th className="text-left px-4 py-2.5">
                  <div className="flex items-center gap-1.5 text-xs text-gray-500 font-medium">
                    <Target className="h-3.5 w-3.5" />
                    Status
                  </div>
                </th>
                <th className="text-left px-4 py-2.5 min-w-[140px]">
                  <div className="flex items-center gap-1.5 text-xs text-gray-500 font-medium">
                    <TrendingUp className="h-3.5 w-3.5" />
                    Progress
                  </div>
                </th>
                <th className="text-left px-4 py-2.5">
                  <div className="flex items-center gap-1.5 text-xs text-gray-500 font-medium">
                    <ListChecks className="h-3.5 w-3.5" />
                    Tasks
                  </div>
                </th>
                <th className="text-left px-4 py-2.5">
                  <div className="flex items-center gap-1.5 text-xs text-gray-500 font-medium">
                    <Calendar className="h-3.5 w-3.5" />
                    Due date
                  </div>
                </th>
                <th className="text-left px-4 py-2.5">
                  <div className="flex items-center gap-1.5 text-xs text-gray-500 font-medium">
                    <Flag className="h-3.5 w-3.5" />
                    Priority
                  </div>
                </th>
                <th className="w-10 px-2 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paginatedProjects.map((project) => {
                const pct = task_percentage({
                  completed: project.stats.completedTasks,
                  total: project.stats.totalTasks,
                });
                return (
                  <tr
                    key={project.id}
                    onClick={() => onSelect(project)}
                    className="cursor-pointer transition-colors hover:bg-gray-50 group"
                  >
                    <td className="px-4 py-3 align-middle">
                      <div className="flex items-center gap-2.5">
                        <span className="text-sm font-medium text-gray-900">
                          {project.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 align-middle">
                      {project.clientName && (
                        <ClientPill name={project.clientName} />
                      )}
                    </td>
                    <td className="px-4 py-3 align-middle">
                      <StatusBadge status={project.status} />
                    </td>
                    <td className="px-4 py-3 align-middle">
                      <div className="flex items-center gap-2 min-w-[120px]">
                        <Progress value={pct} className="h-1.5 flex-1" />
                        <span className="text-xs text-gray-500 w-7 text-right shrink-0">
                          {pct}%
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 align-middle">
                      <span className="inline-flex items-center text-xs px-2.5 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200 font-medium">
                        {project.stats.completedTasks}/
                        {project.stats.totalTasks}
                      </span>
                    </td>
                    <td className="px-4 py-3 align-middle">
                      {project.dueDate ? (
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <Clock className="h-3 w-3 shrink-0" />
                          {project.dueDate}
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 align-middle">
                      <PriorityBadge priority={project.priority} />
                    </td>
                    <td className="px-2 py-3 align-middle">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingProject(project);
                        }}
                        className="cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity inline-flex items-center justify-center h-7 w-7 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-200"
                        aria-label="Edit project"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filteredProjects.length === 0 && (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-12 text-center text-sm text-gray-400"
                  >
                    No projects found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 sm:px-6 py-3 border-t border-gray-200 bg-gray-50/50">
          <div className="text-xs text-gray-500">
            Showing {filteredProjects.length === 0 ? 0 : startIndex + 1}–
            {Math.min(startIndex + itemsPerPage, filteredProjects.length)} of{" "}
            {filteredProjects.length} projects
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
            <span className="px-2 py-1 text-xs text-gray-600">
              {currentPage} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="h-7 text-xs"
            >
              Next
              <ChevronRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          </div>
        </div>
      </Card>

      {editingProject && (
        <ProjectEditDialog
          project={editingProject}
          clients={clients}
          open={true}
          onOpenChange={(open) => {
            if (!open) setEditingProject(null);
          }}
        />
      )}
    </div>
  );
}
