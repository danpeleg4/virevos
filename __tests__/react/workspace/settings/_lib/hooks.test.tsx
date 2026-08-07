import React from "react";
import { http, HttpResponse } from "msw";
import { worker } from "../../../../msw/worker";
import { renderWithQueryClient } from "../../../../_helpers/render";
import {
  useAvatarUrl,
  useChangePassword,
  useIntegrationsStatus,
  useProductUpdatesSetting,
  useToggleProductUpdates,
  useUpdateProfile,
  useUploadAvatar,
  useUserProfile,
} from "@/app/workspace/settings/_lib/hooks";
import { profileFixture } from "../../../../msw/handlers/user";
import type { Integration } from "@/types/integrations";

describe("useUserProfile / useUpdateProfile", () => {
  it("loads the profile and optimistically saves edits", async () => {
    function Harness() {
      const { data } = useUserProfile();
      const update = useUpdateProfile(profileFixture.email);
      return (
        <div>
          <div>Name: {data?.name}</div>
          <button onClick={() => update.mutate({ name: "Jane Renamed" })}>
            Save
          </button>
        </div>
      );
    }
    const screen = await renderWithQueryClient(<Harness />);
    await expect
      .element(screen.getByText("Name: John Doe"))
      .toBeInTheDocument();

    await screen.getByRole("button", { name: "Save" }).click();

    await expect
      .element(screen.getByText("Name: Jane Renamed"))
      .toBeInTheDocument();
  });

  it("rolls back the optimistic profile update on failure", async () => {
    worker.use(
      http.patch("/api/user", () =>
        HttpResponse.json({ error: "boom" }, { status: 500 })
      )
    );
    function Harness() {
      const { data } = useUserProfile();
      const update = useUpdateProfile(profileFixture.email);
      return (
        <div>
          <div>Name: {data?.name}</div>
          <button onClick={() => update.mutate({ name: "Will Rollback" })}>
            Save
          </button>
        </div>
      );
    }
    const screen = await renderWithQueryClient(<Harness />);
    await expect
      .element(screen.getByText("Name: John Doe"))
      .toBeInTheDocument();

    await screen.getByRole("button", { name: "Save" }).click();

    await expect
      .element(screen.getByText("Name: John Doe"))
      .toBeInTheDocument();
  });
});

describe("useAvatarUrl / useUploadAvatar", () => {
  it("uploads a file and updates the avatar cache", async () => {
    function Harness() {
      const { data } = useAvatarUrl();
      const upload = useUploadAvatar();
      return (
        <div>
          <div>Avatar: {data?.url ?? "none"}</div>
          <button onClick={() => upload.mutate(new File(["x"], "avatar.png"))}>
            Upload
          </button>
        </div>
      );
    }
    const screen = await renderWithQueryClient(<Harness />);
    await expect.element(screen.getByText("Avatar: none")).toBeInTheDocument();

    await screen.getByRole("button", { name: "Upload" }).click();

    await expect
      .element(screen.getByText("Avatar: https://cdn/avatar.png"))
      .toBeInTheDocument();
  });
});

