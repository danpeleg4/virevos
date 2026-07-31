//TODO CHANGE TO 'Client' AND UPDATE ALL USAGES
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
  id?: number;
  clientName?: string;
  name?: string;
  email?: string;
  phone?: string;
  status?: "active" | "inactive";
  notes?: string;
};
