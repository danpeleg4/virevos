import type {
  BookingRow,
  PortalBookingsDB,
  PortalTokenRow,
} from "@db/portal_bookings_db";

export const canonicalBookingToken: PortalTokenRow = {
  id: 3,
  clientId: 1,
  token: "portal-token-1",
  enabled: true,
  settings: { meetingSchedulingEnabled: true },
  lastAccessedAt: null,
  chatStarred: false,
  chatArchived: false,
  userId: "user_1",
  createdAt: new Date(),
};

export const canonicalBookingRow: BookingRow = {
  id: 5,
  portalId: 3,
  clientId: 1,
  userId: "user_1",
  clientName: "Jane Client",
  clientEmail: "jane@client.com",
  dateTime: new Date("2026-08-01T10:00:00Z"),
  duration: 30,
  status: "pending",
  notes: null,
  meetingLink: null,
  eventId: null,
  createdAt: new Date(),
};

export type FakePortalBookingsDb = {
  [K in keyof PortalBookingsDB]: Mock<PortalBookingsDB[K]>;
};

export function makeFakePortalBookingsDb(
  overrides: Partial<PortalBookingsDB> = {}
): FakePortalBookingsDb {
  const fake = {
    getPortalByToken: vi.fn(async () => [{ ...canonicalBookingToken }]),
    insertBooking: vi.fn(async () => ({ ...canonicalBookingRow })),
    getBookingsForUser: vi.fn(async () => [{ ...canonicalBookingRow }]),
    setBookingStatus: vi.fn(async () => {}),
    getBookingForUser: vi.fn(async () => [{ ...canonicalBookingRow }]),
    setBookingEventInfo: vi.fn(async () => {}),
    getUpcomingBookingsForPortal: vi.fn(async () => [
      { ...canonicalBookingRow },
    ]),
    getBookingsInRange: vi.fn(async () => []),
    getBookingsForUserWithClientName: vi.fn(async () => [
      { ...canonicalBookingRow, clientDisplayName: "Jane Client Co." },
    ]),
  } satisfies PortalBookingsDB;

  return Object.assign(fake, overrides) as FakePortalBookingsDb;
}
