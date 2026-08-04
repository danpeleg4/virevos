import { eq } from "drizzle-orm";
import { PortalBookingsDrizzle } from "@db/classes/portal_bookings_db";
import {
  clientPortalTokens,
  clients,
  events,
  portalMeetingBookings,
} from "@db/schema";
import { resetDb, seedUser, testDb } from "./helpers/db";

describe("PortalBookingsDrizzle (integration)", () => {
  const portalBookingsDb = new PortalBookingsDrizzle(testDb);

  beforeEach(async () => {
    await resetDb();
    await seedUser("user_1");
  });

  async function insertPortalSetup() {
    const [client] = await testDb
      .insert(clients)
      .values({ userId: "user_1", name: "Client A" })
      .returning();
    const [portal] = await testDb
      .insert(clientPortalTokens)
      .values({ userId: "user_1", clientId: client.id, token: "tok-1" })
      .returning();
    return { client, portal };
  }

  async function insertBookingRow(
    overrides: Partial<typeof portalMeetingBookings.$inferInsert> = {}
  ) {
    const { client, portal } = await insertPortalSetup();
    const [row] = await testDb
      .insert(portalMeetingBookings)
      .values({
        portalId: portal.id,
        clientId: client.id,
        userId: "user_1",
        clientName: "Client A",
        clientEmail: "client@a.com",
        dateTime: new Date("2026-06-01T10:00:00Z"),
        duration: 30,
        ...overrides,
      })
      .returning();
    return { booking: row, client, portal };
  }

  describe("getPortalByToken", () => {
    it("returns the portal token row matching the token", async () => {
      const { portal } = await insertPortalSetup();

      const rows = await portalBookingsDb.getPortalByToken("tok-1");

      expect(rows).toHaveLength(1);
      expect(rows[0].id).toBe(portal.id);
    });
  });

  describe("insertBooking", () => {
    it("creates a booking row and returns it", async () => {
      const { client, portal } = await insertPortalSetup();

      const created = await portalBookingsDb.insertBooking({
        portalId: portal.id,
        clientId: client.id,
        userId: "user_1",
        clientName: "Client A",
        clientEmail: "client@a.com",
        dateTime: new Date("2026-06-01T10:00:00Z"),
        duration: 30,
      });

      expect(created.id).toBeDefined();
      expect(created.status).toBe("pending");
    });
  });

  describe("getBookingsForUser", () => {
    it("returns all bookings for the user", async () => {
      await insertBookingRow();

      const rows = await portalBookingsDb.getBookingsForUser("user_1");

      expect(rows).toHaveLength(1);
    });
  });

  describe("getBookingsForUserWithClientName", () => {
    it("returns bookings joined with the client's current display name", async () => {
      await insertBookingRow();

      const rows =
        await portalBookingsDb.getBookingsForUserWithClientName("user_1");

      expect(rows).toHaveLength(1);
      expect(rows[0].clientDisplayName).toBe("Client A");
    });
  });

  describe("setBookingStatus", () => {
    it("updates the booking status, scoped to the user", async () => {
      const { booking } = await insertBookingRow();

      await portalBookingsDb.setBookingStatus(
        booking.id,
        "user_1",
        "confirmed"
      );

      const [updated] = await testDb
        .select()
        .from(portalMeetingBookings)
        .where(eq(portalMeetingBookings.id, booking.id));
      expect(updated.status).toBe("confirmed");
    });
  });

  describe("getBookingForUser", () => {
    it("returns the booking scoped to the given user", async () => {
      const { booking } = await insertBookingRow();

      const found = await portalBookingsDb.getBookingForUser(
        booking.id,
        "user_1"
      );
      const notFound = await portalBookingsDb.getBookingForUser(
        booking.id,
        "user_2"
      );

      expect(found).toHaveLength(1);
      expect(notFound).toHaveLength(0);
    });
  });

  describe("setBookingEventInfo", () => {
    it("sets the event id and meeting link on the booking", async () => {
      const { booking } = await insertBookingRow();
      const [event] = await testDb
        .insert(events)
        .values({
          id: crypto.randomUUID(),
          userId: "user_1",
          title: "Booked Meeting",
          dateTime: new Date("2026-06-01T10:00:00Z"),
          duration: 30,
        })
        .returning();

      await portalBookingsDb.setBookingEventInfo(
        booking.id,
        event.id,
        "https://meet.example.com/event-1"
      );

      const [updated] = await testDb
        .select()
        .from(portalMeetingBookings)
        .where(eq(portalMeetingBookings.id, booking.id));
      expect(updated.eventId).toBe(event.id);
      expect(updated.meetingLink).toBe("https://meet.example.com/event-1");
    });
  });

  describe("getUpcomingBookingsForPortal", () => {
    it("returns only future bookings for the portal", async () => {
      const { portal, client } = await insertPortalSetup();
      const future = new Date();
      future.setFullYear(future.getFullYear() + 1);
      await testDb.insert(portalMeetingBookings).values([
        {
          portalId: portal.id,
          clientId: client.id,
          userId: "user_1",
          clientName: "Past",
          clientEmail: "past@a.com",
          dateTime: new Date("2020-01-01"),
          duration: 30,
        },
        {
          portalId: portal.id,
          clientId: client.id,
          userId: "user_1",
          clientName: "Future",
          clientEmail: "future@a.com",
          dateTime: future,
          duration: 30,
        },
      ]);

      const rows = await portalBookingsDb.getUpcomingBookingsForPortal(
        portal.id
      );

      expect(rows).toHaveLength(1);
      expect(rows[0].clientName).toBe("Future");
    });
  });

  describe("getBookingsInRange", () => {
    it("returns bookings within the given date range only", async () => {
      const { portal, client } = await insertPortalSetup();
      await testDb.insert(portalMeetingBookings).values([
        {
          portalId: portal.id,
          clientId: client.id,
          userId: "user_1",
          clientName: "In Range",
          clientEmail: "a@a.com",
          dateTime: new Date("2026-06-15T10:00:00Z"),
          duration: 30,
        },
        {
          portalId: portal.id,
          clientId: client.id,
          userId: "user_1",
          clientName: "Out Of Range",
          clientEmail: "b@a.com",
          dateTime: new Date("2026-07-15T10:00:00Z"),
          duration: 30,
        },
      ]);

      const rows = await portalBookingsDb.getBookingsInRange(
        portal.id,
        new Date("2026-06-01T00:00:00Z"),
        new Date("2026-07-01T00:00:00Z")
      );

      expect(rows).toHaveLength(1);
      expect(rows[0].duration).toBe(30);
    });
  });
});
