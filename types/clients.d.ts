export type clients = {
  id: number;
  name: string;
  email: string;
  status: string;
  activeCases: number;
  completedCases: number;
  totalCases: number;
  avatar?: string | null;
  phone: string;
  notes?: string | undefined;
  createdAt?: Date | null;
  updatedAt?: Date | null;
};

type CreateClientInput = {
  name: string;
  email: string;
  phone: string;
  notes: string;
};

type UpdateClientInput = {
  id: number;
  name?: string;
  email?: string;
  phone?: string;
  notes?: string;
};

export type ClientSummary = Pick<clients, "id" | "name">;
