import React from "react";
import { http, HttpResponse } from "msw";
import { worker } from "../../../msw/worker";
import { renderWithQueryClient } from "../../../_helpers/render";
import {
  useAvailableSlots,
  useBookMeeting,
  useDocumentItemUpload,
  useFileUpload,
  usePortalChat,
  usePortalData,
} from "@/app/portal/[token]/_lib/hooks";
import { toast } from "@/app/components/ui/toast-store";
import {
  BookingInput,
  PortalChatMessage,
  PortalData,
  TimeSlot,
} from "@/types/portal";

const TOKEN = "test-token-abc";

function UploadHarness() {
  const upload = useDocumentItemUpload(TOKEN);
  return (
    <button
      onClick={() =>
        upload.mutate({ itemId: 1, file: new File(["x"], "doc.pdf") })
      }
    >
      Upload
    </button>
  );
}

function PortalDataHarness() {
  const { data, isPending, isError } = usePortalData(TOKEN);
  if (isPending) return <div>Loading</div>;
  if (isError) return <div>Error</div>;
  return <div>{data.client.name}</div>;
}

function PortalChatHarness() {
  const { messages, sendMessage } = usePortalChat(TOKEN);
  return (
    <div>
      {messages.map((m) => (
        <div key={m.id}>{m.body}</div>
      ))}
      <button onClick={() => sendMessage.mutate("hello there")}>Send</button>
    </div>
  );
}

function AvailableSlotsHarness({ date }: { date: Date | undefined }) {
  const { data, isPending, isError } = useAvailableSlots(TOKEN, date, 30);
  if (isPending) return <div>Loading</div>;
  if (isError) return <div>Error</div>;
  return (
    <div>
      {data.map((slot) => (
        <div key={slot.startTime}>{slot.startTime}</div>
      ))}
    </div>
  );
}

function FileUploadHarness() {
  const { data } = usePortalData(TOKEN);
  const upload = useFileUpload(TOKEN);
  return (
    <div>
      <div>{data?.files.length ?? 0} files</div>
      <button
        onClick={() =>
          upload.mutate({ file: new File(["x"], "report.pdf"), caseId: 7 })
        }
      >
        Upload File
      </button>
    </div>
  );
}

function BookMeetingHarness() {
  const [confirmed, setConfirmed] = React.useState(false);
  const book = useBookMeeting(TOKEN, () => setConfirmed(true));
  const booking: BookingInput = {
    clientName: "Jane Doe",
    clientEmail: "jane@example.com",
    dateTime: "2026-08-10T14:00:00Z",
    duration: 30,
  };
  return (
    <div>
      <div>{confirmed ? "Confirmed" : "Not confirmed"}</div>
      <button onClick={() => book.mutate(booking)}>Book</button>
    </div>
  );
}

const basePortalData: PortalData = {
  client: { id: 1, name: "Jane Doe", email: "jane@example.com" },
  settings: {},
  cases: [],
  files: [],
  bookings: [],
  documentRequests: [],
};

describe("usePortalData", () => {
  it("returns the portal payload on success", async () => {
    worker.use(
      http.get(`/api/portal/${TOKEN}`, () => HttpResponse.json(basePortalData))
    );

    const screen = await renderWithQueryClient(<PortalDataHarness />);
    await expect
      .element(screen.getByText("Jane Doe", { exact: true }))
      .toBeInTheDocument();
  });

  it("surfaces a request failure", async () => {
    worker.use(
      http.get(`/api/portal/${TOKEN}`, () =>
        HttpResponse.json({ error: "not found" }, { status: 404 })
      )
    );

    const screen = await renderWithQueryClient(<PortalDataHarness />);
    await expect
      .element(screen.getByText("Error", { exact: true }))
      .toBeInTheDocument();
  });
});

