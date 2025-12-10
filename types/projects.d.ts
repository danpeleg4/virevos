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
    author: string;
    createdAt: string;
}

interface ProjectDetailViewProps {
    project: {
        id: number;
        name: string;
        client: string;
        status: string;
        progress: number;
        dueDate: string;
        priority: string;
    };
    onBack: () => void;
    onDelete: (number) => void;
    onTaskUpdate: (projectId, updatedCompleted, updatedTotal) => void;
}

interface Project {
    id,
    name,
    clientName,
    status,
    progress,
    dueDate,
    tasksCompleted,
    totalTasks,
    priority,
    health,
}