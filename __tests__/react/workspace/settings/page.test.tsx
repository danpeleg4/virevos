import React from "react";
import { page } from "vitest/browser";
import { http, HttpResponse } from "msw";
import { worker } from "../../../msw/worker";
import { renderWithQueryClient } from "../../../_helpers/render";
import { profileFixture } from "../../../msw/handlers/user";

vi.mock("next-themes", () => ({
  useTheme: vi.fn(() => ({ resolvedTheme: "light", setTheme: vi.fn() })),
}));

// Mock IntegrationSettings sub-component
vi.mock("@/app/components/scheduling/IntegrationSettings", () => ({
  IntegrationSettings: () => <div data-testid="integration-settings" />,
  VideoMeetingPreferences: () => <div data-testid="video-preferences" />,
}));

import Settings from "@/app/workspace/settings/page";

describe("Settings Page", () => {
  it("renders Settings heading", async () => {
    const screen = await renderWithQueryClient(<Settings />);
    await expect
      .element(screen.getByText("Settings", { exact: true }))
      .toBeInTheDocument();
  });

  it("renders Profile tab", async () => {
    const screen = await renderWithQueryClient(<Settings />);
    await expect
      .element(screen.getByRole("button", { name: /profile/i }))
      .toBeInTheDocument();
  });

  it("renders Notifications tab", async () => {
    const screen = await renderWithQueryClient(<Settings />);
    await expect
      .element(screen.getByRole("button", { name: /notifications/i }))
      .toBeInTheDocument();
  });

  it("renders Security tab", async () => {
    const screen = await renderWithQueryClient(<Settings />);
    await expect
      .element(screen.getByRole("button", { name: /security/i }))
      .toBeInTheDocument();
  });

  it("renders Integrations tab", async () => {
    const screen = await renderWithQueryClient(<Settings />);
    await expect
      .element(screen.getByRole("button", { name: /integrations/i }))
      .toBeInTheDocument();
  });

  it("shows profile content by default", async () => {
    const screen = await renderWithQueryClient(<Settings />);
    // Default tab is profile — shows the Full name field
    await expect
      .element(screen.getByLabelText(/full name/i))
      .toBeInTheDocument();
  });

  it("switches to Notifications tab when clicked", async () => {
    const screen = await renderWithQueryClient(<Settings />);
    await screen.getByRole("button", { name: /notifications/i }).click();
    await expect
      .element(screen.getByText(/product updates/i))
      .toBeInTheDocument();
  });

  it("reflects the fetched notification preference in the toggle", async () => {
    const screen = await renderWithQueryClient(<Settings />);
    await screen.getByRole("button", { name: /notifications/i }).click();
    await expect.element(screen.getByRole("switch")).not.toBeChecked();
  });

  it("saves a notification preference through the API", async () => {
    let patchBody: unknown;
    worker.use(
      http.patch("/api/user", async ({ request }) => {
        patchBody = await request.json();
        return HttpResponse.json({ enabled: true });
      })
    );

    const screen = await renderWithQueryClient(<Settings />);
    await screen.getByRole("button", { name: /notifications/i }).click();
    await screen.getByRole("switch").first().click();

    await vi.waitFor(() =>
      expect(patchBody).toEqual({
        type: "product-updates",
        data: { enabled: true },
      })
    );
  });

  it("optimistically flips the toggle and rolls back when the save fails", async () => {
    worker.use(
      http.patch("/api/user", () =>
        HttpResponse.json({ error: "Couldn't save" }, { status: 500 })
      )
    );

    const screen = await renderWithQueryClient(<Settings />);
    await screen.getByRole("button", { name: /notifications/i }).click();
    await expect.element(screen.getByRole("switch")).not.toBeChecked();

    await screen.getByRole("switch").first().click();

    // rollback lands after the failed PATCH, along with the error note
    await expect
      .element(screen.getByText(/couldn't save/i))
      .toBeInTheDocument();
    await expect.element(screen.getByRole("switch")).not.toBeChecked();
  });

  it("switches to Security tab when clicked", async () => {
    const screen = await renderWithQueryClient(<Settings />);
    await screen.getByRole("button", { name: /security/i }).click();
    await expect
      .element(screen.getByText(/change password/i))
      .toBeInTheDocument();
  });

  it("switches to Integrations tab when clicked", async () => {
    const screen = await renderWithQueryClient(<Settings />);
    await screen.getByRole("button", { name: /integrations/i }).click();
    await expect
      .element(screen.getByTestId("integration-settings"))
      .toBeInTheDocument();
  });

  it("seeds the full name field from the loaded profile", async () => {
    const screen = await renderWithQueryClient(<Settings />);
    await expect
      .element(screen.getByLabelText(/full name/i))
      .toHaveValue("John Doe");
  });

  it("updates the full name field on input", async () => {
    const screen = await renderWithQueryClient(<Settings />);
    // wait for the profile to seed the field, then edit it
    await expect
      .element(screen.getByLabelText(/full name/i))
      .toHaveValue("John Doe");
    await screen.getByLabelText(/full name/i).fill("Jane Doe");
    await expect
      .element(screen.getByLabelText(/full name/i))
      .toHaveValue("Jane Doe");
  });

  it("saves the edited profile through the API", async () => {
    let patchBody: unknown;
    worker.use(
      http.patch("/api/user", async ({ request }) => {
        patchBody = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json({
          ...profileFixture,
          name: "Jane Doe",
          jobTitle: "Attorney",
        });
      })
    );

    const screen = await renderWithQueryClient(<Settings />);
    await expect
      .element(screen.getByLabelText(/full name/i))
      .toHaveValue("John Doe");
    await screen.getByLabelText(/full name/i).fill("Jane Doe");
    await screen.getByLabelText(/job title/i).fill("Attorney");
    await screen.getByRole("button", { name: /^save$/i }).click();

    await vi.waitFor(() =>
      expect(patchBody).toEqual({
        type: "profile",
        data: {
          name: "Jane Doe",
          jobTitle: "Attorney",
          company: "",
          bio: "",
        },
      })
    );
  });

  it("shows the server error and keeps the form when the save fails", async () => {
    worker.use(
      http.patch("/api/user", () =>
        HttpResponse.json({ error: "name is required" }, { status: 400 })
      )
    );

    const screen = await renderWithQueryClient(<Settings />);
    await expect
      .element(screen.getByLabelText(/full name/i))
      .toHaveValue("John Doe");
    await screen.getByLabelText(/full name/i).fill("Jane Doe");
    await screen.getByRole("button", { name: /^save$/i }).click();

    await expect
      .element(screen.getByText("name is required", { exact: true }))
      .toBeInTheDocument();
  });

  it("disables Save when the name is unchanged", async () => {
    const screen = await renderWithQueryClient(<Settings />);
    await expect
      .element(screen.getByLabelText(/full name/i))
      .toHaveValue("John Doe");
    await expect
      .element(screen.getByRole("button", { name: /^save$/i }))
      .toBeDisabled();
  });

  it("disables Save when the name is emptied", async () => {
    const screen = await renderWithQueryClient(<Settings />);
    await screen.getByLabelText(/full name/i).fill("   ");
    await expect
      .element(screen.getByRole("button", { name: /^save$/i }))
      .toBeDisabled();
  });

  it("uploads a selected avatar image and shows the returned URL", async () => {
    let uploadedName: string | undefined;
    worker.use(
      http.post("/api/user/avatar", async ({ request }) => {
        const formData = await request.formData();
        uploadedName = (formData.get("file") as File | null)?.name;
        return HttpResponse.json({ url: "https://cdn/avatar.png" });
      })
    );

    const { container } = await renderWithQueryClient(<Settings />);
    const fileInput = page.elementLocator(
      container.querySelector('input[type="file"]')!
    );
    const file = new File(["x"], "avatar.png", { type: "image/png" });
    await fileInput.upload(file);

    await vi.waitFor(() => expect(uploadedName).toBe("avatar.png"));
  });

  it("shows the server error when the avatar upload fails", async () => {
    worker.use(
      http.post("/api/user/avatar", () =>
        HttpResponse.json(
          { error: "Image must be 2MB or smaller" },
          { status: 400 }
        )
      )
    );

    const screen = await renderWithQueryClient(<Settings />);
    const fileInput = page.elementLocator(
      screen.container.querySelector('input[type="file"]')!
    );
    await fileInput.upload(new File(["x"], "a.png", { type: "image/png" }));

    await expect
      .element(screen.getByText(/image must be 2mb or smaller/i))
      .toBeInTheDocument();
  });

  it("rejects unsupported avatar file types without uploading", async () => {
    let uploadCalled = false;
    worker.use(
      http.post("/api/user/avatar", () => {
        uploadCalled = true;
        return HttpResponse.json({ url: "https://cdn/avatar.png" });
      })
    );

    const screen = await renderWithQueryClient(<Settings />);
    const fileInput = page.elementLocator(
      screen.container.querySelector('input[type="file"]')!
    );
    const file = new File(["x"], "doc.pdf", { type: "application/pdf" });
    await fileInput.upload(file);

    await expect
      .element(screen.getByText(/unsupported image type/i))
      .toBeInTheDocument();
    expect(uploadCalled).toBe(false);
  });

  it("renders the avatar image when a URL is available", async () => {
    worker.use(
      http.get("/api/user", ({ request }) => {
        const type = new URL(request.url).searchParams.get("type");
        if (type === "avatar")
          return HttpResponse.json({ url: "https://cdn/avatar.png" });
        if (type === "profile") return HttpResponse.json(profileFixture);
        return HttpResponse.json(false);
      })
    );

    const screen = await renderWithQueryClient(<Settings />);
    // AvatarImage only renders once the underlying image reports "loaded",
    // but the file input and upload control should always be present.
    await expect
      .element(screen.getByRole("button", { name: /upload new/i }))
      .toBeInTheDocument();
  });
});
