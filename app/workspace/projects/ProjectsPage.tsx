"use client";

import { useState } from "react";
import { ProjectDetailView } from "@/app/workspace/projects/ProjectDetailView";
import { ProjectList } from "./ProjectList";
import { ProjectCreateDialog } from "./ProjectCreateDialog";
import {projectsMockData} from "@/app/lib/mockData";
import {clients} from "@/types/clients";
import {Project, ProjectNote} from "@/types/projects";

interface ProjectsPageProps {
    initialProjects: Project[];
    initialClients: clients[];
    save: (project: Project) => Promise<Project>;
    addNotes: (newNote: string, projectId: number) => Promise<ProjectNote>;
    getNotes: (projectId: number) => Promise<ProjectNote[]>;
    getProjectTasks: (id: number) => Promise<Task[]>;
    deleteProject: (projectId: number) => void;
}

export default function ProjectsPage({ initialProjects,
                                         initialClients,
                                         save,
                                         addNotes,
                                         getNotes,
                                         getProjectTasks,
                                         deleteProject
}: ProjectsPageProps) {
    const [projects, setProjects] = useState(initialProjects);
    const [clients, setClients] = useState(initialClients);
    const [selectedProject, setSelectedProject] = useState<Project | null>(null);
    const [search, setSearch] = useState("");
    const [tab, setTab] = useState("all");

    const filtered = projects.filter(p => {
        const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());
        const matchesTab =
            tab === "all" ||
            (tab === "active" && p.status !== "completed") ||
            (tab === "completed" && p.status === "completed");

        return matchesSearch && matchesTab;
    });

    const setPrj = async (newProject: Project) => {
        setProjects(prev => [...prev, newProject]);
    }

    const handleDeleteProject = async (projectId: number) => {
        try {
            await deleteProject(projectId);
            setProjects(prev => prev.filter(p => p.id !== projectId));
            setSelectedProject(null);
        } catch (err) {
            console.error("Failed to delete project", err);
        }
    };


    return (
        <div className="p-6 space-y-6">
            {selectedProject ?
                <ProjectDetailView
                    project={selectedProject}
                    onBack={() => setSelectedProject(null)}
                    onDelete={handleDeleteProject}
                    addNotes={addNotes}
                    getNotes={getNotes}
                    getProjectTasks={getProjectTasks}
                />
                :
                <>
                    <ProjectCreateDialog
                        clients={clients}
                        save={save}
                        setProjects={setPrj}
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
