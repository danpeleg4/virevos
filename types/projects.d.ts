import {deleteProject} from "@/app/workspace/projects/page";

interface ProjectFile {
    id: string;
    name: string;
    size: string;
    uploadedBy: string;
    uploadedAt: string;
    type: string;
}

interface ProjectDetailViewProps {
    project: Project
    onBack: () => void;
    onDelete: (number) => void;
    onTaskUpdate: (projectId, updatedCompleted, updatedTotal) => void;
    addNotes: (newNote: string, projectId: number) => Promise<ProjectNote>;
    getNotes: (projectId: number) => Promise<ProjectNote[]>;
    getProjectTasks: (projectId: number) => Promise<Task[]>;
    deleteProject: (projectId: number) => void;
}

interface Project {
    id: number;
    name,
    clientName,
    status,
    dueDate,
    tasksCompleted,
    totalTasks,
    priority,
    health,
}

interface ProjectNote {
    id: number;
    content: string;
    createdAt: Date | string | null;
    userId: string | null;
    updatedAt: Date | string | null;
    projectId: number | null;
}
