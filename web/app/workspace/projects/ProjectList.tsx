"use client";

import { Card } from "@/app/components/ui/card";
import { Input } from "@/app/components/ui/input";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/app/components/ui/tabs";
import {
  AlertCircle,
  CheckCircle,
  Clock,
  FolderOpen,
  Search,
  TrendingUp,
} from "lucide-react";
import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";
import { task_percentage } from "@/lib/task_percentage";
import { Progress } from "@/app/components/ui/progress";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
} from "@/app/components/ui/pagination";
import { useState, useEffect } from "react";
import { Project } from "@/types/projects";

const ITEMS_PER_PAGE = 9;

interface ProjectListProps {
  projects: Project[];
  onSelect: (project: Project) => void;
}

export function ProjectList({ projects, onSelect }: ProjectListProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);

  const filteredProjects = projects.filter((project) => {
    const matchesSearch = project.name
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchesTab =
      activeTab === "all" ||
      (activeTab === "active" && project.status !== "completed") ||
      (activeTab === "completed" && project.status === "completed");
    return matchesSearch && matchesTab;
  });

  const totalPages = Math.max(1, Math.ceil(filteredProjects.length / ITEMS_PER_PAGE));
  const paginatedProjects = filteredProjects.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // Reset to page 1 when search or tab changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, activeTab]);

  const getPageNumbers = () => {
    const pages: (number | "ellipsis")[] = [];
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push("ellipsis");
      for (
        let i = Math.max(2, currentPage - 1);
        i <= Math.min(totalPages - 1, currentPage + 1);
        i++
      ) {
        pages.push(i);
      }
      if (currentPage < totalPages - 2) pages.push("ellipsis");
      pages.push(totalPages);
    }
    return pages;
  };

  return (
    <div className="relative">
      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Search projects..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="overflow-x-auto pb-1">
          <TabsList className="min-w-max">
            <TabsTrigger className="cursor-pointer" value="all">
              All Projects ({projects.length})
            </TabsTrigger>
            <TabsTrigger className="cursor-pointer" value="active">
              Active ({projects.filter((p) => p.status !== "completed").length})
            </TabsTrigger>
            <TabsTrigger className="cursor-pointer" value="completed">
              Completed (
              {projects.filter((p) => p.status === "completed").length})
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value={activeTab} className="mt-6">
          {projects.length === 0 ? (
            /* Empty state — no projects exist yet */
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
          ) : filteredProjects.length === 0 ? (
            /* Empty state — search/filter returned nothing */
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="rounded-full bg-gray-100 p-5 mb-4">
                <Search className="h-10 w-10 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-1">
                No projects found
              </h3>
              <p className="text-sm text-gray-500 max-w-xs">
                Try adjusting your search or switching tabs.
              </p>
            </div>
          ) : (
            <>
              <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
                {paginatedProjects.map((project) => (
                  <Card
                    key={project.id}
                    className="p-4 sm:p-6 hover:shadow-lg transition-shadow cursor-pointer"
                    onClick={() => onSelect(project)}
                  >
                    <div className="flex items-start justify-between mb-4 gap-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-base sm:text-lg text-gray-900 mb-1 truncate">
                          {project.name}
                        </h3>
                        <p className="text-sm text-gray-600 truncate">
                          {project.clientName}
                        </p>
                      </div>
                      <Badge
                        variant="outline"
                        className={
                          project.health === "on-track"
                            ? "border-green-200 text-green-700 shrink-0"
                            : project.health === "at-risk"
                              ? "border-orange-200 text-orange-700 shrink-0"
                              : "border-blue-200 text-blue-700 shrink-0"
                        }
                      >
                        {project.health === "on-track" && (
                          <TrendingUp className="h-3 w-3 mr-1" />
                        )}
                        {project.health === "at-risk" && (
                          <AlertCircle className="h-3 w-3 mr-1" />
                        )}
                        {project.health === "completed" && (
                          <CheckCircle className="h-3 w-3 mr-1" />
                        )}
                        {project.health === "on-track"
                          ? "On Track"
                          : project.health === "at-risk"
                            ? "At Risk"
                            : "Completed"}
                      </Badge>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm text-gray-600">
                            Progress
                          </span>
                          <span className="text-sm text-gray-900">
                            {task_percentage({
                              completed: project.stats.completedTasks,
                              total: project.stats.totalTasks,
                            })}
                            %
                          </span>
                        </div>
                        <Progress
                          value={task_percentage({
                            completed: project.stats.completedTasks,
                            total: project.stats.totalTasks,
                          })}
                        />
                      </div>

                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Tasks</span>
                        <span className="text-gray-900">
                          {project.stats.completedTasks}/
                          {project.stats.totalTasks}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-sm pt-4 border-t">
                        <div className="flex items-center text-gray-600">
                          <Clock className="h-4 w-4 mr-1 shrink-0" />
                          <span className="truncate">Due {project.dueDate}</span>
                        </div>
                        <Badge
                          variant="outline"
                          className={
                            project.priority === "high"
                              ? "border-red-200 text-red-700 shrink-0 ml-2"
                              : project.priority === "medium"
                                ? "border-yellow-200 text-yellow-700 shrink-0 ml-2"
                                : "border-gray-200 text-gray-700 shrink-0 ml-2"
                          }
                        >
                          {project.priority}
                        </Badge>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <p className="text-sm text-gray-500 order-2 sm:order-1">
                    Showing{" "}
                    {(currentPage - 1) * ITEMS_PER_PAGE + 1}–
                    {Math.min(currentPage * ITEMS_PER_PAGE, filteredProjects.length)}{" "}
                    of {filteredProjects.length} projects
                  </p>
                  <Pagination className="w-auto order-1 sm:order-2">
                    <PaginationContent>
                      <PaginationItem>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            setCurrentPage((p) => Math.max(1, p - 1))
                          }
                          disabled={currentPage === 1}
                          className="gap-1 px-2.5"
                        >
                          Previous
                        </Button>
                      </PaginationItem>

                      {getPageNumbers().map((page, idx) =>
                        page === "ellipsis" ? (
                          <PaginationItem key={`ellipsis-${idx}`}>
                            <PaginationEllipsis />
                          </PaginationItem>
                        ) : (
                          <PaginationItem key={page}>
                            <Button
                              variant={
                                currentPage === page ? "outline" : "ghost"
                              }
                              size="icon"
                              className="size-9"
                              onClick={() => setCurrentPage(page)}
                              aria-current={
                                currentPage === page ? "page" : undefined
                              }
                            >
                              {page}
                            </Button>
                          </PaginationItem>
                        )
                      )}

                      <PaginationItem>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            setCurrentPage((p) => Math.min(totalPages, p + 1))
                          }
                          disabled={currentPage === totalPages}
                          className="gap-1 px-2.5"
                        >
                          Next
                        </Button>
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              )}
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
