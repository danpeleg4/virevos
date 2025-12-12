"use client";

import { useState } from "react";
import { ProjectDetailView } from "@/app/workspace/projects/ProjectDetailView";
import { ProjectList } from "./ProjectList";
import { ProjectCreateDialog } from "./ProjectCreateDialog";
import {projectsMockData} from "@/app/lib/mockData";
import {clients} from "@/types/clients";

interface ProjectsPageProps {
    initialProjects: Project[];
    initialClients: clients[];
    save: (project: Project) => Promise<void>;
    addNotes: (newNote: string, projectId: number) => Promise<ProjectNote>;
}

export default function ProjectsPage({ initialProjects, initialClients, save, addNotes }: ProjectsPageProps) {
    const [projects, setProjects] = useState(initialProjects);
    const [clients, setClients] = useState(initialClients);
    const [selectedProject, setSelectedProject] = useState<Project | null>(null);
    const [search, setSearch] = useState("");
    const [tab, setTab] = useState("all");
    const [projectsData, setProjectsData] = useState(projectsMockData);

    const filtered = projects.filter(p => {
        const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());
        const matchesTab =
            tab === "all" ||
            (tab === "active" && p.status !== "completed") ||
            (tab === "completed" && p.status === "completed");

        return matchesSearch && matchesTab;
    });

    function handleTaskUpdate(
        projectId: number,
        updatedCompleted: number,
        updatedTotal: number
    ) {
        setProjectsData(prev =>
            prev.map(p => {
                if (p.id !== projectId) return p;

                const isCompleted =
                    updatedTotal > 0 && updatedCompleted === updatedTotal;

                return {
                    ...p,
                    tasksCompleted: updatedCompleted,
                    totalTasks: updatedTotal,
                    status: isCompleted ? "completed" : "in-progress",
                    health: isCompleted ? "completed" : "on-track"
                };
            })
        );
    }

    const handleDeleteProject = (projectId: number) => {
        setProjectsData(prev => prev.filter(p => p.id !== projectId));
        setSelectedProject(null); // go back to list
    };

    return (
        <div className="p-6 space-y-6">
            {selectedProject ?
                <ProjectDetailView
                    project={selectedProject}
                    onBack={() => setSelectedProject(null)}
                    onDelete={handleDeleteProject}
                    onTaskUpdate={handleTaskUpdate}
                    addNotes={addNotes}
                />
                :
                <>
                    <ProjectCreateDialog
                        clients={clients}
                        save={save}
                    />

                    <ProjectList
                        projects={filtered}
                        tab={tab}
                        setTab={setTab}
                        search={search}
                        setSearch={setSearch}
                        onSelect={setSelectedProject}
                    />
                </>
            }
        </div>
    );
}