describe("usePortalChat", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders messages from the initial chat fetch", async () => {
    worker.use(
      http.get(`/api/portal/${TOKEN}`, () =>
        HttpResponse.json({
          messages: [
            {
              id: 1,
              senderType: "agency",
              body: "Welcome!",
              readAt: null,
              createdAt: "2026-08-01T00:00:00Z",
            } satisfies PortalChatMessage,
          ],
        })
      )
    );

    const screen = await renderWithQueryClient(<PortalChatHarness />);

    await expect
      .element(screen.getByText("Welcome!", { exact: true }))
      .toBeInTheDocument();
  });

  it("shows the message optimistically and confirms on success", async () => {
    let persisted: PortalChatMessage[] = [];
    worker.use(
      http.get(`/api/portal/${TOKEN}`, () =>
        HttpResponse.json({ messages: persisted })
      ),
      http.post(`/api/portal/${TOKEN}/chat`, async ({ request }) => {
        const { message: body } = (await request.json()) as {
          message: string;
        };
        const message: PortalChatMessage = {
          id: 99,
          senderType: "client",
          body,
          readAt: null,
          createdAt: "2026-08-05T00:00:00Z",
        };
        persisted = [...persisted, message];
        return HttpResponse.json(message);
      })
    );
    const successSpy = vi.spyOn(toast, "success");

    const screen = await renderWithQueryClient(<PortalChatHarness />);
    await screen.getByRole("button", { name: "Send" }).click();

    // optimistic message shows up immediately
    await expect
      .element(screen.getByText("hello there", { exact: true }))
      .toBeInTheDocument();

    await vi.waitFor(() => {
      expect(successSpy).toHaveBeenCalledWith({
        title: "Sent",
        description: "Message sent successfully",
      });
    });

    // still present once the invalidated query refetches the persisted list
    await expect
      .element(screen.getByText("hello there", { exact: true }))
      .toBeInTheDocument();
  });

  it("rolls back the optimistic message and shows an error toast on failure", async () => {
    worker.use(
      http.get(`/api/portal/${TOKEN}`, () =>
        HttpResponse.json({ messages: [] })
      ),
      http.post(`/api/portal/${TOKEN}/chat`, () =>
        HttpResponse.json({ error: "boom" }, { status: 500 })
      )
    );
    const errorSpy = vi.spyOn(toast, "error");

    const screen = await renderWithQueryClient(<PortalChatHarness />);
    await screen.getByRole("button", { name: "Send" }).click();

    await vi.waitFor(() => {
      expect(errorSpy).toHaveBeenCalledWith({
        title: "Failed",
        description: "Message failed to send",
      });
    });
    expect(
      screen.getByText("hello there", { exact: true })
    ).not.toBeInTheDocument();
  });
});

describe("useAvailableSlots", () => {
  it("does not fetch until a date is picked", async () => {
    const handler = vi.fn(() => HttpResponse.json({ slots: [] }));
    worker.use(http.get(`/api/portal/${TOKEN}`, handler));

    const screen = await renderWithQueryClient(
      <AvailableSlotsHarness date={undefined} />
    );

    await expect
      .element(screen.getByText("Loading", { exact: true }))
      .toBeInTheDocument();
    expect(handler).not.toHaveBeenCalled();
  });

  it("fetches and renders available slots once a date is selected", async () => {
    worker.use(
      http.get(`/api/portal/${TOKEN}`, () =>
        HttpResponse.json({
          slots: [
            {
              startTime: "2026-08-10T14:00:00Z",
              available: true,
            },
          ] satisfies TimeSlot[],
        })
      )
    );

    const screen = await renderWithQueryClient(
      <AvailableSlotsHarness date={new Date("2026-08-10T00:00:00Z")} />
    );

    await expect
      .element(screen.getByText("2026-08-10T14:00:00Z", { exact: true }))
      .toBeInTheDocument();
  });

  it("surfaces a request failure", async () => {
    worker.use(
      http.get(`/api/portal/${TOKEN}`, () =>
        HttpResponse.json({ error: "unavailable" }, { status: 500 })
      )
    );

    const screen = await renderWithQueryClient(
      <AvailableSlotsHarness date={new Date("2026-08-10T00:00:00Z")} />
    );

    await expect
      .element(screen.getByText("Error", { exact: true }))
      .toBeInTheDocument();
  });
});

describe("useDocumentItemUpload", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("shows a success toast with the AI reasoning when the document meets the requirement", async () => {
    worker.use(
      http.post("/api/portal/:token/document-requests/:itemId/upload", () =>
        HttpResponse.json({
          analysis: { verdict: "meets", reasoning: "Clear and valid ID." },
        })
      )
    );
    const successSpy = vi.spyOn(toast, "success");

    const screen = await renderWithQueryClient(<UploadHarness />);
    await screen.getByRole("button", { name: "Upload" }).click();

    await vi.waitFor(() => {
      expect(successSpy).toHaveBeenCalledWith({
        title: "Looks good",
        description: "Clear and valid ID.",
      });
    });
  });

  it("shows a warning toast with the AI reasoning when the document does not meet the requirement", async () => {
    worker.use(
      http.post("/api/portal/:token/document-requests/:itemId/upload", () =>
        HttpResponse.json({
          analysis: {
            verdict: "does_not_meet",
            reasoning: "Expired document.",
          },
        })
      )
    );
    const warningSpy = vi.spyOn(toast, "warning");

    const screen = await renderWithQueryClient(<UploadHarness />);
    await screen.getByRole("button", { name: "Upload" }).click();

    await vi.waitFor(() => {
      expect(warningSpy).toHaveBeenCalledWith({
        title: "Does not meet requirement",
        description: "Expired document.",
      });
    });
  });

  it("falls back to a generic success toast when no AI analysis is returned", async () => {
    worker.use(
      http.post("/api/portal/:token/document-requests/:itemId/upload", () =>
        HttpResponse.json({})
      )
    );
    const successSpy = vi.spyOn(toast, "success");

    const screen = await renderWithQueryClient(<UploadHarness />);
    await screen.getByRole("button", { name: "Upload" }).click();

    await vi.waitFor(() => {
      expect(successSpy).toHaveBeenCalledWith({
        title: "Uploaded",
        description: "File uploaded successfully",
      });
    });
  });

  it("shows only an error toast — not a false success toast — when the upload request fails", async () => {
    worker.use(
      http.post("/api/portal/:token/document-requests/:itemId/upload", () =>
        HttpResponse.json({ error: "too large" }, { status: 500 })
      )
    );
    const successSpy = vi.spyOn(toast, "success");
    const errorSpy = vi.spyOn(toast, "error");

    const screen = await renderWithQueryClient(<UploadHarness />);
    await screen.getByRole("button", { name: "Upload" }).click();

    await vi.waitFor(() => {
      expect(errorSpy).toHaveBeenCalledWith({
        title: "Failed",
        description: "File upload failed",
      });
    });
    expect(successSpy).not.toHaveBeenCalled();
  });
});

