import { CreateClientInput, UpdateClientInput } from "@/types/clients";
import { getCurrentUser } from "@/lib/supabase/auth";
import type { ClientsDB, ClientUpdateData } from "@db/classes/clients_db";
import type { BillingDB } from "@db/classes/billing_db";
import type { PlanLimitsDB } from "@db/classes/plan_limits_db";
import { assertCanAddClient } from "../plan_limits";
import {
  MAX_NAME,
  MAX_NOTES,
  MAX_PHONE,
  ValidationError,
  optionalString,
  requireEmail,
  requireOneOf,
  requireString,
} from "../util/validation";

const CLIENT_STATUSES = ["active", "inactive"] as const;

export async function getClients(clientsDb: ClientsDB) {
  const user = await getCurrentUser();
  if (!user?.id) throw new ValidationError("Unauthorized", 401);

  return clientsDb.getClientsWithCaseCounts(user.id);
}

export async function getClientMain(clientId: number, clientsDb: ClientsDB) {
  const user = await getCurrentUser();
  if (!user?.id) throw new ValidationError("Unauthorized", 401);

  const rows = await clientsDb.getClientWithCaseCounts(clientId, user.id);
  if (rows.length === 0) return null;

  const portalRows = await clientsDb.getPortalTokenByClient(clientId, user.id);

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "";
  const portal = portalRows[0]
    ? {
        ...portalRows[0],
        portalUrl: `${appUrl}/portal/${portalRows[0].token}`,
      }
    : null;

  return { client: rows[0], portal };
}

export async function getClientCases(clientId: number, clientsDb: ClientsDB) {
  const user = await getCurrentUser();
  if (!user?.id) throw new ValidationError("Unauthorized", 401);

  const caseRows = await clientsDb.getClientCasesWithStats(clientId, user.id);

  return caseRows.map((c) => {
    const totalTasks = c.totalTasks;
    const completedTasks = c.completedTasks;
    const percentage =
      totalTasks === 0 ? 0 : (completedTasks / totalTasks) * 100;
    return {
      id: c.id,
      name: c.name,
      description: c.description,
      status: c.status,
      dueDate: c.dueDate,
      priority: c.priority,
      clientId: c.clientId,
      userId: c.userId,
      clientName: c.clientName,
      stats: { totalTasks, completedTasks, percentage },
    };
  });
}

export async function getClientOutlookEmails(
  clientId: number,
  clientsDb: ClientsDB
) {
  const user = await getCurrentUser();
  if (!user?.id) throw new ValidationError("Unauthorized", 401);

  return clientsDb.getClientOutlookEmails(clientId, user.id);
}

export async function getClientPortal(clientId: number, clientsDb: ClientsDB) {
  const user = await getCurrentUser();
  if (!user?.id) throw new ValidationError("Unauthorized", 401);

  const rows = await clientsDb.getPortalDetails(clientId, user.id);
  if (rows.length === 0) return null;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "";
  return {
    ...rows[0],
    portalUrl: `${appUrl}/portal/${rows[0].token}`,
  };
}

export async function getPortalEnabledClients(clientsDb: ClientsDB) {
  const user = await getCurrentUser();
  if (!user?.id) throw new ValidationError("Unauthorized", 401);

  return clientsDb.getPortalEnabledClients(user.id);
}

export async function addAClient(
  body: CreateClientInput,
  clientsDb: ClientsDB,
  planLimitsDb: PlanLimitsDB,
  billingDb: BillingDB
) {
  try {
    const user = await getCurrentUser();
    if (!user?.id) return { message: "Unauthorized" };

    await assertCanAddClient(user.id, planLimitsDb, billingDb);

    const name = requireString(body.name, "name", MAX_NAME);
    const email = requireEmail(body.email, "email");
    const phone = optionalString(body.phone, "phone", MAX_PHONE) ?? null;
    const notes = optionalString(body.notes, "notes", MAX_NOTES);

    return await clientsDb.txAddClientAndPortal({
      name,
      email,
      phone,
      status: "active",
      notes,
      userId: user.id,
    });
  } catch (error) {
    if (error instanceof ValidationError) {
      return { message: error.message };
    }
    console.error(error);
    return { message: "Server error" };
  }
}

export async function updateExistingClient(
  newClient: UpdateClientInput,
  clientsDb: ClientsDB
) {
  const user = await getCurrentUser();
  if (!user?.id) throw new ValidationError("Unauthorized", 401);

  const { id, clientName, name, email, phone, notes, status } = newClient;

  const updateData: ClientUpdateData = {};
  if (name !== undefined && name !== null && name !== "") {
    updateData.name = requireString(name, "name", MAX_NAME);
  }
  if (email !== undefined && email !== null && email !== "") {
    updateData.email = requireEmail(email, "email");
  }
  if (phone !== undefined && phone !== null && phone !== "") {
    updateData.phone = requireString(phone, "phone", MAX_PHONE);
  }
  if (notes !== undefined && notes !== null && notes !== "") {
    updateData.notes = requireString(notes, "notes", MAX_NOTES);
  }
  if (status !== undefined && status !== null) {
    updateData.status = requireOneOf(status, "status", CLIENT_STATUSES);
  }

  if (Object.keys(updateData).length === 0) return;

  let targetId = id;
  if (!targetId) {
    if (!clientName) {
      throw new ValidationError("id or clientName is required", 400);
    }
    const validClientName = requireString(clientName, "clientName", MAX_NAME);
    const matches = await clientsDb.getClientByName(user.id, validClientName);
    if (matches.length === 0) {
      throw new ValidationError("No client found", 400);
    }
    targetId = matches[0].id;
  }

  await clientsDb.updateClient(targetId, user.id, updateData);
}

export async function deleteClient(
  { id }: { id: number },
  clientsDb: ClientsDB
) {
  const user = await getCurrentUser();
  if (!user?.id) throw new ValidationError("Unauthorized", 401);
  await clientsDb.deleteClient(id, user.id);
}

export async function updateNotes(
  {
    id,
    notes,
  }: {
    id: number;
    notes: string;
  },
  clientsDb: ClientsDB
) {
  const user = await getCurrentUser();
  if (!user?.id) throw new ValidationError("Unauthorized", 401);
  const validNotes = requireString(notes, "notes", MAX_NOTES, {
    allowEmpty: true,
  });
  await clientsDb.updateClient(id, user.id, { notes: validNotes });
}
