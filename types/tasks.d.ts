interface Task {
    id: number;
    userId: string;
    title: string;
    description: string | null;
    projectId: number | null;
    priority: string;
    status: string;
    dueDate: string;
    completed: boolean | null;
    createdAt: Date | null;
    updatedAt: Date | null;
}

interface TaskDetailModalProps {
    task: Task;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onUpdate: (task: Task) => void;
}

type AddNewTaskProps = {
    onTaskCreatedAction: (task: Task) => void;
    projectName?: string;
};

type AddNewTaskPrjProps = {
    onTaskCreatedAction: (task: Task) => void;
    projectId: Project.id;
};