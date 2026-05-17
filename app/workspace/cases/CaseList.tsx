"use client";

import { useState, useEffect, useRef } from "react";
import { Card } from "@/app/components/ui/card";
import { Input } from "@/app/components/ui/input";
import { Button } from "@/app/components/ui/button";
import { ClientPill } from "@/app/components/ui/client-pill";
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
import { task_percentage } from "@/lib/util/task_percentage";
import { Progress } from "@/app/components/ui/progress";
import { Case } from "@/types/cases";
import type { clients } from "@/types/clients";
import { CaseEditDialog } from "./CaseEditDialog";
import { CaseCreateDialog } from "@/app/workspace/cases/CaseCreateDialog";

const ROW_HEIGHT = 52;

const STATUS_TABS = ["all", "active", "completed"] as const;
type StatusTab = (typeof STATUS_TABS)[number];

const TAB_LABELS: Record<StatusTab, string> = {
  all: "All Cases",
  active: "Active",
  completed: "Completed",
};

function StatusBadge({ status }: { status: string }) {
  if (status === "completed") {
    return (
      <span className="inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-md font-medium bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
        <CheckCircle className="h-3 w-3" />
        Completed
      </span>
    );
  }
  if (status === "inactive") {
    return (
      <span className="inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-md font-medium bg-muted text-muted-foreground border border-border">
        <Clock className="h-3 w-3" />
        Inactive
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-md font-medium bg-green-50 dark:bg-green-950/50 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800">
      <TrendingUp className="h-3 w-3" />
      Active
    </span>
  );
}

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

interface CaseListProps {
  cases: Case[];
  clients: clients[];
  onSelect: (aCase: Case) => void;
}

export function CaseList({ cases, clients, onSelect }: CaseListProps) {
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
  const [editingCase, setEditingCase] = useState<Case | null>(null);
  const tableRef = useRef<HTMLDivElement>(null);

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

  const PRIORITY_ORDER: Record<string, number> = { high: 3, medium: 2, low: 1 };

  const filteredCases = cases
    .filter((aCase) => {
      const matchesSearch = aCase.name
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
      const matchesTab =
        activeTab === "all" ||
        (activeTab === "active" && aCase.status !== "completed") ||
        (activeTab === "completed" && aCase.status === "completed");
      const matchesHealth =
        statusFilter === "all" || aCase.status === statusFilter;
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
    Math.ceil(filteredCases.length / itemsPerPage)
  );
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedCases = filteredCases.slice(
    startIndex,
    startIndex + itemsPerPage
  );

  const tabCounts = {
    all: cases.length,
    active: cases.filter((p) => p.status !== "completed").length,
    completed: cases.filter((p) => p.status === "completed").length,
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, activeTab]);

  return (
    <div ref={tableRef} className="flex-1 min-h-0 flex flex-col">
      <Card className="overflow-hidden flex flex-col h-full">
        {/* Toolbar */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-muted/50 flex-wrap">
          {/* Status tabs */}
          <div className="flex items-center gap-1">
            {STATUS_TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
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
                  {tabCounts[tab]}
                </span>
              </button>
            ))}
          </div>

          <div className="relative flex-1 max-w-xs ml-auto">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search cases..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-8 text-sm"
            />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="cursor-pointer inline-flex items-center gap-1.5 text-xs text-muted-foreground bg-card hover:bg-accent border border-border rounded-md px-3 py-1.5 transition-colors">
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
              <button className="cursor-pointer inline-flex items-center gap-1.5 text-xs text-muted-foreground bg-card hover:bg-accent border border-border rounded-md px-3 py-1.5 transition-colors">
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
          <CaseCreateDialog clients={clients} />
        </div>
        {cases.length === 0 ? (
          <div className="flex flex-col items-center justify-center flex-1 text-center">
            <div className="rounded-full bg-muted p-5 mb-4">
              <FolderOpen className="h-10 w-10 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium text-foreground mb-1">
              No cases yet
            </h3>
            <p className="text-sm text-muted-foreground max-w-xs">
              Create your first case to start tracking tasks, files, and
              progress.
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto flex-1">
              <table className="w-full">
                <thead className="border-b border-border">
                  <tr>
                    <th className="text-left px-4 py-2.5">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                        <FolderOpen className="h-3.5 w-3.5" />
                        Case
                      </div>
                    </th>
                    <th className="text-left px-4 py-2.5">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                        <Briefcase className="h-3.5 w-3.5" />
                        Client
                      </div>
                    </th>
                    <th className="text-left px-4 py-2.5">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                        <Target className="h-3.5 w-3.5" />
                        Status
                      </div>
                    </th>
                    <th className="text-left px-4 py-2.5 min-w-[140px]">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                        <TrendingUp className="h-3.5 w-3.5" />
                        Progress
                      </div>
                    </th>
                    <th className="text-left px-4 py-2.5">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                        <ListChecks className="h-3.5 w-3.5" />
                        Tasks
                      </div>
                    </th>
                    <th className="text-left px-4 py-2.5">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                        <Calendar className="h-3.5 w-3.5" />
                        Due date
                      </div>
                    </th>
                    <th className="text-left px-4 py-2.5">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                        <Flag className="h-3.5 w-3.5" />
                        Priority
                      </div>
                    </th>
                    <th className="w-10 px-2 py-2.5" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {paginatedCases.map((aCase) => {
                    const pct = task_percentage({
                      completed: aCase.stats.completedTasks,
                      total: aCase.stats.totalTasks,
                    });
                    return (
                      <tr
                        key={aCase.id}
                        onClick={() => onSelect(aCase)}
                        className="cursor-pointer transition-colors hover:bg-muted/50 group"
                      >
                        <td className="px-4 py-3 align-middle">
                          <div className="flex items-center gap-2.5">
                            <span className="text-sm font-medium text-foreground">
                              {aCase.name}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 align-middle">
                          {aCase.clientName && (
                            <ClientPill name={aCase.clientName} />
                          )}
                        </td>
                        <td className="px-4 py-3 align-middle">
                          <StatusBadge status={aCase.status} />
                        </td>
                        <td className="px-4 py-3 align-middle">
                          <div className="flex items-center gap-2 min-w-[120px]">
                            <Progress value={pct} className="h-1.5 flex-1" />
                            <span className="text-xs text-muted-foreground w-7 text-right shrink-0">
                              {pct}%
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 align-middle">
                          <span className="inline-flex items-center text-xs px-2.5 py-0.5 rounded-md bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 font-medium">
                            {aCase.stats.completedTasks}/
                            {aCase.stats.totalTasks}
                          </span>
                        </td>
                        <td className="px-4 py-3 align-middle">
                          {aCase.dueDate ? (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Clock className="h-3 w-3 shrink-0" />
                              {aCase.dueDate}
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              —
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 align-middle">
                          <PriorityBadge priority={aCase.priority} />
                        </td>
                        <td className="px-2 py-3 align-middle">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingCase(aCase);
                            }}
                            className="cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity inline-flex items-center justify-center h-7 w-7 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent"
                            aria-label="Edit case"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredCases.length === 0 && (
                    <tr>
                      <td
                        colSpan={8}
                        className="px-4 py-12 text-center text-sm text-muted-foreground"
                      >
                        No cases found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 sm:px-6 py-3 border-t border-border bg-muted/50">
              <div className="text-xs text-muted-foreground">
                Showing {filteredCases.length === 0 ? 0 : startIndex + 1}–
                {Math.min(startIndex + itemsPerPage, filteredCases.length)} of{" "}
                {filteredCases.length} cases
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
                  {currentPage} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setCurrentPage((p) => Math.min(totalPages, p + 1))
                  }
                  disabled={currentPage === totalPages}
                  className="h-7 text-xs"
                >
                  Next
                  <ChevronRight className="h-3.5 w-3.5 ml-1" />
                </Button>
              </div>
            </div>
          </>
        )}
      </Card>

      {editingCase && (
        <CaseEditDialog
          aCase={editingCase}
          clients={clients}
          open={true}
          onOpenChange={(open) => {
            if (!open) setEditingCase(null);
          }}
        />
      )}
    </div>
  );
}
