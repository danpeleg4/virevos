import React from "react";
import { http, HttpResponse } from "msw";
import { worker } from "../../../../msw/worker";
import { renderWithQueryClient } from "../../../../_helpers/render";
import {
  useAddMeeting,
  useCreateMeeting,
  useDeleteMeeting,
  useMeetings,
  useRecordingStatus,
  useToggleIntegration,
  useToggleRecordingStatus,
  useUpdateMeetingTime,
} from "@/app/components/scheduling/_lib/hooks";
import { eventFixtures } from "../../../../msw/handlers/events";

describe("useMeetings", () => {
  it("normalizes attendees to an array", async () => {
    worker.use(
      http.get("/api/events", () =>
        HttpResponse.json([{ ...eventFixtures[0], attendees: undefined }])
      )
    );
    function Harness() {
      const { data } = useMeetings();
      return <div>Attendees: {data?.[0]?.attendees?.length ?? "none"}</div>;
    }
    const screen = await renderWithQueryClient(<Harness />);
    await expect.element(screen.getByText("Attendees: 0")).toBeInTheDocument();
  });
});

describe("useAddMeeting", () => {
  it("optimistically appends the new meeting", async () => {
    const screen = await renderWithQueryClient(<AddMeetingHarness />);
    await expect.element(screen.getByText("Team Sync")).toBeInTheDocument();

    await screen.getByRole("button", { name: "Add" }).click();

    await expect.element(screen.getByText("New Meeting")).toBeInTheDocument();
  });

  it("rolls back the optimistic meeting when the request fails", async () => {
    worker.use(
      http.post("/api/events", () =>
        HttpResponse.json({ error: "boom" }, { status: 500 })
      )
    );
    const screen = await renderWithQueryClient(<AddMeetingHarness />);

    await screen.getByRole("button", { name: "Add" }).click();

    await expect
      .element(screen.getByText("New Meeting"))
      .not.toBeInTheDocument();
  });
});

function AddMeetingHarness() {
  const { data } = useMeetings();
  const addMeeting = useAddMeeting();
  return (
    <div>
      <ul>
        {data?.map((m) => (
          <li key={m.id}>{m.title}</li>
        ))}
      </ul>
      <button
        onClick={() =>
          addMeeting.mutate({
            id: "temp",
            title: "New Meeting",
            description: "",
            dateTime: new Date("2026-08-01T10:00:00.000Z"),
            duration: 30,
            isMeeting: true,
            status: "upcoming",
          })
        }
      >
        Add
      </button>
    </div>
  );
}

function DeleteMeetingHarness() {
  const { data } = useMeetings();
  const deleteMeeting = useDeleteMeeting();
  return (
    <div>
      <ul>
        {data?.map((m) => (
          <li key={m.id}>{m.title}</li>
        ))}
      </ul>
      <button onClick={() => deleteMeeting.mutate("evt-1")}>Delete</button>
    </div>
  );
}

describe("useDeleteMeeting", () => {
  it("optimistically removes the meeting and keeps it removed after invalidation", async () => {
    let deleted = false;
    worker.use(
      http.get("/api/events", () =>
        HttpResponse.json(deleted ? [] : eventFixtures)
      ),
      http.delete("/api/events/:id", () => {
        deleted = true;
        return HttpResponse.json({ success: true });
      })
    );
    const screen = await renderWithQueryClient(<DeleteMeetingHarness />);
    await expect.element(screen.getByText("Team Sync")).toBeInTheDocument();

    await screen.getByRole("button", { name: "Delete" }).click();

    await expect.element(screen.getByText("Team Sync")).not.toBeInTheDocument();
  });

  it("restores the meeting when the delete request fails", async () => {
    worker.use(
      http.delete("/api/events/:id", () =>
        HttpResponse.json({ error: "boom" }, { status: 500 })
      )
    );
    const screen = await renderWithQueryClient(<DeleteMeetingHarness />);
    await expect.element(screen.getByText("Team Sync")).toBeInTheDocument();

    await screen.getByRole("button", { name: "Delete" }).click();

    await expect.element(screen.getByText("Team Sync")).toBeInTheDocument();
  });
});

