import { POST } from "@/app/api/user/avatar/route";
import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/supabase/auth";
import { uploadAvatar } from "@/lib/user";
import { userDrizzle } from "@db/classes/user_db";
import { supabaseStorageClient } from "@/api_client/supabase_storage_client";
import { ValidationError } from "@/lib/util/validation";

vi.mock("@/lib/supabase/auth", () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock("@/lib/user", () => ({
  uploadAvatar: vi.fn(),
}));

vi.mock("@db/classes/user_db", () => ({
  // sentinel — the route must pass this exact instance into the lib fn
  userDrizzle: { __sentinel: "userDrizzle" },
}));

vi.mock("@/api_client/supabase_storage_client", () => ({
  // sentinel — the route must pass this exact storage client
  supabaseStorageClient: { __sentinel: "supabaseStorageClient" },
}));

const postRequest = () => {
  const formData = new FormData();
  formData.append(
    "file",
    new File([new Uint8Array(16)], "avatar.png", { type: "image/png" })
  );
  return new NextRequest("http://localhost/api/user/avatar", {
    method: "POST",
    body: formData,
  });
};

let consoleErrorSpy: MockInstance;

beforeEach(() => {
  vi.clearAllMocks();
  consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  (getCurrentUser as Mock).mockResolvedValue({ id: "user_1" });
});

afterEach(() => {
  consoleErrorSpy.mockRestore();
});

describe("POST /api/user/avatar", () => {
  it("returns 401 when unauthenticated", async () => {
    (getCurrentUser as Mock).mockResolvedValue(null);

    const res = await POST(postRequest());

    expect(res.status).toBe(401);
    expect(uploadAvatar).not.toHaveBeenCalled();
  });

  it("uploads the avatar through the lib fn with the wired deps", async () => {
    (uploadAvatar as Mock).mockResolvedValue({ url: "https://cdn/a.png" });

    const res = await POST(postRequest());

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ url: "https://cdn/a.png" });
    expect(uploadAvatar).toHaveBeenCalledWith(
      expect.any(FormData),
      userDrizzle,
      supabaseStorageClient
    );
    const formData = (uploadAvatar as Mock).mock.calls[0][0] as FormData;
    expect(formData.get("file")).toBeInstanceOf(File);
  });

  it("propagates a ValidationError status from the lib fn", async () => {
    (uploadAvatar as Mock).mockRejectedValueOnce(
      new ValidationError("Image must be 2MB or smaller", 400)
    );

    const res = await POST(postRequest());

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({
      error: "Image must be 2MB or smaller",
    });
  });

  it("returns 500 with the error message when the upload fails", async () => {
    (uploadAvatar as Mock).mockRejectedValueOnce(
      new Error("Storage upload failed: boom")
    );

    const res = await POST(postRequest());

    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({
      error: "Storage upload failed: boom",
    });
  });
});
