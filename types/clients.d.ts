export type clients = {
    id: number,
    name: string,
    email: string | null,
    status: string,
    activeProjects: number,
    completedProjects: number,
    totalProjects: number,
    avatar: string | null,
    industry: string | null,
    phone: string | null,
    notes: string,
    createdAt?: Date | null,
    updatedAt?: Date | null
}