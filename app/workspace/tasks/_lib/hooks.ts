"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import type { Task } from "@/types/tasks";

export const allTasksQueryKey = ["allTasks"] as const;
export const caseTasksQueryKey = (caseId?: number) =>
  ["caseTasks", caseId] as const;

interface RawTaskRow {
  tasks: Task;
  caseName: string | null;
}

/** All tasks across every case, with the case name flattened in. */
export function useAllTasks() {
  return useQuery<Task[]>({
    queryKey: allTasksQueryKey,
    queryFn: async () => {
      const res = await axios.get("/api/tasks");
      if (!Array.isArray(res.data)) return [];
      return (res.data as RawTaskRow[]).map((t) => ({
        ...t.tasks,
        caseName: t.caseName || "No Case",
      }));
    },
  });
}

/** Tasks belonging to a single case. */
export function useCaseTasks(caseId: number) {
  return useQuery<Task[]>({
    queryKey: caseTasksQueryKey(caseId),
    enabled: !!caseId,
    queryFn: async () => {
      const res = await axios.get(`/api/cases/${caseId}/tasks`);
      return res.data as Task[];
    },
  });
}

interface TaskCacheContext {
  previousAllTasks?: Task[];
  previousCaseTasks?: Task[];
}

/**
 * Keeps the flat `allTasks` cache and a single case's `caseTasks` cache in
 * sync for optimistic task mutations, mirroring the dual-cache pattern the
 * original per-component mutations implemented independently.
 */
function useTaskCaches(caseId: number | undefined) {
  const queryClient = useQueryClient();
  const caseKey = caseTasksQueryKey(caseId);

  return {
    cancel: () =>
      Promise.all([
        queryClient.cancelQueries({ queryKey: allTasksQueryKey }),
        queryClient.cancelQueries({ queryKey: caseKey }),
      ]),
    snapshot: (): TaskCacheContext => ({
      previousAllTasks: queryClient.getQueryData<Task[]>(allTasksQueryKey),
      previousCaseTasks: queryClient.getQueryData<Task[]>(caseKey),
    }),
    apply: (updater: (tasks: Task[]) => Task[]) => {
      queryClient.setQueryData<Task[]>(allTasksQueryKey, (old = []) =>
        updater(old)
      );
      queryClient.setQueryData<Task[]>(caseKey, (old = []) => updater(old));
    },
    rollback: (ctx?: TaskCacheContext) => {
      queryClient.setQueryData(allTasksQueryKey, ctx?.previousAllTasks);
      queryClient.setQueryData(caseKey, ctx?.previousCaseTasks);
    },
    invalidate: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: allTasksQueryKey }),
        queryClient.invalidateQueries({ queryKey: caseKey }),
      ]),
  };
}

/** Optimistically updates a task's status, syncing both task caches. */
export function useChangeTaskStatus(caseId?: number) {
  const cache = useTaskCaches(caseId);
  return useMutation({
    mutationFn: async ({
      taskId,
      status,
    }: {
      taskId: number;
      status: string;
    }) => {
      await axios.patch(`/api/tasks/${taskId}`, { status });
    },
    onMutate: async ({ taskId, status }) => {
      await cache.cancel();
      const previous = cache.snapshot();
      cache.apply((tasks) =>
        tasks.map((t) => (t.id === taskId ? { ...t, status } : t))
      );
      return previous;
    },
    onError: (_err, _vars, context) => cache.rollback(context),
    onSettled: () => cache.invalidate(),
  });
}

/** Optimistically updates a task's priority, syncing both task caches. */
export function useChangeTaskPriority(caseId?: number) {
  const cache = useTaskCaches(caseId);
  return useMutation({
    mutationFn: async ({
      taskId,
      priority,
    }: {
      taskId: number;
      priority: string;
    }) => {
      await axios.patch(`/api/tasks/${taskId}`, { priority });
    },
    onMutate: async ({ taskId, priority }) => {
      await cache.cancel();
      const previous = cache.snapshot();
      cache.apply((tasks) =>
        tasks.map((t) => (t.id === taskId ? { ...t, priority } : t))
      );
      return previous;
    },
    onError: (_err, _vars, context) => cache.rollback(context),
    onSettled: () => cache.invalidate(),
  });
}

/** Optimistically updates a task's due date, syncing both task caches. */
export function useChangeTaskDueDate(caseId?: number) {
  const cache = useTaskCaches(caseId);
  return useMutation({
    mutationFn: async ({
      taskId,
      dueDate,
    }: {
      taskId: number;
      dueDate: string | null;
    }) => {
      await axios.patch(`/api/tasks/${taskId}`, { dueDate });
    },
    onMutate: async ({ taskId, dueDate }) => {
      await cache.cancel();
      const previous = cache.snapshot();
      cache.apply((tasks) =>
        tasks.map((t) => (t.id === taskId ? { ...t, dueDate } : t))
      );
      return previous;
    },
    onError: (_err, _vars, context) => cache.rollback(context),
    onSettled: () => cache.invalidate(),
  });
}

/** Optimistically deletes a task, syncing both task caches. */
export function useDeleteTask(caseId?: number) {
  const cache = useTaskCaches(caseId);
  return useMutation({
    mutationFn: async (taskId: number) => {
      await axios.delete(`/api/tasks/${taskId}`);
    },
    onMutate: async (taskId) => {
      await cache.cancel();
      const previous = cache.snapshot();
      cache.apply((tasks) => tasks.filter((t) => t.id !== taskId));
      return previous;
    },
    onError: (_err, _taskId, context) => cache.rollback(context),
    onSettled: () => cache.invalidate(),
  });
}

/** Optimistically appends a new task, syncing both task caches. */
export function useAddTask(caseId?: number) {
  const cache = useTaskCaches(caseId);
  return useMutation({
    mutationFn: async (task: Task) => {
      await axios.post("/api/tasks", task);
    },
    onMutate: async (task) => {
      await cache.cancel();
      const previous = cache.snapshot();
      cache.apply((tasks) => [...tasks, task]);
      return previous;
    },
    onError: (_err, _task, context) => cache.rollback(context),
    onSettled: () => cache.invalidate(),
  });
}
