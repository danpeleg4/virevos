export type clients = {
    id: number,
    name: string,
    email: string,
    status: string,
    activeProjects: number,
    completedProjects: number,
    totalProjects: number,
    avatar?: string | null,
    industry: string | null,
    phone: string,
    notes?: string | undefined,
    createdAt?: Date | null,
    updatedAt?: Date | null
}

type CreateClientInput = {
    name: string;
    email: string;
    phone: string;
    industry: string;
    notes: string;
};

type UpdateClientInput = {
    id: number,
    name?: string;
    email?: string;
    phone?: string;
    industry?: string;
    notes?: string;
}