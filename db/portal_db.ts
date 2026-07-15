import { db, type DrizzleDB } from "./db";
import { clientPortalTokens, clients } from "./schema";
import { and, eq } from "drizzle-orm";
import type { InferSelectModel } from "drizzle-orm";

export type PortalTokenRow = InferSelectModel<typeof clientPortalTokens>;
export type PortalSettingsData = NonNullable<PortalTokenRow["settings"]>;
export type ClientOwnerRow = { id: number; name: string };

export interface PortalDB {
  getClientOwnedByUser(
    clientId: number,
    userId: string
  ): Promise<ClientOwnerRow[]>;
  getPortalTokenByClient(
    clientId: number,
    userId: string
  ): Promise<PortalTokenRow[]>;
  updatePortalToken(
    tokenId: number,
    data: { settings?: PortalSettingsData; enabled?: boolean }
  ): Promise<PortalTokenRow>;
  insertPortalToken(values: {
    clientId: number;
    token: string;
    enabled: boolean;
    settings: PortalSettingsData;
    userId: string;
  }): Promise<PortalTokenRow>;
}

export class PortalDrizzle implements PortalDB {
  constructor(private readonly db: DrizzleDB) {}

  async getClientOwnedByUser(
    clientId: number,
    userId: string
  ): Promise<ClientOwnerRow[]> {
    return this.db
      .select({ id: clients.id, name: clients.name })
      .from(clients)
      .where(and(eq(clients.id, clientId), eq(clients.userId, userId)))
      .limit(1);
  }

  async getPortalTokenByClient(
    clientId: number,
    userId: string
  ): Promise<PortalTokenRow[]> {
    return this.db
      .select()
      .from(clientPortalTokens)
      .where(
        and(
          eq(clientPortalTokens.clientId, clientId),
          eq(clientPortalTokens.userId, userId)
        )
      )
      .limit(1);
  }

  async updatePortalToken(
    tokenId: number,
    data: { settings?: PortalSettingsData; enabled?: boolean }
  ): Promise<PortalTokenRow> {
    const [updated] = await this.db
      .update(clientPortalTokens)
      .set(data)
      .where(eq(clientPortalTokens.id, tokenId))
      .returning();
    return updated;
  }

  async insertPortalToken(values: {
    clientId: number;
    token: string;
    enabled: boolean;
    settings: PortalSettingsData;
    userId: string;
  }): Promise<PortalTokenRow> {
    const [inserted] = await this.db
      .insert(clientPortalTokens)
      .values(values)
      .returning();
    return inserted;
  }
}

export const portalDrizzle = new PortalDrizzle(db);
