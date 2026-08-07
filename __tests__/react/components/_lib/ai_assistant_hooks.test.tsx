import React from "react";
import { http, HttpResponse } from "msw";
import { worker } from "../../../msw/worker";
import { renderWithQueryClient } from "../../../_helpers/render";
import {
  useAcceptPortalBooking,
  useApproveDocumentRequest,
  useDeclineDocumentRequest,
  useDenyPortalBooking,
  usePendingDocumentRequests,
  useUpdateDocumentRequest,
} from "@/app/components/_lib/ai_assistant_hooks";
import type { PendingDocRequest } from "@/types/document_requests";

const pendingRequestFixture: PendingDocRequest = {
  id: 1,
  eventId: "evt-1",
  eventTitle: "Intake Meeting",
  eventDateTime: "2026-08-05T10:00:00.000Z",
  clientId: null,
  status: "pending_approval",
  createdAt: "2026-08-01T10:00:00.000Z",
  items: [],
};

describe("useAcceptPortalBooking / useDenyPortalBooking", () => {
  it("accepts a booking", async () => {
    let acceptBody: unknown;
    worker.use(
      http.patch("/api/portal-bookings/:id", async ({ request }) => {
        acceptBody = await request.json();
        return HttpResponse.json({ success: true });
      })
    );
    function Harness() {
      const accept = useAcceptPortalBooking();
      return <button onClick={() => accept.mutate(1)}>Accept</button>;
    }
    const screen = await renderWithQueryClient(<Harness />);
    await screen.getByRole("button", { name: "Accept" }).click();

    await vi.waitFor(() => {
      expect(acceptBody).toEqual({ type: "accept" });
    });
  });

  it("denies a booking", async () => {
    let denyBody: unknown;
    worker.use(
      http.patch("/api/portal-bookings/:id", async ({ request }) => {
        denyBody = await request.json();
        return HttpResponse.json({ success: true });
      })
    );
    function Harness() {
      const deny = useDenyPortalBooking();
      return <button onClick={() => deny.mutate(1)}>Deny</button>;
    }
    const screen = await renderWithQueryClient(<Harness />);
    await screen.getByRole("button", { name: "Deny" }).click();

    await vi.waitFor(() => {
      expect(denyBody).toEqual({
        type: "status",
        data: { status: "cancelled" },
      });
    });
  });
});

describe("usePendingDocumentRequests", () => {
  it("fetches only when enabled", async () => {
    let fetched = false;
    worker.use(
      http.get("/api/document-requests/pending", () => {
        fetched = true;
        return HttpResponse.json([pendingRequestFixture]);
      })
    );
    function Harness({ enabled }: { enabled: boolean }) {
      const { data } = usePendingDocumentRequests(enabled);
      return <div>Count: {data?.length ?? 0}</div>;
    }
    await renderWithQueryClient(<Harness enabled={false} />);
    expect(fetched).toBe(false);

    const screen = await renderWithQueryClient(<Harness enabled={true} />);
    await expect.element(screen.getByText("Count: 1")).toBeInTheDocument();
  });
});

describe("useUpdateDocumentRequest", () => {
  it("PATCHes the client/items patch and invalidates pending requests", async () => {
    let patchBody: unknown;
    worker.use(
      http.patch("/api/document-requests/:id", async ({ request }) => {
        patchBody = await request.json();
        return HttpResponse.json({ success: true });
      })
    );
    function Harness() {
      const update = useUpdateDocumentRequest(1);
      return (
        <button onClick={() => update.mutate({ clientId: 5 })}>Update</button>
      );
    }
    const screen = await renderWithQueryClient(<Harness />);
    await screen.getByRole("button", { name: "Update" }).click();

    await vi.waitFor(() => {
      expect(patchBody).toEqual({ type: "update", data: { clientId: 5 } });
    });
  });
});

describe("useApproveDocumentRequest / useDeclineDocumentRequest", () => {
  it("approves a document request", async () => {
    let approveBody: unknown;
    worker.use(
      http.patch("/api/document-requests/:id", async ({ request }) => {
        approveBody = await request.json();
        return HttpResponse.json({ success: true });
      })
    );
    function Harness() {
      const approve = useApproveDocumentRequest(1);
      return <button onClick={() => approve.mutate()}>Approve</button>;
    }
    const screen = await renderWithQueryClient(<Harness />);
    await screen.getByRole("button", { name: "Approve" }).click();

    await vi.waitFor(() => {
      expect(approveBody).toEqual({ type: "approve" });
    });
  });

  it("declines a document request", async () => {
    let declineBody: unknown;
    worker.use(
      http.patch("/api/document-requests/:id", async ({ request }) => {
        declineBody = await request.json();
        return HttpResponse.json({ success: true });
      })
    );
    function Harness() {
      const decline = useDeclineDocumentRequest(1);
      return <button onClick={() => decline.mutate()}>Decline</button>;
    }
    const screen = await renderWithQueryClient(<Harness />);
    await screen.getByRole("button", { name: "Decline" }).click();

    await vi.waitFor(() => {
      expect(declineBody).toEqual({ type: "decline" });
    });
  });
});
