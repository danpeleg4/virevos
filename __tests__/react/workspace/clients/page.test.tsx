import React from "react";
import { http, HttpResponse } from "msw";
import { worker } from "../../../msw/worker";
import { renderWithQueryClient } from "../../../_helpers/render";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

import Clients from "@/app/workspace/clients/page";

// default MSW fixtures serve "Jane Client" (active) and "Acme Corp" (inactive)

describe("Clients Page", () => {
  it("renders clients table with client names", async () => {
    const screen = await renderWithQueryClient(<Clients />);
    await expect.element(screen.getByText("Jane Client")).toBeInTheDocument();
    await expect.element(screen.getByText("Acme Corp")).toBeInTheDocument();
  });

  it("renders search input", async () => {
    const screen = await renderWithQueryClient(<Clients />);
    await expect
      .element(screen.getByPlaceholder(/search clients/i))
      .toBeInTheDocument();
  });

  it("renders Add Client button", async () => {
    const screen = await renderWithQueryClient(<Clients />);
    await expect
      .element(screen.getByRole("button", { name: /add client/i }))
      .toBeInTheDocument();
  });

  it("opens add client dialog when button is clicked", async () => {
    const screen = await renderWithQueryClient(<Clients />);
    await screen.getByRole("button", { name: /add client/i }).click();
    await expect
      .element(screen.getByText("Add New Client", { exact: true }))
      .toBeInTheDocument();
  });

  it("renders client status badges", async () => {
    const screen = await renderWithQueryClient(<Clients />);
    await expect
      .element(screen.getByText("Active", { exact: true }))
      .toBeInTheDocument();
    await expect
      .element(screen.getByText("Inactive", { exact: true }))
      .toBeInTheDocument();
  });

  it("filters clients by search query", async () => {
    const screen = await renderWithQueryClient(<Clients />);
    await expect.element(screen.getByText("Jane Client")).toBeInTheDocument();
    await screen.getByPlaceholder(/search clients/i).fill("jane");
    await expect.element(screen.getByText("Jane Client")).toBeInTheDocument();
    await expect.element(screen.getByText("Acme Corp")).not.toBeInTheDocument();
  });

  it("renders pagination controls", async () => {
    const screen = await renderWithQueryClient(<Clients />);
    await expect
      .element(screen.getByRole("button", { name: /previous/i }))
      .toBeInTheDocument();
    await expect
      .element(screen.getByRole("button", { name: /next/i }))
      .toBeInTheDocument();
  });

  it("shows empty state when no clients", async () => {
    worker.use(http.get("/api/clients", () => HttpResponse.json([])));

    const screen = await renderWithQueryClient(<Clients />);
    await expect
      .element(screen.getByText(/no clients yet/i))
      .toBeInTheDocument();
  });

  it("POSTs the new client when the add form is submitted", async () => {
    let postBody: Record<string, unknown> | undefined;
    worker.use(
      http.post("/api/clients", async ({ request }) => {
        postBody = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json({ ...postBody, id: 42, status: "active" });
      })
    );

    const screen = await renderWithQueryClient(<Clients />);
    await screen.getByRole("button", { name: /add client/i }).click();
    await screen.getByPlaceholder("Acme Corporation").fill("New Client");
    await screen.getByPlaceholder("contact@acme.com").fill("new@client.com");
    await screen
      .getByRole("button", { name: /^add client$/i })
      .last()
      .click();

    await vi.waitFor(() =>
      expect(postBody).toEqual(
        expect.objectContaining({
          name: "New Client",
          email: "new@client.com",
        })
      )
    );
  });
});
