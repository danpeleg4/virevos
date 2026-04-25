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
  Clock,
  CheckCircle,
} from "lucide-react";
import Link from "next/link";
import axios from "axios";
import { useRouter } from "next/navigation";
import { task_percentage } from "@/lib/task_percentage";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Case } from "@/types/cases";
import { Task } from "@/types/tasks";
import { updateTaskStatus } from "@/lib/tasks";
import { Checkbox } from "@/app/components/ui/checkbox";

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export default function Dashboard() {
  const queryClient = useQueryClient();
  const router = useRouter();

  // Fetch clients count
  const clientsQuery = useQuery({
    queryKey: ["clients"],
    queryFn: async () => {
      const res = await axios.get("/api/clients");
      return res.data;
    },
  });

  const clientsCount = Array.isArray(clientsQuery.data)
    ? clientsQuery.data.length
    : 0;

  // Fetch cases count and all cases
  const casesQuery = useQuery({
    queryKey: ["cases"],
    queryFn: async () => {
      const res = await axios.get("/api/cases/get-cases");
      return res.data;
    },
  });

  const allCases: Case[] = Array.isArray(casesQuery.data?.cases)
    ? casesQuery.data.cases.map((p: Case) => {
        const isCompleted =
          p.stats.totalTasks > 0 &&
          p.stats.completedTasks === p.stats.totalTasks;
        return {
          ...p,
          status: isCompleted ? "completed" : "active",
        };
      })
    : [];

  // Fetch tasks and flatten
  const tasksQuery = useQuery({
    queryKey: ["allTasks"],
    queryFn: async () => {
      const res = await axios.get("/api/tasks");
      if (!Array.isArray(res.data)) return [];
      return res.data.map((t: { tasks: Task; caseName: string }) => ({
        ...t.tasks,
        caseName: t.caseName || "No Case",
      }));
    },
  });

  const tasks: Task[] = tasksQuery.data ?? [];

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
        queryKey: ["allTasks"],
      });

      const previousTasks = queryClient.getQueryData<Task[]>(["allTasks"]);

      // Update ONLY the task, keep order
      queryClient.setQueryData<Task[]>(["allTasks"], (old) =>
        old?.map((task) => (task.id === taskId ? { ...task, status } : task))
      );

      return { previousTasks };
    },

    onError: (_err, _vars, context) => {
      // rollback if API fails
      queryClient.setQueryData(["allTasks"], context?.previousTasks);
    },
  });

  // Stats for dashboard cards
  const theStats = [
    {
      label: "Active Clients",
      value: clientsCount,
      icon: Users,
      color: "blue",
    },
    {
      label: "Active Cases",
      value: allCases.length,
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
      value: 0,
      icon: Zap,
      color: "orange",
    },
  ];

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Welcome back! Here’s what’s happening today.
          </p>
        </div>
      </div>

      {/* Stats */}
      <motion.div
        initial="hidden"
        animate="visible"
        variants={{
          visible: { transition: { staggerChildren: 0.1 } },
        }}
        className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
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
              <p className="text-2xl text-foreground mb-1">{stat.value}</p>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      {/* Recent Projects & Tasks */}
      <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
        {/* Recent Cases */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl text-foreground">Recent Cases</h2>
            <Button variant="ghost" size="sm">
              <Link href="/workspace/cases">View All</Link>
            </Button>
          </div>

          <div className="space-y-4">
            {allCases.slice(0, 3).map((aCase) => (
              <Link
                key={aCase.id}
                href={`/workspace/cases/${aCase.id}`}
                className="block"
              >
                <div className="space-y-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer p-3">
                  <div className="flex justify-between">
                    <div>
                      <div className="flex items-center space-x-2 mb-1">
                        <h3 className="text-foreground">
                          {aCase.name ?? "Untitled"}
                        </h3>
                        <Badge
                          variant="outline"
                          className={
                            aCase.status === "completed"
                              ? "border-blue-200 text-blue-700"
                              : aCase.status === "inactive"
                                ? "border-border text-muted-foreground"
                                : "border-green-200 text-green-700"
                          }
                        >
                          {aCase.status === "completed" && (
                            <CheckCircle className="h-3 w-3 mr-1" />
                          )}
                          {aCase.status === "inactive"
                            ? "Inactive"
                            : aCase.status === "completed"
                              ? "Completed"
                              : "Active"}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {aCase.clientName ?? "Unknown Client"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-foreground">
                        {task_percentage({
                          completed: aCase.stats.completedTasks ?? 0,
                          total: aCase.stats.totalTasks ?? 0,
                        })}
                        %
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {aCase.stats.completedTasks ?? 0}/
                        {aCase.stats.totalTasks ?? 0} tasks
                      </p>
                    </div>
                  </div>
                  <Progress
                    value={task_percentage({
                      completed: aCase.stats.completedTasks ?? 0,
                      total: aCase.stats.totalTasks ?? 0,
                    })}
                  />
                  <div className="flex items-center text-xs text-muted-foreground">
                    <Clock className="h-3 w-3 mr-1" />
                    Due: {aCase.dueDate ?? "No due date"}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </Card>

        {/* Upcoming Tasks */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl text-foreground">Upcoming Tasks</h2>
            <Button variant="ghost" size="sm">
              <Link href="/workspace/tasks">View All</Link>
            </Button>
          </div>

          <div className="space-y-3">
            {tasks
              .filter((task) => task.status !== "completed")
              .slice(0, 3)
              .map((task) => (
                <div
                  key={task.id}
                  className="flex items-start space-x-3 p-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => router.push(`/workspace/tasks`)}
                >
                  <div className="flex-shrink-0 mt-0.5">
                    <Checkbox
                      checked={task.status === "completed"}
                      onCheckedChange={(checked) =>
                        changeTaskStatus.mutate({
                          status: checked ? "completed" : "todo",
                          taskId: task.id,
                        })
                      }
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <p className="text-foreground">
                        {task.title ?? "Untitled"}
                      </p>
                      <Badge
                        variant="outline"
                        className={`text-xs ${
                          task.priority === "high"
                            ? "border-red-200 text-red-700"
                            : task.priority === "medium"
                              ? "border-yellow-200 text-yellow-700"
                              : "border-border text-muted-foreground"
                        }`}
                      >
                        {task.priority ?? "none"}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {task.caseName ?? "No Case"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {task.dueDate ?? "No due date"}
                    </p>
                  </div>
                </div>
              ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
