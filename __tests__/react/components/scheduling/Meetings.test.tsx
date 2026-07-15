import React from "react";
import { http, HttpResponse } from "msw";
import { worker } from "../../../msw/worker";
import { renderWithQueryClient } from "../../../_helpers/render";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => "/workspace/calendar",
}));

const mockMeetings = [
  {
    id: "m1",
    title: "Sprint Planning",
    description: "",
    status: "upcoming",
    dateTime: "2026-05-10T10:00:00Z",
    duration: 60,
    attendees: [],
    isMeeting: true,
  },
  {
    id: "m2",
    title: "Client Review",
    description: "",
    status: "ended",
    dateTime: "2026-05-01T14:00:00Z",
    duration: 60,
    attendees: [],
    isMeeting: true,
  },
];

import { Meetings } from "@/app/components/scheduling/Meetings";

function useMeetingsHandler(data = mockMeetings) {
  worker.use(http.get("/api/events", () => HttpResponse.json(data)));
}

describe("Meetings", () => {
  beforeEach(() => {
    useMeetingsHandler();
  });

  it("renders the meetings table with data", async () => {
    const screen = await renderWithQueryClient(<Meetings />);
    await expect
      .element(screen.getByText("Sprint Planning"))
      .toBeInTheDocument();
    await expect.element(screen.getByText("Client Review")).toBeInTheDocument();
  });

  it("renders search input", async () => {
    const screen = await renderWithQueryClient(<Meetings />);
    await expect
      .element(screen.getByPlaceholder(/search/i))
      .toBeInTheDocument();
  });

  it("filters meetings by search query", async () => {
    const screen = await renderWithQueryClient(<Meetings />);
    await expect
      .element(screen.getByText("Sprint Planning"))
      .toBeInTheDocument();
    await screen.getByPlaceholder(/search/i).fill("sprint");
    await expect
      .element(screen.getByText("Sprint Planning"))
      .toBeInTheDocument();
    await expect
      .element(screen.getByText("Client Review"))
      .not.toBeInTheDocument();
  });

  it("renders 'New Meeting' button", async () => {
    const screen = await renderWithQueryClient(<Meetings />);
    await expect
      .element(screen.getByRole("button", { name: /new meeting/i }))
      .toBeInTheDocument();
  });

  it("opens Start Meeting modal when button is clicked", async () => {
    const screen = await renderWithQueryClient(<Meetings />);
    await screen.getByRole("button", { name: /new meeting/i }).click();
    await expect
      .element(screen.getByText(/start new meeting/i))
      .toBeInTheDocument();
  });

  it("shows empty state when no meetings loaded", async () => {
    useMeetingsHandler([]);
    const screen = await renderWithQueryClient(<Meetings />);
    await expect
      .element(screen.getByText("Sprint Planning"))
      .not.toBeInTheDocument();
  });

  it("renders a delete button for each meeting row", async () => {
    const screen = await renderWithQueryClient(<Meetings />);
    await expect
      .element(screen.getByText("Sprint Planning"))
      .toBeInTheDocument();
    const deleteButtons = screen.getByRole("button", {
      name: /delete meeting/i,
    });
    await expect.element(deleteButtons.first()).toBeInTheDocument();
    expect(deleteButtons.elements().length).toBe(mockMeetings.length);
  });

  it("opens the delete confirmation dialog when the delete button is clicked", async () => {
    const screen = await renderWithQueryClient(<Meetings />);
    await expect
      .element(screen.getByText("Sprint Planning"))
      .toBeInTheDocument();
    await screen
      .getByRole("button", { name: /delete meeting/i })
      .first()
      .click();
    await expect
      .element(screen.getByText(/delete meeting\?/i))
      .toBeInTheDocument();
    await expect
      .element(screen.getByText(/permanently deleted/i))
      .toBeInTheDocument();
    await expect
      .element(screen.getByText(/"sprint planning"/i))
      .toBeInTheDocument();
  });

  it("DELETEs the meeting when the user confirms", async () => {
    let deletedId: string | undefined;
    worker.use(
      http.delete("/api/events/:id", ({ params }) => {
        deletedId = String(params.id);
        return HttpResponse.json({ success: true });
      })
    );

    const screen = await renderWithQueryClient(<Meetings />);
    await expect
      .element(screen.getByText("Sprint Planning"))
      .toBeInTheDocument();
    await screen
      .getByRole("button", { name: /delete meeting/i })
      .first()
      .click();
    await screen.getByRole("button", { name: /^delete$/i }).click();

    await vi.waitFor(() => expect(deletedId).toBe("m1"));
  });

  it("POSTs a new instant meeting when starting one", async () => {
    let postBody: Record<string, unknown> | undefined;
    worker.use(
      http.post("/api/meetings", async ({ request }) => {
        postBody = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json({
          id: "new-meeting",
          link: "https://virevos.com/meet/new-meeting",
        });
      })
    );

    const screen = await renderWithQueryClient(<Meetings />);
    await screen.getByRole("button", { name: /new meeting/i }).click();
    await screen.getByPlaceholder("Team Standup").fill("Kickoff");
    await screen.getByRole("button", { name: /^start meeting$/i }).click();

    await vi.waitFor(() =>
      expect(postBody).toEqual(expect.objectContaining({ title: "Kickoff" }))
    );
  });
});
