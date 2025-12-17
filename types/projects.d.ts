
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
    addNotes: (newNote: string, projectId: number) => Promise<ProjectNote>;
    getNotes: (projectId: number) => Promise<ProjectNote[]>;
    getProjectTasks: (projectId: number) => Promise<Task[]>;
    addProjectTasks: (task: Task) => Promise<Task>;
    allTasks: (tasks: Task[]) => void;
    deleteTask: (taskId: number) => void;
}

interface Project {
    id: number,
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
