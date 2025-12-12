interface ProjectFile {
    id: string;
    name: string;
    size: string;
    uploadedBy: string;
    uploadedAt: string;
    type: string;
}

interface ProjectNote {
    id: string;
    content: string;
    createdAt: string;
}

interface ProjectDetailViewProps {
    project: {
        id: number;
        name: string;
        clientName: string;
        status: string;
        dueDate: string;
        priority: string;
    };
    onBack: () => void;
    onDelete: (number) => void;
    onTaskUpdate: (projectId, updatedCompleted, updatedTotal) => void;
    addNotes: (newNote: string, projectId: number) => ProjectNote;
}

interface Project {
    id,
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
    createdAt: string | Date | null;
    userId?: string | null;
    updatedAt?: string | null;
    projectId?: number | null;
}
