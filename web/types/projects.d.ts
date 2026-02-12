interface ProjectFile {
  id: number;
  name: string;
  size: string;
  uploadedAt: string;
  path: string;
  downloadUrl: string;
}

interface ProjectStats {
  totalTasks: number;
  completedTasks: number;
  percentage: number;
}

interface Project {
  clientName?: string;
  id: number;
  name;
  clientId;
  status;
  dueDate;
  priority;
  stats: ProjectStats;
  health;
}

interface ProjectNote {
  id: number;
  content: string;
  createdAt: Date | string | null;
  userId: string | null;
  updatedAt: Date | string | null;
  projectId: number | null;
}

export type AddFileMetadataInput = {
  projectId: number;
  mimeType?: string;
};
