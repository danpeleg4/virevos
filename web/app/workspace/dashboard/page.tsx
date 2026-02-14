"use client";

import { motion } from "motion/react";
import { Card } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Progress } from "@/app/components/ui/progress";
import { Badge } from "@/app/components/ui/badge";
import {
  Users,
  FolderKanban,
  CheckSquare,
  Zap,
  TrendingUp,
  Clock,
  AlertCircle,
  CheckCircle,
} from "lucide-react";
import Link from "next/link";
import axios from "axios";
import { task_percentage } from "@/lib/task_percentage";
import { useQuery } from "@tanstack/react-query";
import { Project } from "@/types/projects";
import Task from "@/types/tasks";

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export default function Dashboard() {
  // Fetch clients count
  const clientsQuery = useQuery({
    queryKey: ["clients"],
    queryFn: async () => {
      const res = await axios.get("/api/clients");
      return Array.isArray(res.data) ? res.data.length : 0;
    },
  });

  // Fetch projects count and all projects
  const projectsQuery = useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      const res = await axios.get("/api/projects/get-projects");
      return res.data?.projects ?? [];
    },
  });

  const allProjects: Project[] = Array.isArray(projectsQuery.data)
      ? projectsQuery.data.map((p: Project) => {
        const isCompleted =
            p.stats.totalTasks > 0 && p.stats.completedTasks === p.stats.totalTasks;
        return {
          ...p,
          status: isCompleted ? "completed" : "active",
          health: isCompleted ? "completed" : p.health,
        };
      })
      : [];

  // Fetch tasks and flatten
  const tasksQuery = useQuery({
    queryKey: ["allTasks"],
    queryFn: async () => {
      const res = await axios.get("/api/tasks");
      if (!Array.isArray(res.data)) return [];
      return res.data.flatMap(
          (t: { tasks: Task[]; projectName: string }) =>
              t.tasks.map((task: Task) => ({
                ...task,
                projectName: t.projectName || "No Project",
              }))
      );
    },
  });

  const tasks: Task[] = tasksQuery.data ?? [];

  // Stats for dashboard cards
  const theStats = [
    {
      label: "Active Clients",
      value: clientsQuery.data ?? 0,
      icon: Users,
      color: "blue",
    },
    {
      label: "Active Projects",
      value: allProjects.length,
      icon: FolderKanban,
      color: "green",
    },
    {
      label: "Tasks Completed",
      value: tasks.length,
      icon: CheckSquare,
      color: "purple",
    },
    {
      label: "Automations Run",
      value: 89,
      icon: Zap,
      color: "orange",
    },
  ];

  return (
      <div className="p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-1">
            Welcome back! Here’s what’s happening today.
          </p>
        </div>

        {/* Stats */}
        <motion.div
            initial="hidden"
            animate="visible"
            variants={{
              visible: { transition: { staggerChildren: 0.1 } },
            }}
            className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4"
        >
          {theStats.map((stat, index) => (
              <motion.div key={index} variants={fadeInUp}>
                <Card className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div
                        className={`p-3 rounded-lg ${
                            stat.color === "blue"
                                ? "bg-blue-100"
                                : stat.color === "green"
                                    ? "bg-green-100"
                                    : stat.color === "purple"
                                        ? "bg-purple-100"
                                        : "bg-orange-100"
                        }`}
                    >
                      <stat.icon
                          className={`h-6 w-6 ${
                              stat.color === "blue"
                                  ? "text-blue-600"
                                  : stat.color === "green"
                                      ? "text-green-600"
                                      : stat.color === "purple"
                                          ? "text-purple-600"
                                          : "text-orange-600"
                          }`}
                      />
                    </div>
                  </div>
                  <p className="text-2xl text-gray-900 mb-1">{stat.value}</p>
                  <p className="text-sm text-gray-600">{stat.label}</p>
                </Card>
              </motion.div>
          ))}
        </motion.div>

        {/* Recent Projects & Tasks */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Recent Projects */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl text-gray-900">Recent Projects</h2>
              <Button variant="ghost" size="sm">
                <Link href="/workspace/projects">View All</Link>
              </Button>
            </div>

            <div className="space-y-4">
              {allProjects.slice(0, 3).map((project) => (
                  <Link
                      key={project.id}
                      href={`/workspace/projects/${project.id}`}
                      className="block"
                  >
                    <div className="space-y-3 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer p-3">
                      <div className="flex justify-between">
                        <div>
                          <div className="flex items-center space-x-2 mb-1">
                            <h3 className="text-gray-900">{project.name ?? "Untitled"}</h3>
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
                          <p className="text-sm text-gray-600">{project.clientName ?? "Unknown Client"}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-900">
                            {task_percentage({
                              completed: project.stats.completedTasks ?? 0,
                              total: project.stats.totalTasks ?? 0,
                            })}
                            %
                          </p>
                          <p className="text-xs text-gray-500">
                            {project.stats.completedTasks ?? 0}/
                            {project.stats.totalTasks ?? 0} tasks
                          </p>
                        </div>
                      </div>
                      <Progress
                          value={task_percentage({
                            completed: project.stats.completedTasks ?? 0,
                            total: project.stats.totalTasks ?? 0,
                          })}
                      />
                      <div className="flex items-center text-xs text-gray-500">
                        <Clock className="h-3 w-3 mr-1" />
                        Due: {project.dueDate ?? "No due date"}
                      </div>
                    </div>
                  </Link>
              ))}
            </div>
          </Card>

          {/* Upcoming Tasks */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl text-gray-900">Upcoming Tasks</h2>
              <Button variant="ghost" size="sm">
                <Link href="/workspace/tasks">View All</Link>
              </Button>
            </div>

            <div className="space-y-3">
              {tasks.slice(0, 3).map((task) => (
                  <Link key={task.id} href={`/workspace/tasks`} className="block">
                    <div className="flex items-start space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer">
                      <div className="flex-shrink-0 mt-0.5">
                        <div className="h-5 w-5 rounded border-2 border-gray-300"></div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-1">
                          <p className="text-gray-900">{task.title ?? "Untitled"}</p>
                          <Badge
                              variant="outline"
                              className={`text-xs ${
                                  task.priority === "high"
                                      ? "border-red-200 text-red-700"
                                      : task.priority === "medium"
                                          ? "border-yellow-200 text-yellow-700"
                                          : "border-gray-200 text-gray-700"
                              }`}
                          >
                            {task.priority ?? "none"}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600">{task.projectName ?? "No Project"}</p>
                        <p className="text-xs text-gray-500 mt-1">{task.dueDate ?? "No due date"}</p>
                      </div>
                    </div>
                  </Link>
              ))}
            </div>
          </Card>
        </div>
      </div>
  );
}
