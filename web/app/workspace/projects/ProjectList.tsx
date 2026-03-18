"use client";

import { useState, useEffect, useRef } from "react";
import { Card } from "@/app/components/ui/card";
import { Input } from "@/app/components/ui/input";
import { Button } from "@/app/components/ui/button";
import {
  AlertCircle,
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
} from "lucide-react";
import { task_percentage } from "@/lib/task_percentage";
import { Progress } from "@/app/components/ui/progress";
import { Project } from "@/types/projects";

const ROW_HEIGHT = 52;

const STATUS_TABS = ["all", "active", "completed"] as const;
type StatusTab = (typeof STATUS_TABS)[number];

const TAB_LABELS: Record<StatusTab, string> = {
  all: "All Projects",
  active: "Active",
  completed: "Completed",
};

function HealthBadge({ health }: { health: string }) {
  if (health === "on-track") {
    return (
      <span className="inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-md font-medium bg-green-50 text-green-700 border border-green-200">
        <TrendingUp className="h-3 w-3" />
        On Track
      </span>
    );
  }
  if (health === "at-risk") {
    return (
      <span className="inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-md font-medium bg-orange-50 text-orange-700 border border-orange-200">
        <AlertCircle className="h-3 w-3" />
        At Risk
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-md font-medium bg-blue-50 text-blue-700 border border-blue-200">
      <CheckCircle className="h-3 w-3" />
      Completed
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
    <span className={`inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-md font-medium ${styles}`}>
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
  onSelect: (project: Project) => void;
}

export function ProjectList({ projects, onSelect }: ProjectListProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<StatusTab>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(8);
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

  const filteredProjects = projects.filter((project) => {
    const matchesSearch = project.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTab =
      activeTab === "all" ||
      (activeTab === "active" && project.status !== "completed") ||
      (activeTab === "completed" && project.status === "completed");
    return matchesSearch && matchesTab;
  });

  const totalPages = Math.max(1, Math.ceil(filteredProjects.length / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedProjects = filteredProjects.slice(startIndex, startIndex + itemsPerPage);

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
        <h3 className="text-lg font-medium text-gray-900 mb-1">No projects yet</h3>
        <p className="text-sm text-gray-500 max-w-xs">
          Create your first project to start tracking tasks, files, and progress.
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
                    activeTab === tab ? "bg-gray-100 text-gray-600" : "text-gray-400"
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
          <button className="cursor-pointer inline-flex items-center gap-1.5 text-xs text-gray-600 bg-white hover:bg-gray-100 border border-gray-200 rounded-md px-3 py-1.5 transition-colors">
            <ArrowUpDown className="h-3 w-3" />
            Sort
          </button>
          <button className="cursor-pointer inline-flex items-center gap-1.5 text-xs text-gray-600 bg-white hover:bg-gray-100 border border-gray-200 rounded-md px-3 py-1.5 transition-colors">
            <SlidersHorizontal className="h-3 w-3" />
            Filter
          </button>
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
                    Health
                  </div>
                </th>
                <th className="text-left px-4 py-2.5 min-w-[140px]">
                  <div className="flex items-center gap-1.5 text-xs text-gray-500 font-medium">
                    Progress
                  </div>
                </th>
                <th className="text-left px-4 py-2.5">
                  <div className="flex items-center gap-1.5 text-xs text-gray-500 font-medium">
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
                    <td className="px-4 py-3">
                      <span className="text-sm font-medium text-gray-900">
                        {project.name}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {project.clientName && (
                        <ClientPill name={project.clientName} />
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <HealthBadge health={project.health} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 min-w-[120px]">
                        <Progress value={pct} className="h-1.5 flex-1" />
                        <span className="text-xs text-gray-500 w-7 text-right shrink-0">
                          {pct}%
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center text-xs px-2.5 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200 font-medium">
                        {project.stats.completedTasks}/{project.stats.totalTasks}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <Clock className="h-3 w-3 shrink-0" />
                        {project.dueDate ?? "—"}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <PriorityBadge priority={project.priority} />
                    </td>
                  </tr>
                );
              })}
              {filteredProjects.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-sm text-gray-400">
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
    </div>
  );
}
