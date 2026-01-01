export type clients = {
    id?: number,
    name: string,
    email: string | null,
    status: string,
    activeProjects: number,
    completedProjects: number,
    avatar: string | null,
    industry: string | null,
    phone: string | null,
    notes: string,
    address?: string,
    createdAt?: Date | null,
    updatedAt?: Date | null
}