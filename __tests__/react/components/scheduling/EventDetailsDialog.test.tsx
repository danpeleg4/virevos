import React from "react";
import { render } from "vitest-browser-react";

const mockInvalidateQueries = vi.fn();
const mockUseQueryClient = vi.fn(() => ({
  invalidateQueries: mockInvalidateQueries,
}));

vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => mockUseQueryClient(),
}));

const mockAxiosGet = vi.fn();
vi.mock("axios", () => {
  const axios = {
    get: (...args: unknown[]) => mockAxiosGet(...args),
  };
  return { default: axios, ...axios };
});

vi.mock("@/lib/workspace/tasks", () => ({
  addProjectTasksAction: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@/lib/workspace/meetings", () => ({
  markActionItemAdded: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@/lib/util/date_utils", () => ({
  formatDateOnly: vi.fn(() => "Jan 1, 2026"),
  formatTimeOnly: vi.fn(() => "10:00 AM"),
}));

import { EventDetailsDialog } from "@/app/components/scheduling/EventDetailsDialog";
import { addProjectTasksAction } from "@/lib/workspace/tasks";
import { markActionItemAdded } from "@/lib/workspace/meetings";
import { Event } from "@/types/meeting";

const baseEvent: Event = {
  id: "evt-1",
  title: "Team Sync",
  description: "Weekly sync",
  dateTime: new Date("2026-01-01T10:00:00"),
  duration: 30,
  isMeeting: true,
  hasNotes: false,
  hasTranscript: false,
};