describe("useUpdateMeetingTime", () => {
  it("PATCHes the reschedule request", async () => {
    let patchBody: unknown;
    worker.use(
      http.patch("/api/events/:id", async ({ request }) => {
        patchBody = await request.json();
        return HttpResponse.json({ success: true });
      })
    );
    function Harness() {
      const update = useUpdateMeetingTime();
      return (
        <button
          onClick={() =>
            update.mutate({
              id: "evt-1",
              dateTime: new Date("2026-08-02T10:00:00.000Z"),
            })
          }
        >
          Reschedule
        </button>
      );
    }
    const screen = await renderWithQueryClient(<Harness />);
    await screen.getByRole("button", { name: "Reschedule" }).click();

    await vi.waitFor(() => {
      expect(patchBody).toEqual({
        type: "reschedule",
        data: { dateTime: "2026-08-02T10:00:00.000Z" },
      });
    });
  });
});

describe("useCreateMeeting", () => {
  it("posts the meeting title and returns the created meeting", async () => {
    let postBody: unknown;
    worker.use(
      http.post("/api/meetings", async ({ request }) => {
        postBody = await request.json();
        return HttpResponse.json({ id: "m1", link: "https://meet/m1" });
      })
    );
    function Harness() {
      const create = useCreateMeeting();
      return (
        <div>
          <button onClick={() => create.mutate("Standup")}>Create</button>
          {create.data?.link && <div>{create.data.link}</div>}
        </div>
      );
    }
    const screen = await renderWithQueryClient(<Harness />);
    await screen.getByRole("button", { name: "Create" }).click();

    await expect
      .element(screen.getByText("https://meet/m1"))
      .toBeInTheDocument();
    expect(postBody).toEqual({ title: "Standup" });
  });
});

describe("useRecordingStatus / useToggleRecordingStatus", () => {
  it("optimistically toggles the recording status", async () => {
    let recordingStatus = false;
    worker.use(
      http.get("/api/recording/status", () =>
        HttpResponse.json({ recording_status: recordingStatus })
      ),
      http.patch("/api/user", () => {
        recordingStatus = true;
        return HttpResponse.json({ success: true });
      })
    );
    function Harness() {
      const { data } = useRecordingStatus();
      const toggle = useToggleRecordingStatus();
      return (
        <div>
          <div>Recording: {String(data?.recording_status ?? false)}</div>
          <button onClick={() => toggle.mutate()}>Toggle</button>
        </div>
      );
    }
    const screen = await renderWithQueryClient(<Harness />);
    await expect
      .element(screen.getByText("Recording: false"))
      .toBeInTheDocument();

    await screen.getByRole("button", { name: "Toggle" }).click();

    await expect
      .element(screen.getByText("Recording: true"))
      .toBeInTheDocument();
  });

  it("rolls back when the toggle request fails", async () => {
    worker.use(
      http.get("/api/recording/status", () =>
        HttpResponse.json({ recording_status: false })
      ),
      http.patch("/api/user", () =>
        HttpResponse.json({ error: "boom" }, { status: 500 })
      )
    );
    function Harness() {
      const { data } = useRecordingStatus();
      const toggle = useToggleRecordingStatus();
      return (
        <div>
          <div>Recording: {String(data?.recording_status ?? false)}</div>
          <button onClick={() => toggle.mutate()}>Toggle</button>
        </div>
      );
    }
    const screen = await renderWithQueryClient(<Harness />);
    await screen.getByRole("button", { name: "Toggle" }).click();

    await expect
      .element(screen.getByText("Recording: false"))
      .toBeInTheDocument();
  });
});

describe("useToggleIntegration", () => {
  it("disconnects Outlook and invalidates integrations", async () => {
    let disconnected = false;
    worker.use(
      http.delete("/api/integrations/outlook", () => {
        disconnected = true;
        return HttpResponse.json({ success: true });
      })
    );
    function Harness() {
      const toggle = useToggleIntegration();
      return (
        <button
          onClick={() => toggle.mutate({ id: "outlook", action: "disconnect" })}
        >
          Disconnect
        </button>
      );
    }
    const screen = await renderWithQueryClient(<Harness />);
    await screen.getByRole("button", { name: "Disconnect" }).click();

    await vi.waitFor(() => {
      expect(disconnected).toBe(true);
    });
  });
});
