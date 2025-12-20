"use client";

import { useState } from "react";
import { ProjectDetailView } from "@/app/workspace/projects/ProjectDetailView";
import { ProjectList } from "./ProjectList";
import { ProjectCreateDialog } from "./ProjectCreateDialog";
import {useQuery} from "@tanstack/react-query";
import axios from "axios";

export default function ProjectsPage() {
    const [selectedProject, setSelectedProject] = useState<Project | null>(null);
    const [search, setSearch] = useState("");
    const [tab, setTab] = useState("all");

    const projectsQuery = useQuery({
        queryKey: ["projects"],
        queryFn: async () => {
            const res = await axios.get(`/api/projects/get-projects`);
            return res.data;
        }
    })

    const projects: Project[] = projectsQuery.data?.projects ?? [];
    const filtered = projects.filter(p => {
        const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());
        const matchesTab =
            tab === "all" ||
            (tab === "active" && p.status !== "completed") ||
            (tab === "completed" && p.status === "completed");

        return matchesSearch && matchesTab;
    });

    return (
        <div className="p-6 space-y-6">
            {selectedProject ?
                <ProjectDetailView onBackAction={() => setSelectedProject(null)} project={selectedProject} />
                :
                <>
                    {projectsQuery.isLoading ? null : (
                        <ProjectCreateDialog
                            clients={projectsQuery.data?.allClients ?? []}
                        />
                    )}

                    <ProjectList
                        projects={filtered}
                        onSelect={setSelectedProject}
                        totalTasks={projectsQuery.data.totalTasks ?? 0}
                        completedTasks={projectsQuery.data.completedTasks ?? 0}
                    />
                </>
            }
        </div>
    );
}
