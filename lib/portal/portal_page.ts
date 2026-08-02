import type { PortalMainDB } from "@db/classes/portal_main_db";
import type { PortalBookingsDB } from "@db/classes/portal_bookings_db";
import type { DocumentRequestsDB } from "@db/classes/document_requests_db";
import type { StorageClientInterface } from "@/api_client/supabase_storage_client";
import { listApprovedRequestsForClient } from "@/lib/document_requests";
import { FILES_BUCKET } from "@/lib/supabase/supabase";
import { ValidationError } from "@/lib/util/validation";
import type { TimeSlot } from "@/types/portal";

const VALID_DURATIONS = [15, 30, 45, 60];
const DAYS = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

export async function getPortalMainData(
  token: string,
  portalMainDb: PortalMainDB,
  portalBookingsDb: PortalBookingsDB,
  documentRequestsDb: DocumentRequestsDB
) {
  const tokenRows = await portalMainDb.getPortalByToken(token);
  if (!tokenRows.length || !tokenRows[0].enabled) {
    throw new ValidationError("Portal not found or disabled", 404);
  }
  const portalToken = tokenRows[0];

  await portalMainDb.touchLastAccessed(portalToken.id);

  const clientRows = await portalMainDb.getClientById(portalToken.clientId);
  if (!clientRows.length) {
    throw new ValidationError("Client not found", 404);
  }
  const client = clientRows[0];

  const clientCases = await portalMainDb.getCasesForClient(client.id);
  const caseIds = clientCases.map((p) => p.id);
  const files = await portalMainDb.getCaseFilesForCases(caseIds);
  const upcomingBookings = await portalBookingsDb.getUpcomingBookingsForPortal(
    portalToken.id
  );
  const documentRequests = await listApprovedRequestsForClient(
    client.id,
    documentRequestsDb
  );

  return {
    client: { id: client.id, name: client.name, email: client.email },
    settings: portalToken.settings || {},
    cases: clientCases.map((p) => ({
      id: p.id,
      name: p.name,
      status: p.status,
      dueDate: p.dueDate,
      priority: p.priority,
      description: p.description,
    })),
    files: files.map((f) => ({
      id: f.id,
      name: f.name,
      size: f.size,
      mimeType: f.mimeType,
      path: f.path,
      createdAt: f.createdAt,
    })),
    bookings: upcomingBookings.map((b) => ({
      id: b.id,
      dateTime: b.dateTime.toISOString(),
      duration: b.duration,
      status: b.status,
      meetingLink: b.meetingLink,
    })),
    documentRequests,
  };
}

export async function getPortalAvailability(
  token: string,
  dateParam: string,
  durationParam: string,
  portalMainDb: PortalMainDB,
  portalBookingsDb: PortalBookingsDB
): Promise<{ slots: TimeSlot[] }> {
  if (!dateParam || !durationParam) {
    throw new ValidationError("Missing date or duration", 400);
  }

  const duration = parseInt(durationParam, 10);
  if (isNaN(duration) || !VALID_DURATIONS.includes(duration)) {
    throw new ValidationError("Invalid duration", 400);
  }

  const tokenRows = await portalMainDb.getPortalByToken(token);
  if (!tokenRows.length || !tokenRows[0].enabled) {
    throw new ValidationError("Portal not found", 404);
  }
  const portalRecord = tokenRows[0];
  const availability = portalRecord.settings?.availability;

  if (!portalRecord.settings?.meetingSchedulingEnabled || !availability) {
    return { slots: [] };
  }

  const requestedDate = new Date(`${dateParam}T00:00:00`);
  if (isNaN(requestedDate.getTime())) {
    throw new ValidationError("Invalid date", 400);
  }

  const dayName = DAYS[requestedDate.getDay()];
  const dayConfig = availability.weeklySchedule[dayName];
  if (!dayConfig?.enabled) {
    return { slots: [] };
  }

  const [startH, startM] = dayConfig.startTime.split(":").map(Number);
  const [endH, endM] = dayConfig.endTime.split(":").map(Number);

  const dayStart = new Date(requestedDate);
  dayStart.setHours(startH, startM, 0, 0);
  const dayEnd = new Date(requestedDate);
  dayEnd.setHours(endH, endM, 0, 0);

  const nextDay = new Date(requestedDate);
  nextDay.setDate(nextDay.getDate() + 1);

  const existingBookings = await portalBookingsDb.getBookingsInRange(
    portalRecord.id,
    dayStart,
    nextDay
  );

  const buffer = availability.bufferMinutes;
  const slots: TimeSlot[] = [];
  let current = new Date(dayStart);

  while (current.getTime() + duration * 60000 <= dayEnd.getTime()) {
    const slotEnd = new Date(current.getTime() + duration * 60000);

    const hasConflict = existingBookings.some((b) => {
      const bStart = b.dateTime.getTime() - buffer * 60000;
      const bEnd = b.dateTime.getTime() + b.duration * 60000 + buffer * 60000;
      return current.getTime() < bEnd && slotEnd.getTime() > bStart;
    });

    const isPast = current.getTime() < Date.now();

    slots.push({
      startTime: current.toISOString(),
      available: !hasConflict && !isPast,
    });

    current = new Date(current.getTime() + duration * 60000);
  }

  return { slots };
}

export interface PortalFileDownload {
  bytes: Uint8Array;
  fileName: string;
  mimeType: string;
}

export async function downloadPortalFile(
  token: string,
  fileId: number,
  portalMainDb: PortalMainDB,
  storage: StorageClientInterface
): Promise<PortalFileDownload> {
  const [portalToken] = await portalMainDb.getPortalByToken(token);
  if (!portalToken?.enabled) {
    throw new ValidationError("Not found", 404);
  }

  const [file] = await portalMainDb.getCaseFileById(fileId);
  if (!file) {
    throw new ValidationError("Not found", 404);
  }

  const [project] = await portalMainDb.getCaseById(file.caseId);
  if (
    !project ||
    project.clientId == null ||
    project.clientId !== portalToken.clientId
  ) {
    throw new ValidationError("Forbidden", 403);
  }

  let bytes: Uint8Array;
  try {
    bytes = await storage.downloadFile(FILES_BUCKET, file.path);
  } catch {
    throw new ValidationError("Download failed", 500);
  }

  return {
    bytes,
    fileName: file.name,
    mimeType: file.mimeType ?? "application/octet-stream",
  };
}
