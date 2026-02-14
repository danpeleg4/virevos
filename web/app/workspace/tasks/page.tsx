"use client";

import { useState } from "react";
import { Card } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Input } from "../../components/ui/input";
import { Checkbox } from "../../components/ui/checkbox";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../../components/ui/tabs";
import { Search, Flag } from "lucide-react";
import { TaskDetailModal } from "../../components/TaskDetailModal";
import axios from "axios";
import AddNewTask from "@/app/components/AddNewTask";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { updateTaskStatus } from "@/lib/server_actions/tasks";
import {Task} from "@/types/tasks";

export default function Tasks() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [selectedTask, setSelectedTask] = useState<Task>();
  const [taskDetailOpen, setTaskDetailOpen] = useState(false);

  const queryClient = useQueryClient();

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

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
    setTaskDetailOpen(true);
  };

  const filteredTasks = getTasks?.data?.filter((task: Task) => {
    const matchesSearch = task.title
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchesTab =
      activeTab === "all" ||
      (activeTab === "todo" && task.status === "todo") ||
      (activeTab === "in-progress" && task.status === "in-progress") ||
      (activeTab === "completed" && task.status === "completed");
    return matchesSearch && matchesTab;
  });

  const taskCounts = {
    all: getTasks?.data?.length,
    todo: getTasks?.data?.filter((t: Task) => t.status === "todo").length,
    inProgress: getTasks?.data?.filter((t: Task) => t.status === "in-progress")
      .length,
    completed: getTasks?.data?.filter((t: Task) => t.status === "completed")
      .length,
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl text-gray-900">Tasks</h1>
          <p className="text-gray-600 mt-1">Manage your tasks and to-dos</p>
        </div>
        <AddNewTask />
      </div>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Search tasks..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger className="cursor-pointer" value="all">
            All ({taskCounts.all})
          </TabsTrigger>
          <TabsTrigger className="cursor-pointer" value="todo">
            To Do ({taskCounts.todo})
          </TabsTrigger>
          <TabsTrigger className="cursor-pointer" value="in-progress">
            In Progress ({taskCounts.inProgress})
          </TabsTrigger>
          <TabsTrigger className="cursor-pointer" value="completed">
            Completed ({taskCounts.completed})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          <Card className="divide-y">
            {filteredTasks?.map((task: Task) => (
              <div
                key={task.id}
                className="p-4 hover:bg-gray-50 transition-colors cursor-pointer"
                onClick={() => handleTaskClick(task)}
              >
                <div className="flex items-start space-x-4">
                  <Checkbox
                    checked={task.status === "completed"}
                    onCheckedChange={(checked) =>
                      changeTaskStatus.mutate({
                        status: checked ? "completed" : "todo",
                        taskId: task.id,
                      })
                    }
                    className="mt-1"
                    onClick={(e) => e.stopPropagation()}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h3
                          className={`text-gray-900 ${
                            task.status === "completed"
                              ? "line-through text-gray-500"
                              : ""
                          }`}
                        >
                          {task.title}
                        </h3>
                        <p className="text-sm text-gray-600 mt-1">
                          {task.projectName}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2 ml-4">
                        <Badge
                          variant="outline"
                          className={
                            task.priority === "high"
                              ? "border-red-200 text-red-700"
                              : task.priority === "medium"
                                ? "border-yellow-200 text-yellow-700"
                                : "border-gray-200 text-gray-700"
                          }
                        >
                          <Flag className="h-3 w-3 mr-1" />
                          {task.priority}
                        </Badge>
                        <Badge
                          className={
                            task.status === "completed"
                              ? "bg-green-100 text-green-700"
                              : task.status === "in-progress"
                                ? "bg-blue-100 text-blue-700"
                                : "bg-gray-100 text-gray-700"
                          }
                        >
                          {task.status === "in-progress"
                            ? "In Progress"
                            : task.status === "completed"
                              ? "Completed"
                              : "To Do"}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {filteredTasks?.length === 0 && (
              <div className="p-12 text-center">
                <p className="text-gray-500">No tasks found</p>
              </div>
            )}
          </Card>
        </TabsContent>
      </Tabs>

      {/* Task Detail Modal */}
      <TaskDetailModal
        task={selectedTask!}
        open={taskDetailOpen}
        onOpenChange={setTaskDetailOpen}
      />
    </div>
  );
}
