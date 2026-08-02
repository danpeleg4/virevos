import React from "react";
import { http, HttpResponse } from "msw";
import { worker } from "../../../msw/worker";
import { renderWithQueryClient } from "../../../_helpers/render";
import { useDocumentItemUpload } from "@/app/portal/[token]/_lib/hooks";
import { toast } from "@/app/components/ui/toast-store";

const TOKEN = "test-token-abc";

function UploadHarness() {
  const upload = useDocumentItemUpload(TOKEN);
  return (
    <button
      onClick={() =>
        upload.mutate({ itemId: 1, file: new File(["x"], "doc.pdf") })
      }
    >
      Upload
    </button>
  );
}

describe("useDocumentItemUpload — verdict-aware toast", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("shows a success toast with the AI reasoning when the document meets the requirement", async () => {
    worker.use(
      http.post("/api/portal/:token/document-requests/:itemId/upload", () =>
        HttpResponse.json({
          analysis: { verdict: "meets", reasoning: "Clear and valid ID." },
        })
      )
    );
    const successSpy = vi.spyOn(toast, "success");

    const screen = await renderWithQueryClient(<UploadHarness />);
    await screen.getByRole("button", { name: "Upload" }).click();

    await vi.waitFor(() => {
      expect(successSpy).toHaveBeenCalledWith({
        title: "Looks good",
        description: "Clear and valid ID.",
      });
    });
  });

  it("shows a warning toast with the AI reasoning when the document does not meet the requirement", async () => {
    worker.use(
      http.post("/api/portal/:token/document-requests/:itemId/upload", () =>
        HttpResponse.json({
          analysis: {
            verdict: "does_not_meet",
            reasoning: "Expired document.",
          },
        })
      )
    );
    const warningSpy = vi.spyOn(toast, "warning");

    const screen = await renderWithQueryClient(<UploadHarness />);
    await screen.getByRole("button", { name: "Upload" }).click();

    await vi.waitFor(() => {
      expect(warningSpy).toHaveBeenCalledWith({
        title: "Does not meet requirement",
        description: "Expired document.",
      });
    });
  });

  it("falls back to a generic success toast when no AI analysis is returned", async () => {
    worker.use(
      http.post("/api/portal/:token/document-requests/:itemId/upload", () =>
        HttpResponse.json({})
      )
    );
    const successSpy = vi.spyOn(toast, "success");

    const screen = await renderWithQueryClient(<UploadHarness />);
    await screen.getByRole("button", { name: "Upload" }).click();

    await vi.waitFor(() => {
      expect(successSpy).toHaveBeenCalledWith({
        title: "Uploaded",
        description: "File uploaded successfully",
      });
    });
  });

  it("shows only an error toast — not a false success toast — when the upload request fails", async () => {
    worker.use(
      http.post("/api/portal/:token/document-requests/:itemId/upload", () =>
        HttpResponse.json({ error: "too large" }, { status: 500 })
      )
    );
    const successSpy = vi.spyOn(toast, "success");
    const errorSpy = vi.spyOn(toast, "error");

    const screen = await renderWithQueryClient(<UploadHarness />);
    await screen.getByRole("button", { name: "Upload" }).click();

    await vi.waitFor(() => {
      expect(errorSpy).toHaveBeenCalledWith({
        title: "Failed",
        description: "File upload failed",
      });
    });
    expect(successSpy).not.toHaveBeenCalled();
  });
});
