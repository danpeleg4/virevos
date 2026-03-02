"use client";

import { useState, useEffect } from "react";
import { ProjectList } from "./ProjectList";
import { ProjectCreateDialog } from "./ProjectCreateDialog";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { Project } from "@/types/projects";
import { useRouter } from "next/navigation";
import { changeProjectStatus } from "@/lib/server_actions/projects";

export default function ProjectsPage() {
  const [search] = useState("");
  const [tab] = useState("all");
  const router = useRouter();
  const queryClient = useQueryClient();

  const projectsQuery = useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      const res = await axios.get(`/api/projects/get-projects`);
      return res.data;
    },
  });

  const completedMutation = useMutation({
    mutationFn: async ({
      project,
      newStatus,
    }: {
      project: Project;
      newStatus: string;
    }) => {
      await changeProjectStatus(project, newStatus);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });

  // Update completed projects once data loads
  useEffect(() => {
    if (!projectsQuery.data?.projects) return;

    projectsQuery.data.projects.forEach((p: Project) => {
      const isCompleted =
        p.stats.totalTasks > 0 && p.stats.completedTasks === p.stats.totalTasks;
      if (isCompleted && p.status !== "completed") {
        completedMutation.mutate({ project: p, newStatus: "completed" });
        queryClient.invalidateQueries({ queryKey: ["clients"] });
      } else if (!isCompleted && p.status === "completed") {
        completedMutation.mutate({ project: p, newStatus: "in-progress" });
        queryClient.invalidateQueries({ queryKey: ["clients"] });
      }
    });
  }, [projectsQuery.data]);

  // Map for display only
  const projects: Project[] =
    projectsQuery.data?.projects?.map((p: Project) => {
      const isCompleted =
        p.stats.totalTasks > 0 && p.stats.completedTasks === p.stats.totalTasks;
      return {
        ...p,
        status: isCompleted ? "completed" : p.status,
        health: isCompleted ? "completed" : p.health,
      };
    }) ?? [];

  const filtered = projects.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());
    const matchesTab =
      tab === "all" ||
      (tab === "active" && p.status !== "completed") ||
      (tab === "completed" && p.status === "completed");

    return matchesSearch && matchesTab;
  });

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {projectsQuery.isLoading ? null : (
        <ProjectCreateDialog clients={projectsQuery.data?.allClients ?? []} />
      )}

      {projectsQuery.data && (
        <ProjectList
          projects={filtered}
          onSelect={(project) =>
            router.push(`/workspace/projects/${project.id}`)
          }
        />
      )}
    </div>
  );
}
