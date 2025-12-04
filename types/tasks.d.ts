interface Task {
    id: number;
    title: string;
    description?: string;
    project?: string;
    priority: "high" | "medium" | "low";
    status: "todo" | "in-progress" | "completed";
    dueDate: string;
}

interface TaskDetailModalProps {
    task: Task;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onUpdate: (task: Task) => void;
}