describe("useProductUpdatesSetting / useToggleProductUpdates", () => {
  it("optimistically toggles and persists after refetch", async () => {
    let enabled = false;
    worker.use(
      http.get("/api/user", ({ request }) => {
        const type = new URL(request.url).searchParams.get("type");
        if (type === "product-updates") return HttpResponse.json(enabled);
        return HttpResponse.json({ error: "No type found" }, { status: 400 });
      }),
      http.patch("/api/user", async ({ request }) => {
        const body = (await request.json()) as {
          type: string;
          data?: { enabled?: boolean };
        };
        if (body.type === "product-updates") {
          enabled = body.data?.enabled === true;
          return HttpResponse.json({ enabled });
        }
        return HttpResponse.json({ error: "No type found" }, { status: 400 });
      })
    );
    function Harness() {
      const { data } = useProductUpdatesSetting();
      const toggle = useToggleProductUpdates();
      return (
        <div>
          <div>Enabled: {String(data ?? false)}</div>
          <button onClick={() => toggle.mutate(true)}>Enable</button>
        </div>
      );
    }
    const screen = await renderWithQueryClient(<Harness />);
    await expect
      .element(screen.getByText("Enabled: false"))
      .toBeInTheDocument();

    await screen.getByRole("button", { name: "Enable" }).click();

    await expect.element(screen.getByText("Enabled: true")).toBeInTheDocument();
  });

  it("rolls back the toggle when the request fails", async () => {
    worker.use(
      http.get("/api/user", ({ request }) => {
        const type = new URL(request.url).searchParams.get("type");
        if (type === "product-updates") return HttpResponse.json(false);
        return HttpResponse.json({ error: "No type found" }, { status: 400 });
      }),
      http.patch("/api/user", () =>
        HttpResponse.json({ error: "boom" }, { status: 500 })
      )
    );
    function Harness() {
      const { data } = useProductUpdatesSetting();
      const toggle = useToggleProductUpdates();
      return (
        <div>
          <div>Enabled: {String(data ?? false)}</div>
          <button onClick={() => toggle.mutate(true)}>Enable</button>
        </div>
      );
    }
    const screen = await renderWithQueryClient(<Harness />);
    await screen.getByRole("button", { name: "Enable" }).click();

    await expect
      .element(screen.getByText("Enabled: false"))
      .toBeInTheDocument();
  });
});

describe("useChangePassword", () => {
  it("submits the current and new password", async () => {
    let patchBody: unknown;
    worker.use(
      http.patch("/api/user", async ({ request }) => {
        patchBody = await request.json();
        return HttpResponse.json({ success: true });
      })
    );
    function Harness() {
      const changePassword = useChangePassword();
      return (
        <button
          onClick={() =>
            changePassword.mutate({
              currentPassword: "old-pass",
              newPassword: "new-pass-123",
            })
          }
        >
          Update
        </button>
      );
    }
    const screen = await renderWithQueryClient(<Harness />);
    await screen.getByRole("button", { name: "Update" }).click();

    await vi.waitFor(() => {
      expect(patchBody).toEqual({
        type: "password",
        data: { currentPassword: "old-pass", newPassword: "new-pass-123" },
      });
    });
  });

  it("surfaces an error when the request fails", async () => {
    worker.use(
      http.patch("/api/user", () =>
        HttpResponse.json({ error: "Incorrect password" }, { status: 400 })
      )
    );
    function Harness() {
      const changePassword = useChangePassword();
      return (
        <div>
          <button
            onClick={() =>
              changePassword.mutate({
                currentPassword: "wrong",
                newPassword: "new-pass-123",
              })
            }
          >
            Update
          </button>
          {changePassword.isError && <div>Failed</div>}
        </div>
      );
    }
    const screen = await renderWithQueryClient(<Harness />);
    await screen.getByRole("button", { name: "Update" }).click();

    await expect.element(screen.getByText("Failed")).toBeInTheDocument();
  });
});

describe("useIntegrationsStatus", () => {
  it("marks outlook connected based on the API response", async () => {
    worker.use(
      http.get("/api/integrations/outlook", () =>
        HttpResponse.json({ connected: true })
      )
    );
    const initial: Integration[] = [
      {
        id: "outlook",
        name: "Microsoft Outlook",
        description: "Sync with Outlook Calendar",
        icon: "/outlook.svg",
        connected: false,
        syncStatus: "not-connected",
        features: [],
      },
    ];
    function Harness() {
      const { data } = useIntegrationsStatus(initial);
      return <div>Connected: {String(data?.[0]?.connected ?? false)}</div>;
    }
    const screen = await renderWithQueryClient(<Harness />);
    await expect
      .element(screen.getByText("Connected: true"))
      .toBeInTheDocument();
  });
});
