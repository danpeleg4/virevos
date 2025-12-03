interface Task {
    id: number;
    title: string;
    project: string;
    priority: "high" | "medium" | "low";
    status: "todo" | "in-progress" | "completed";
    dueDate: string;
    assignee: string;
}

interface TaskDetailModalProps {
    task: Task;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onUpdate: (task: Task) => void;
}

interface Subtask {
    id: string;
    title: string;
    completed: boolean;
}