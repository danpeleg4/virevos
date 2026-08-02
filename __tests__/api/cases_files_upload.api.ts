import { POST } from "@/app/api/cases/[id]/files/route";
import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/supabase/auth";
import { addFileMetadata } from "@/lib/workspace/cases";
import { casesDrizzle } from "@db/classes/cases_db";
import { planLimitsDrizzle } from "@db/classes/plan_limits_db";
import { billingDrizzle } from "@db/classes/billing_db";
import { supabaseStorageClient } from "@/api_client/supabase_storage_client";

vi.mock("@/lib/supabase/auth", () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock("@/lib/workspace/cases", () => ({
  addFileMetadata: vi.fn(),
}));

vi.mock("@db/classes/cases_db", () => ({
  casesDrizzle: { __sentinel: "casesDrizzle" },
}));

vi.mock("@db/classes/plan_limits_db", () => ({
  planLimitsDrizzle: { __sentinel: "planLimitsDrizzle" },
}));

vi.mock("@db/classes/billing_db", () => ({
  billingDrizzle: { __sentinel: "billingDrizzle" },
}));

vi.mock("@/api_client/supabase_storage_client", () => ({
  supabaseStorageClient: { __sentinel: "supabaseStorageClient" },
}));

function makeCtx(id: string) {
  return { params: Promise.resolve({ id }) };
}

const postRequest = () => {
  const formData = new FormData();
  formData.append(
    "file",
    new File([new Uint8Array(16)], "contract.pdf", { type: "application/pdf" })
  );
  return new NextRequest("http://localhost/api/cases/5/files", {
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

describe("POST /api/cases/[id]/files", () => {
  it("returns 401 when unauthenticated", async () => {
    (getCurrentUser as Mock).mockResolvedValue(null);

    const res = await POST(postRequest(), makeCtx("5"));

    expect(res.status).toBe(401);
    expect(addFileMetadata).not.toHaveBeenCalled();
  });

  it("returns 400 for an invalid case id", async () => {
    const res = await POST(postRequest(), makeCtx("abc"));

    expect(res.status).toBe(400);
    expect(addFileMetadata).not.toHaveBeenCalled();
  });

  it("uploads the file through the lib fn with the wired deps", async () => {
    (addFileMetadata as Mock).mockResolvedValueOnce({
      path: "projects/user_1/contract.pdf",
      name: "contract.pdf",
      size: 16,
    });

    const res = await POST(postRequest(), makeCtx("5"));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      path: "projects/user_1/contract.pdf",
      name: "contract.pdf",
      size: 16,
    });
    expect(addFileMetadata).toHaveBeenCalledWith(
      { caseId: 5 },
      expect.any(FormData),
      casesDrizzle,
      supabaseStorageClient,
      planLimitsDrizzle,
      billingDrizzle
    );
  });

  it("surfaces storage-limit errors with their message", async () => {
    (addFileMetadata as Mock).mockRejectedValueOnce(
      new Error("Storage limit reached. The starter plan includes 1GB.")
    );

    const res = await POST(postRequest(), makeCtx("5"));

    expect(res.status).toBe(500);
    expect((await res.json()).error).toContain("Storage limit reached");
  });
});
