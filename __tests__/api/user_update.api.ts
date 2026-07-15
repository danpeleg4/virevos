import { PATCH } from "@/app/api/user/route";
import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/supabase/auth";
import {
  changePassword,
  changeRecordingStatus,
  updateProductUpdatesPreference,
  updateProfile,
} from "@/lib/user";
import { userDrizzle } from "@db/user_db";
import { ValidationError } from "@/lib/util/validation";

vi.mock("@/lib/supabase/auth", () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock("@/lib/user", () => ({
  changePassword: vi.fn(),
  changeRecordingStatus: vi.fn(),
  updateProductUpdatesPreference: vi.fn(),
  updateProfile: vi.fn(),
}));

vi.mock("@db/user_db", () => ({
  // sentinel — the route must pass this exact instance into the lib fns
  userDrizzle: { __sentinel: "userDrizzle" },
}));

vi.mock("@/api_client/supabase_storage_client", () => ({
  supabaseStorageClient: { __sentinel: "supabaseStorageClient" },
}));

const patchRequest = (body: unknown) =>
  new NextRequest("http://localhost/api/user", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

let consoleErrorSpy: MockInstance;

beforeEach(() => {
  vi.clearAllMocks();
  consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  (getCurrentUser as Mock).mockResolvedValue({ id: "user_1" });
});

afterEach(() => {
  consoleErrorSpy.mockRestore();
});

describe("PATCH /api/user", () => {
  it("returns 401 when unauthenticated", async () => {
    (getCurrentUser as Mock).mockResolvedValue(null);

    const res = await PATCH(
      patchRequest({ type: "profile", data: { name: "Jane" } })
    );

    expect(res.status).toBe(401);
    expect(updateProfile).not.toHaveBeenCalled();
  });

  it("dispatches profile updates to updateProfile with the wired db", async () => {
    const profile = {
      name: "Jane",
      email: "jane@example.com",
      jobTitle: "",
      company: "",
      bio: "",
    };
    (updateProfile as Mock).mockResolvedValue(profile);

    const res = await PATCH(
      patchRequest({ type: "profile", data: { name: "Jane" } })
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(profile);
    expect(updateProfile).toHaveBeenCalledWith({ name: "Jane" }, userDrizzle);
  });

  it("dispatches password changes to changePassword", async () => {
    (changePassword as Mock).mockResolvedValue({ success: true });
    const data = { currentPassword: "oldpass12", newPassword: "newpass12" };

    const res = await PATCH(patchRequest({ type: "password", data }));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true });
    expect(changePassword).toHaveBeenCalledWith(data);
  });

  it("dispatches product-updates to updateProductUpdatesPreference with the wired db", async () => {
    (updateProductUpdatesPreference as Mock).mockResolvedValue({
      enabled: true,
    });

    const res = await PATCH(
      patchRequest({ type: "product-updates", data: { enabled: true } })
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ enabled: true });
    expect(updateProductUpdatesPreference).toHaveBeenCalledWith(
      true,
      userDrizzle
    );
  });

  it("dispatches recording-status to changeRecordingStatus with the wired db", async () => {
    (changeRecordingStatus as Mock).mockResolvedValue(undefined);

    const res = await PATCH(patchRequest({ type: "recording-status" }));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true });
    expect(changeRecordingStatus).toHaveBeenCalledWith(userDrizzle);
  });

  it("returns 400 for an unknown type", async () => {
    const res = await PATCH(patchRequest({ type: "bogus" }));

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "No type found" });
  });

  it("propagates a ValidationError status from the lib fn", async () => {
    (updateProfile as Mock).mockRejectedValueOnce(
      new ValidationError("name is required", 400)
    );

    const res = await PATCH(
      patchRequest({ type: "profile", data: { name: "" } })
    );

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "name is required" });
  });

  it("returns 500 with the error message when the lib fn throws", async () => {
    (updateProfile as Mock).mockRejectedValueOnce(
      new Error("Failed to update profile: auth boom")
    );

    const res = await PATCH(
      patchRequest({ type: "profile", data: { name: "Jane" } })
    );

    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({
      error: "Failed to update profile: auth boom",
    });
  });
});
