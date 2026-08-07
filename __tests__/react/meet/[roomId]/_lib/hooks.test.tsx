import React from "react";
import { http, HttpResponse } from "msw";
import { worker } from "../../../../msw/worker";
import { renderWithQueryClient } from "../../../../_helpers/render";
import {
  useMeetingInfo,
  useStartMeeting,
} from "@/app/meet/[roomId]/_lib/hooks";
import { eventFixtures } from "../../../../msw/handlers/events";

describe("useMeetingInfo", () => {
  it("loads meeting details and host flag", async () => {
    function Harness() {
      const { data } = useMeetingInfo("evt-1");
      return (
        <div>
          Title: {data?.meeting?.title} Host: {String(data?.isHost)}
        </div>
      );
    }
    const screen = await renderWithQueryClient(<Harness />);
    await expect
      .element(screen.getByText(`Title: ${eventFixtures[0].title} Host: true`))
      .toBeInTheDocument();
  });
});

describe("useStartMeeting", () => {
  it("PATCHes a start request", async () => {
    let patchBody: unknown;
    worker.use(
      http.patch("/api/events/:id", async ({ request }) => {
        patchBody = await request.json();
        return HttpResponse.json({ success: true });
      })
    );
    function Harness() {
      const start = useStartMeeting("evt-1");
      return <button onClick={() => start.mutate()}>Start</button>;
    }
    const screen = await renderWithQueryClient(<Harness />);
    await screen.getByRole("button", { name: "Start" }).click();

    await vi.waitFor(() => {
      expect(patchBody).toEqual({ type: "start" });
    });
  });
});
