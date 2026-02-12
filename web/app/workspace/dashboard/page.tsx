"use client";

import { motion } from "motion/react";
import { Card } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Progress } from "../../components/ui/progress";
import { Badge } from "../../components/ui/badge";
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

const recentAutomations = [
  {
    id: 1,
    name: "Invoice Reminder - DesignCo",
    status: "success",
    time: "2 hours ago",
    action: "Email sent",
  },
  {
    id: 2,
    name: "Client Onboarding - NewClient Corp",
    status: "success",
    time: "5 hours ago",
    action: "Welcome email & tasks created",
  },
  {
    id: 3,
    name: "Project Closure - OldProject Ltd",
    status: "success",
    time: "1 day ago",
    action: "Final invoice & feedback request sent",
  },
  {
    id: 4,
    name: "Invoice Reminder - TechCorp",
    status: "failed",
    time: "2 days ago",
    action: "Email failed - retrying",
  },
];

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export default function Dashboard() {
  const clientsNum = useQuery({
    queryKey: ["clients"],
    queryFn: async () => {
      const res = await axios.get("/api/clients");
      return res.data.length;
    },
  });

  const projectsNum = useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      const res = await axios.get("/api/projects/get-projects");
      return res.data.projects.length;
    },
  });

  const theStats = [
    {
      label: "Active Clients",
      value: clientsNum.data,
      icon: Users,
      color: "blue",
    },
    {
      label: "Active Projects",
      value: projectsNum.data,
      icon: FolderKanban,
      color: "green",
    },
    {
      label: "Tasks Completed",
      value: "142",
      icon: CheckSquare,
      color: "purple",
    },
    {
      label: "Automations Run",
      value: "89",
      icon: Zap,
      color: "orange",
    },
  ];

  const allProjects = useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      const res = await axios.get("/api/projects/get-projects");
      return res.data;
    },
  });

  const getTasks = useQuery({
    queryKey: ["allTasks"],
    queryFn: async () => {
      const res = await axios.get(`/api/tasks`);
      return res.data.map((t: { tasks: Task[]; projectName: string }) => ({
        ...t.tasks,
        projectName: t.projectName || "No Project",
      }));
    },
  });

  const projects: Project[] =
    allProjects.data?.projects?.map((p: Project) => {
      const isCompleted =
        p.stats.totalTasks > 0 && p.stats.completedTasks === p.stats.totalTasks;

      return {
        ...p,
        status: isCompleted ? "completed" : "active",
        health: isCompleted ? "completed" : p.health,
      };
    }) ?? [];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-1">
          Welcome back! Here&#39;s what’s happening today.
        </p>
      </div>

      {/* Stats */}
      <motion.div
        initial="hidden"
        animate="visible"
        variants={{
          visible: {
            transition: {
              staggerChildren: 0.1,
            },
          },
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
            {projects.slice(0, 3).map((project) => (
              <Link
                key={project.id}
                href={`/workspace/projects/${project.id}`}
                className="block"
              >
                <div
                  key={project.id}
                  className="space-y-3 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  <div className="flex">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <h3 className="text-gray-900">{project.name}</h3>
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
                      <p className="text-sm text-gray-600">
                        {project.clientName}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-900">
                        {task_percentage({
                          completed: project.stats.completedTasks,
                          total: project.stats.totalTasks,
                        })}
                        %
                      </p>
                      <p className="text-xs text-gray-500">
                        {project.stats.completedTasks}/
                        {project.stats.totalTasks} tasks
                      </p>
                    </div>
                  </div>
                  <Progress
                    value={task_percentage({
                      completed: project.stats.completedTasks,
                      total: project.stats.totalTasks,
                    })}
                  />
                  <div className="flex items-center text-xs text-gray-500">
                    <Clock className="h-3 w-3 mr-1" />
                    Due: {project.dueDate}
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
            {getTasks?.data?.slice(0, 3).map((task: Task) => (
              <Link key={task.id} href={`/workspace/tasks`} className="block">
                <div
                  key={task.id}
                  className="flex items-start space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  <div className="flex-shrink-0 mt-0.5">
                    <div className="h-5 w-5 rounded border-2 border-gray-300"></div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <p className="text-gray-900">{task.title}</p>
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
                        {task.priority}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600">{task.projectName}</p>
                    <p className="text-xs text-gray-500 mt-1">{task.dueDate}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </Card>
      </div>

      {/* Recent Automations */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl text-gray-900">Recent Automations</h2>
          <Button variant="ghost" size="sm">
            <Link href="/workspace/logs">View Logs</Link>
          </Button>
        </div>

        <div className="space-y-3">
          {recentAutomations.map((automation) => (
            <div
              key={automation.id}
              className="flex items-center justify-between p-4 rounded-lg border border-gray-200 hover:shadow-sm transition-shadow"
            >
              <div className="flex items-center space-x-4">
                <div
                  className={`p-2 rounded-lg ${
                    automation.status === "success"
                      ? "bg-green-100"
                      : "bg-red-100"
                  }`}
                >
                  <Zap
                    className={`h-5 w-5 ${
                      automation.status === "success"
                        ? "text-green-600"
                        : "text-red-600"
                    }`}
                  />
                </div>
                <div>
                  <p className="text-gray-900">{automation.name}</p>
                  <p className="text-sm text-gray-600">{automation.action}</p>
                </div>
              </div>
              <div className="text-right">
                <Badge
                  className={
                    automation.status === "success"
                      ? "bg-green-100 text-green-700"
                      : "bg-red-100 text-red-700"
                  }
                >
                  {automation.status}
                </Badge>
                <p className="text-xs text-gray-500 mt-1">{automation.time}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
