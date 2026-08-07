import React from "react";
import { http, HttpResponse } from "msw";
import { worker } from "../../../msw/worker";
import { renderWithQueryClient } from "../../../_helpers/render";
import { useSubmitDemoRequest } from "@/app/contact/_lib/hooks";

describe("useSubmitDemoRequest", () => {
  it("posts the form values", async () => {
    let postBody: unknown;
    worker.use(
      http.post("/api/demo-requests", async ({ request }) => {
        postBody = await request.json();
        return HttpResponse.json({ success: true, id: 1 });
      })
    );
    function Harness() {
      const mutation = useSubmitDemoRequest();
      return (
        <div>
          <button
            onClick={() =>
              mutation.mutate({
                name: "Jane Doe",
                email: "jane@example.com",
                company: "Acme",
                message: "Interested",
                honeypot: "",
              })
            }
          >
            Submit
          </button>
          {mutation.isSuccess && <div>Sent</div>}
        </div>
      );
    }
    const screen = await renderWithQueryClient(<Harness />);
    await screen.getByRole("button", { name: "Submit" }).click();

    await expect.element(screen.getByText("Sent")).toBeInTheDocument();
    expect(postBody).toEqual({
      name: "Jane Doe",
      email: "jane@example.com",
      company: "Acme",
      message: "Interested",
      honeypot: "",
    });
  });

  it("surfaces an error when the request fails", async () => {
    worker.use(
      http.post("/api/demo-requests", () =>
        HttpResponse.json({ error: "boom" }, { status: 500 })
      )
    );
    function Harness() {
      const mutation = useSubmitDemoRequest();
      return (
        <div>
          <button
            onClick={() =>
              mutation.mutate({
                name: "Jane Doe",
                email: "jane@example.com",
                company: "",
                message: "",
                honeypot: "",
              })
            }
          >
            Submit
          </button>
          {mutation.isError && <div>Failed</div>}
        </div>
      );
    }
    const screen = await renderWithQueryClient(<Harness />);
    await screen.getByRole("button", { name: "Submit" }).click();

    await expect.element(screen.getByText("Failed")).toBeInTheDocument();
  });
});
