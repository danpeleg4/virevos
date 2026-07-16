import React from "react";
import { http, HttpResponse } from "msw";
import { worker } from "../../msw/worker";
import { renderWithQueryClient } from "../../_helpers/render";

import { ContactForm } from "@/app/contact/ContactForm";

describe("ContactForm", () => {
  it("renders name, email, company, and message fields", async () => {
    const screen = await renderWithQueryClient(<ContactForm />);
    await expect.element(screen.getByLabelText(/^name$/i)).toBeInTheDocument();
    await expect.element(screen.getByLabelText(/^email$/i)).toBeInTheDocument();
    await expect
      .element(screen.getByLabelText(/company \(optional\)/i))
      .toBeInTheDocument();
    await expect.element(screen.getByLabelText(/message/i)).toBeInTheDocument();
  });

  it("submits the form and shows a success state", async () => {
    let sentBody: unknown;
    worker.use(
      http.post("/api/demo-requests", async ({ request }) => {
        sentBody = await request.json();
        return HttpResponse.json({ success: true, id: 1 });
      })
    );

    const screen = await renderWithQueryClient(<ContactForm />);
    await screen.getByLabelText(/^name$/i).fill("Jane Prospect");
    await screen.getByLabelText(/^email$/i).fill("jane@prospect.com");
    await screen.getByRole("button", { name: /schedule a demo/i }).click();

    await expect
      .element(screen.getByText(/thanks for reaching out/i))
      .toBeInTheDocument();
    await vi.waitFor(() => {
      expect(sentBody).toMatchObject({
        name: "Jane Prospect",
        email: "jane@prospect.com",
      });
    });
  });

  it("shows an error message and keeps entered data on failure", async () => {
    worker.use(
      http.post("/api/demo-requests", () =>
        HttpResponse.json(
          { error: "email is not a valid email" },
          {
            status: 400,
          }
        )
      )
    );

    const screen = await renderWithQueryClient(<ContactForm />);
    await screen.getByLabelText(/^name$/i).fill("Jane Prospect");
    await screen.getByLabelText(/^email$/i).fill("jane@prospect.com");
    await screen.getByRole("button", { name: /schedule a demo/i }).click();

    await expect
      .element(screen.getByText(/email is not a valid email/i))
      .toBeInTheDocument();
    await expect
      .element(screen.getByLabelText(/^name$/i))
      .toHaveValue("Jane Prospect");
  });

  it("does not expose the honeypot field to sighted users", async () => {
    const screen = await renderWithQueryClient(<ContactForm />);
    await expect
      .element(screen.getByLabelText(/company website/i))
      .not.toBeVisible();
  });
});
