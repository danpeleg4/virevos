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
}

interface Project {
    id,
    name,
    client,
    status,
    progress,
    dueDate,
    tasksCompleted,
    totalTasks,
    priority,
    health,
}