describe("EventDetailsDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the event title", async () => {
    const screen = await render(
      <EventDetailsDialog
        event={baseEvent}
        open={true}
        onOpenChange={vi.fn()}
      />
    );
    await expect.element(screen.getByText("Team Sync")).toBeInTheDocument();
  });

  it("renders date, time and duration", async () => {
    const screen = await render(
      <EventDetailsDialog
        event={baseEvent}
        open={true}
        onOpenChange={vi.fn()}
      />
    );
    await expect.element(screen.getByText("Jan 1, 2026")).toBeInTheDocument();
    await expect.element(screen.getByText(/10:00 AM/)).toBeInTheDocument();
    await expect.element(screen.getByText(/30/)).toBeInTheDocument();
  });

  it("renders attendees when provided", async () => {
    const event: Event = {
      ...baseEvent,
      attendees: [{ name: "Alice", initials: "A" }],
    };
    const screen = await render(
      <EventDetailsDialog event={event} open={true} onOpenChange={vi.fn()} />
    );
    await expect.element(screen.getByText("Alice")).toBeInTheDocument();
  });

  it("renders tags when provided", async () => {
    const event: Event = { ...baseEvent, tags: ["design", "frontend"] };
    const screen = await render(
      <EventDetailsDialog event={event} open={true} onOpenChange={vi.fn()} />
    );
    await expect.element(screen.getByText("design")).toBeInTheDocument();
    await expect.element(screen.getByText("frontend")).toBeInTheDocument();
  });

  it("renders meeting link with Copy and Open buttons", async () => {
    const event: Event = { ...baseEvent, link: "https://meet.example.com/abc" };
    const screen = await render(
      <EventDetailsDialog event={event} open={true} onOpenChange={vi.fn()} />
    );
    // no getByDisplayValue locator; assert an input carries the link value
    await vi.waitFor(() => {
      const match = Array.from(document.querySelectorAll("input")).some(
        (input) => input.value === "https://meet.example.com/abc"
      );
      expect(match).toBe(true);
    });
    await expect
      .element(screen.getByRole("button", { name: /copy/i }))
      .toBeInTheDocument();
    await expect
      .element(screen.getByRole("button", { name: /open/i }))
      .toBeInTheDocument();
  });

  it("renders AI summary when hasNotes and ai_summary are set", async () => {
    const event: Event = {
      ...baseEvent,
      hasNotes: true,
      ai_summary: "This meeting covered Q1 goals.",
    };
    const screen = await render(
      <EventDetailsDialog event={event} open={true} onOpenChange={vi.fn()} />
    );
    await expect
      .element(screen.getByText("This meeting covered Q1 goals."))
      .toBeInTheDocument();
  });

  it("renders key points when hasNotes and key_points are set", async () => {
    const event: Event = {
      ...baseEvent,
      hasNotes: true,
      key_points: ["Point A", "Point B"],
    };
    const screen = await render(
      <EventDetailsDialog event={event} open={true} onOpenChange={vi.fn()} />
    );
    await expect.element(screen.getByText("Point A")).toBeInTheDocument();
    await expect.element(screen.getByText("Point B")).toBeInTheDocument();
  });

  it("renders action items with Add buttons", async () => {
    const event: Event = {
      ...baseEvent,
      hasNotes: true,
      action_items: [
        {
          task: "Write report",
          owner: "You",
          dueDate: "2026-02-01",
          completed: false,
          added: false,
        },
        {
          task: "Send email",
          owner: "You",
          dueDate: null,
          completed: false,
          added: false,
        },
      ],
    };
    const screen = await render(
      <EventDetailsDialog event={event} open={true} onOpenChange={vi.fn()} />
    );
    await expect.element(screen.getByText("Write report")).toBeInTheDocument();
    await expect.element(screen.getByText("Send email")).toBeInTheDocument();
    const addButtons = screen.getByRole("button", { name: /^add$/i });
    await expect.element(addButtons.first()).toBeInTheDocument();
    expect(addButtons.elements()).toHaveLength(2);
    await expect
      .element(screen.getByRole("button", { name: /add all to tasks/i }))
      .toBeInTheDocument();
  });

  it("marks action item as added after clicking Add", async () => {
    const event: Event = {
      ...baseEvent,
      hasNotes: true,
      action_items: [
        {
          task: "Fix bug",
          owner: "You",
          dueDate: null,
          completed: false,
          added: false,
        },
      ],
    };
    const screen = await render(
      <EventDetailsDialog event={event} open={true} onOpenChange={vi.fn()} />
    );
    await screen.getByRole("button", { name: /^add$/i }).click();
    await vi.waitFor(() => {
      expect(addProjectTasksAction).toHaveBeenCalledWith(
        expect.objectContaining({ title: "Fix bug", status: "in-progress" })
      );
      expect(markActionItemAdded).toHaveBeenCalledWith("evt-1", 0);
    });
    const addedButtons = screen.getByRole("button", { name: /added/i });
    await expect.element(addedButtons.first()).toBeInTheDocument();
    for (const btn of addedButtons.all()) {
      await expect.element(btn).toBeDisabled();
    }
  });

  it("disables 'Add All to Tasks' when all items already added", async () => {
    const event: Event = {
      ...baseEvent,
      hasNotes: true,
      action_items: [
        {
          task: "Task 1",
          owner: "You",
          dueDate: null,
          completed: false,
          added: true,
        },
      ],
    };
    const screen = await render(
      <EventDetailsDialog event={event} open={true} onOpenChange={vi.fn()} />
    );
    await expect
      .element(screen.getByRole("button", { name: /all added/i }))
      .toBeDisabled();
  });

  it("fetches and displays transcript when hasTranscript is true", async () => {
    mockAxiosGet.mockResolvedValueOnce({
      data: {
        chunks: [
          { speaker: "Alice", text: "Hello everyone", createdAt: null },
          { speaker: "Bob", text: "Good morning", createdAt: null },
        ],
        meetingStartTimeEpoch: 1000,
      },
    });

    const event: Event = { ...baseEvent, hasTranscript: true };
    const screen = await render(
      <EventDetailsDialog event={event} open={true} onOpenChange={vi.fn()} />
    );

    await expect.element(screen.getByText("Alice")).toBeInTheDocument();
    await expect
      .element(screen.getByText("Hello everyone"))
      .toBeInTheDocument();
    expect(mockAxiosGet).toHaveBeenCalledWith("/api/transcript/evt-1");
  });

  it("shows 'View full transcript' button when transcript has more than 3 chunks", async () => {
    mockAxiosGet.mockResolvedValueOnce({
      data: {
        chunks: [
          { speaker: "Alice", text: "Line 1", createdAt: null },
          { speaker: "Bob", text: "Line 2", createdAt: null },
          { speaker: "Alice", text: "Line 3", createdAt: null },
          { speaker: "Bob", text: "Line 4", createdAt: null },
        ],
        meetingStartTimeEpoch: 1000,
      },
    });

    const event: Event = { ...baseEvent, hasTranscript: true };
    const screen = await render(
      <EventDetailsDialog event={event} open={true} onOpenChange={vi.fn()} />
    );

    await expect
      .element(screen.getByRole("button", { name: /view full transcript/i }))
      .toBeInTheDocument();
    await expect.element(screen.getByText("Line 4")).not.toBeInTheDocument();

    await screen.getByRole("button", { name: /view full transcript/i }).click();
    await expect.element(screen.getByText("Line 4")).toBeInTheDocument();
    await expect
      .element(screen.getByRole("button", { name: /show less/i }))
      .toBeInTheDocument();
  });

  it("shows loading state while fetching transcript", async () => {
    mockAxiosGet.mockReturnValueOnce(new Promise(() => {})); // never resolves
    const event: Event = { ...baseEvent, hasTranscript: true };
    const screen = await render(
      <EventDetailsDialog event={event} open={true} onOpenChange={vi.fn()} />
    );
    await expect
      .element(screen.getByText(/loading transcript/i))
      .toBeInTheDocument();
  });

  it("does not fetch transcript when dialog is closed", async () => {
    const event: Event = { ...baseEvent, hasTranscript: true };
    await render(
      <EventDetailsDialog event={event} open={false} onOpenChange={vi.fn()} />
    );
    expect(mockAxiosGet).not.toHaveBeenCalled();
  });
});
