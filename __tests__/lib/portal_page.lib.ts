import {
  downloadPortalFile,
  getPortalAvailability,
  getPortalMainData,
} from "@/lib/portal_page";
import {
  canonicalPortalMainCase,
  canonicalPortalMainFile,
  canonicalPortalMainToken,
  makeFakePortalMainDb,
} from "../fakes/fake_portal_main_db";
import { makeFakePortalBookingsDb } from "../fakes/fake_portal_bookings_db";
import { makeFakeDocumentRequestsDb } from "../fakes/fake_document_requests_db";
import { makeFakeStorageClient } from "../fakes/fake_storage_client";

vi.mock("@/lib/supabase/supabase", () => ({
  FILES_BUCKET: "projectFiles",
}));

const portalMainDb = makeFakePortalMainDb();
const portalBookingsDb = makeFakePortalBookingsDb();
const documentRequestsDb = makeFakeDocumentRequestsDb();
const storage = makeFakeStorageClient();

let consoleErrorSpy: MockInstance;

beforeEach(() => {
  vi.clearAllMocks();
  consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  consoleErrorSpy.mockRestore();
});

describe("getPortalMainData", () => {
  it("throws 404 when the token is unknown or disabled", async () => {
    portalMainDb.getPortalByToken.mockResolvedValueOnce([]);
    await expect(
      getPortalMainData(
        "bad",
        portalMainDb,
        portalBookingsDb,
        documentRequestsDb
      )
    ).rejects.toMatchObject({ status: 404 });
  });

  it("throws 404 when the client is missing", async () => {
    portalMainDb.getClientById.mockResolvedValueOnce([]);
    await expect(
      getPortalMainData(
        "tok",
        portalMainDb,
        portalBookingsDb,
        documentRequestsDb
      )
    ).rejects.toMatchObject({ status: 404, message: /client not found/i });
  });

  it("touches last-accessed and returns the shaped payload", async () => {
    const result = await getPortalMainData(
      "tok",
      portalMainDb,
      portalBookingsDb,
      documentRequestsDb
    );

    expect(portalMainDb.touchLastAccessed).toHaveBeenCalledWith(
      canonicalPortalMainToken.id
    );
    expect(result.client.id).toBe(1);
    expect(result.cases).toEqual([
      expect.objectContaining({ id: canonicalPortalMainCase.id }),
    ]);
    expect(result.files).toEqual([
      expect.objectContaining({ id: canonicalPortalMainFile.id }),
    ]);
    expect(portalBookingsDb.getUpcomingBookingsForPortal).toHaveBeenCalledWith(
      canonicalPortalMainToken.id
    );
  });
});

describe("getPortalAvailability", () => {
  it("throws 400 when date or duration is missing", async () => {
    await expect(
      getPortalAvailability("tok", "", "30", portalMainDb, portalBookingsDb)
    ).rejects.toMatchObject({ status: 400 });
  });

  it("throws 400 for an invalid duration", async () => {
    await expect(
      getPortalAvailability(
        "tok",
        "2026-08-01",
        "99",
        portalMainDb,
        portalBookingsDb
      )
    ).rejects.toMatchObject({ status: 400 });
  });

  it("throws 404 when the token is unknown or disabled", async () => {
    portalMainDb.getPortalByToken.mockResolvedValueOnce([]);
    await expect(
      getPortalAvailability(
        "tok",
        "2026-08-01",
        "30",
        portalMainDb,
        portalBookingsDb
      )
    ).rejects.toMatchObject({ status: 404 });
  });

  it("returns empty slots when scheduling is not enabled", async () => {
    portalMainDb.getPortalByToken.mockResolvedValueOnce([
      { ...canonicalPortalMainToken, settings: {} },
    ]);
    const result = await getPortalAvailability(
      "tok",
      "2026-08-01",
      "30",
      portalMainDb,
      portalBookingsDb
    );
    expect(result).toEqual({ slots: [] });
  });

  it("returns empty slots when the requested day is disabled", async () => {
    portalMainDb.getPortalByToken.mockResolvedValueOnce([
      {
        ...canonicalPortalMainToken,
        settings: {
          meetingSchedulingEnabled: true,
          availability: {
            bufferMinutes: 0,
            weeklySchedule: { saturday: { enabled: false } },
          },
        },
      },
    ]);
    // 2026-08-01 is a Saturday
    const result = await getPortalAvailability(
      "tok",
      "2026-08-01",
      "30",
      portalMainDb,
      portalBookingsDb
    );
    expect(result).toEqual({ slots: [] });
  });

  it("computes available slots and marks conflicts", async () => {
    portalMainDb.getPortalByToken.mockResolvedValueOnce([
      {
        ...canonicalPortalMainToken,
        settings: {
          meetingSchedulingEnabled: true,
          availability: {
            bufferMinutes: 0,
            weeklySchedule: {
              saturday: {
                enabled: true,
                startTime: "09:00",
                endTime: "10:00",
              },
            },
          },
        },
      },
    ]);
    portalBookingsDb.getBookingsInRange.mockResolvedValueOnce([
      { dateTime: new Date("2026-08-01T09:00:00"), duration: 30 },
    ]);

    const result = await getPortalAvailability(
      "tok",
      "2026-08-01",
      "30",
      portalMainDb,
      portalBookingsDb
    );

    expect(result.slots).toHaveLength(2);
    expect(result.slots[0].available).toBe(false); // conflicts with existing booking
    expect(result.slots[1].available).toBe(true);
  });
});

describe("downloadPortalFile", () => {
  it("throws 404 when the token is unknown or disabled", async () => {
    portalMainDb.getPortalByToken.mockResolvedValueOnce([]);
    await expect(
      downloadPortalFile("tok", 7, portalMainDb, storage)
    ).rejects.toMatchObject({ status: 404 });
  });

  it("throws 404 when the file does not exist", async () => {
    portalMainDb.getCaseFileById.mockResolvedValueOnce([]);
    await expect(
      downloadPortalFile("tok", 7, portalMainDb, storage)
    ).rejects.toMatchObject({ status: 404 });
  });

  it("throws 403 when the file's case belongs to a different client", async () => {
    portalMainDb.getCaseById.mockResolvedValueOnce([
      { ...canonicalPortalMainCase, clientId: 999 },
    ]);
    await expect(
      downloadPortalFile("tok", 7, portalMainDb, storage)
    ).rejects.toMatchObject({ status: 403 });
  });

  it("throws 500 when the storage download fails", async () => {
    storage.downloadFile.mockRejectedValueOnce(new Error("storage down"));
    await expect(
      downloadPortalFile("tok", 7, portalMainDb, storage)
    ).rejects.toMatchObject({ status: 500 });
  });

  it("returns the file bytes, name, and mime type", async () => {
    storage.downloadFile.mockResolvedValueOnce(new Uint8Array([1, 2, 3]));

    const result = await downloadPortalFile("tok", 7, portalMainDb, storage);

    expect(result.fileName).toBe(canonicalPortalMainFile.name);
    expect(result.mimeType).toBe(canonicalPortalMainFile.mimeType);
    expect(storage.downloadFile).toHaveBeenCalledWith(
      "projectFiles",
      canonicalPortalMainFile.path
    );
  });
});
