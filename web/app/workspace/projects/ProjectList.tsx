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
  Search,
  TrendingUp,
} from "lucide-react";
import { Badge } from "@/app/components/ui/badge";
import { task_percentage } from "@/lib/task_percentage";
import { Progress } from "@/app/components/ui/progress";
import { useState } from "react";
import { Project } from "@/types/projects";

interface ProjectListProps {
  projects: Project[];
  onSelect: (project: Project) => void;
}

export function ProjectList({ projects, onSelect }: ProjectListProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");

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

  return (
    <>
      <div className="relative">
        <>
          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search projects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger className="cursor-pointer" value="all">
                All Projects ({projects.length})
              </TabsTrigger>

              <TabsTrigger className="cursor-pointer" value="active">
                Active (
                {projects.filter((p) => p.status !== "completed").length})
              </TabsTrigger>

              <TabsTrigger className="cursor-pointer" value="completed">
                Completed (
                {projects.filter((p) => p.status === "completed").length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="mt-6">
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {filteredProjects.map((project) => (
                  <Card
                    key={project.name}
                    className="p-6 hover:shadow-lg transition-shadow cursor-pointer"
                    onClick={() => onSelect(project)}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="text-lg text-gray-900 mb-1">
                          {project.name}
                        </h3>
                        <p className="text-sm text-gray-600">
                          {project.clientName}
                        </p>
                      </div>
                      <Badge
                        variant="outline"
                        className={
                          project.health === "on-track"
                            ? "border-green-200 text-green-700"
                            : project.health === "at-risk"
                              ? "border-orange-200 text-orange-700"
                              : "border-blue-200 text-blue-700"
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
                          <Clock className="h-4 w-4 mr-1" />
                          Due {project.dueDate}
                        </div>
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
                          {project.priority}
                        </Badge>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
              {projects?.length === 0 && (
                <div className="p-12 text-center">
                  <p className="text-gray-500">No projects found</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </>
      </div>
    </>
  );
}
