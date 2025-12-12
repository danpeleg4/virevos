interface Task {
    id: number;
    title: string;
    description?: string;
    projectId?: string;
    projectName?: string;
    priority: "high" | "medium" | "low";
    status: "todo" | "in-progress" | "completed";
    dueDate: string;
    completed: boolean;
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
    projectData: Project[];
};

type AddNewTaskPrjProps = {
    onTaskCreatedAction: (task: Task) => void;
    projectId: Project.id;
};