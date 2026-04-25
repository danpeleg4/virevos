export interface Task {
  id: number;
  userId: string;
  title: string;
  description: string | null;
  caseId?: number | null;
  caseName?: string | null;
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
  caseId?: number;
}
