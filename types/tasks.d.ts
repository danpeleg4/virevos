export interface Task {
  id: number;
  userId: string;
  title: string;
  description: string | null;
  projectId?: number | null;
  projectName?: string | null;
  priority: string;
  status: string;
  dueDate: string | null;
  completed: boolean | null;
  createdAt: Date | null;
  updatedAt: Date | null;
}

export interface TaskDetailModalProps {
  task: Task;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId?: number;
}