describe("useFileUpload", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("invalidates the portal query and shows a success toast on success", async () => {
    let uploaded = false;
    worker.use(
      http.get(`/api/portal/${TOKEN}`, () =>
        HttpResponse.json({
          ...basePortalData,
          files: uploaded
            ? [
                {
                  id: 1,
                  name: "report.pdf",
                  size: 4,
                  mimeType: "application/pdf",
                  path: "p",
                  createdAt: "2026-08-05T00:00:00Z",
                },
              ]
            : [],
        })
      ),
      http.post(`/api/portal/${TOKEN}/files`, () => {
        uploaded = true;
        return HttpResponse.json({
          id: 1,
          name: "report.pdf",
          size: 4,
          mimeType: "application/pdf",
          path: "p",
          createdAt: "2026-08-05T00:00:00Z",
        });
      })
    );
    const successSpy = vi.spyOn(toast, "success");

    const screen = await renderWithQueryClient(<FileUploadHarness />);
    await expect
      .element(screen.getByText("0 files", { exact: true }))
      .toBeInTheDocument();

    await screen.getByRole("button", { name: "Upload File" }).click();

    await vi.waitFor(() => {
      expect(successSpy).toHaveBeenCalledWith({
        title: "Uploaded",
        description: "File uploaded successfully",
      });
    });

    // portal query is invalidated and refetches the updated file list
    await expect
      .element(screen.getByText("1 files", { exact: true }))
      .toBeInTheDocument();
  });

  it("shows only an error toast — not a false success toast — when the upload fails", async () => {
    worker.use(
      http.get(`/api/portal/${TOKEN}`, () => HttpResponse.json(basePortalData)),
      http.post(`/api/portal/${TOKEN}/files`, () =>
        HttpResponse.json({ error: "too large" }, { status: 500 })
      )
    );
    const successSpy = vi.spyOn(toast, "success");
    const errorSpy = vi.spyOn(toast, "error");

    const screen = await renderWithQueryClient(<FileUploadHarness />);
    await screen.getByRole("button", { name: "Upload File" }).click();

    await vi.waitFor(() => {
      expect(errorSpy).toHaveBeenCalledWith({
        title: "Failed",
        description: "File upload failed",
      });
    });
    expect(successSpy).not.toHaveBeenCalled();
  });
});

describe("useBookMeeting", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("calls onConfirmed and shows a success toast when booking succeeds", async () => {
    worker.use(
      http.post(`/api/portal/${TOKEN}/bookings`, () =>
        HttpResponse.json({ success: true, bookingId: 1 })
      )
    );
    const successSpy = vi.spyOn(toast, "success");

    const screen = await renderWithQueryClient(<BookMeetingHarness />);
    await expect
      .element(screen.getByText("Not confirmed", { exact: true }))
      .toBeInTheDocument();

    await screen.getByRole("button", { name: "Book" }).click();

    await vi.waitFor(() => {
      expect(successSpy).toHaveBeenCalledWith({
        title: "Booked",
        description: "Meeting booked successfully",
      });
    });
    await expect
      .element(screen.getByText("Confirmed", { exact: true }))
      .toBeInTheDocument();
  });

  it("does not call onConfirmed and shows an error toast when booking fails", async () => {
    worker.use(
      http.post(`/api/portal/${TOKEN}/bookings`, () =>
        HttpResponse.json({ error: "slot taken" }, { status: 409 })
      )
    );
    const errorSpy = vi.spyOn(toast, "error");

    const screen = await renderWithQueryClient(<BookMeetingHarness />);
    await screen.getByRole("button", { name: "Book" }).click();

    await vi.waitFor(() => {
      expect(errorSpy).toHaveBeenCalledWith({
        title: "Failed",
        description: "Meeting booking failed",
      });
    });
    expect(
      screen.getByText("Confirmed", { exact: true })
    ).not.toBeInTheDocument();
  });
});
