import { Calendar, LucideIcon, Mail, Video } from "lucide-react";

export interface Task {
  id: number;
  title: string;
  projectId: string;
  priority: string;
  status: string;
  dueDate: string;
  completed: boolean;
}

export interface Client {
  id: number;
  name: string;
  email: string;
  phone: string;
  activeProjects: number;
  completedProjects: number;
  status: string;
  joinedDate: string;
  avatar: string;
}

export interface Integration {
  id: string;
  name: string;
  icon: LucideIcon;
  description: string;
  color: string;
  category: string;
}

export interface Project {
  id: number;
  name: string;
  client: string;
  status: string;
  progress: number;
  dueDate: string;
  tasksCompleted: number;
  totalTasks: number;
  priority: string;
  health: string;
}

export const integrations: Integration[] = [
  {
    id: "google-calendar",
    name: "Google Calendar",
    icon: Calendar,
    description: "Sync your schedule and meetings",
    color: "bg-blue-100 text-blue-600",
    category: "calendar",
  },
  {
    id: "outlook",
    name: "Outlook Calendar",
    icon: Mail,
    description: "Connect your Microsoft calendar",
    color: "bg-blue-100 text-blue-600",
    category: "calendar",
  },
  {
    id: "zoom",
    name: "Zoom",
    icon: Video,
    description: "Enable video meetings",
    color: "bg-purple-100 text-purple-600",
    category: "video",
  },
  {
    id: "google-meet",
    name: "Google Meet",
    icon: Video,
    description: "Connect Google Meet",
    color: "bg-green-100 text-green-600",
    category: "video",
  },
];
