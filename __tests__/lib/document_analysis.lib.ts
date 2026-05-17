import { analyzeDocumentRequirement } from "@/lib/ai/document_analysis";

// eslint-disable-next-line no-var
var mockCreate: Mock;
vi.mock("@/lib/ai/ai_tools", () => {
  mockCreate = vi.fn();
  return {
    openai: { responses: { create: mockCreate } },
    MODEL: "gpt-test",
  };
});

let consoleErrorSpy: MockInstance;

beforeEach(() => {
  vi.clearAllMocks();
  consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  consoleErrorSpy.mockRestore();
});

const baseInput = {
  itemName: "Tax return",
  itemDescription: "Most recent year",
  fileName: "doc.pdf",
};

function withVerdict(
  verdict: "meets" | "does_not_meet" | "needs_review",
  reasoning = "ok"
) {
  mockCreate.mockResolvedValueOnce({
    output_text: JSON.stringify({ verdict, reasoning }),
  });
}

describe("analyzeDocumentRequirement", () => {
  it("returns 'skipped' for unsupported mime types without calling OpenAI", async () => {
    const res = await analyzeDocumentRequirement({
      ...baseInput,
      fileBuffer: Buffer.from("plain text"),
      mimeType: "text/plain",
    });

    expect(res.verdict).toBe("skipped");
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("sends an input_image content part for image uploads", async () => {
    withVerdict("meets", "matches the requirement");

    const res = await analyzeDocumentRequirement({
      ...baseInput,
      fileBuffer: Buffer.from([1, 2, 3]),
      mimeType: "image/png",
      fileName: "scan.png",
    });

    expect(res).toEqual({
      verdict: "meets",
      reasoning: "matches the requirement",
    });
    const call = mockCreate.mock.calls[0][0];
    const content = call.input[0].content;
    expect(content[0].type).toBe("input_text");
    expect(content[1].type).toBe("input_image");
    expect(content[1].image_url).toMatch(/^data:image\/png;base64,/);
    expect(call.text.format.type).toBe("json_schema");
    expect(call.text.format.strict).toBe(true);
  });

  it("sends an input_file content part for PDF uploads", async () => {
    withVerdict("does_not_meet", "wrong document");

    const res = await analyzeDocumentRequirement({
      ...baseInput,
      fileBuffer: Buffer.from([1, 2, 3]),
      mimeType: "application/pdf",
    });

    expect(res.verdict).toBe("does_not_meet");
    const content = mockCreate.mock.calls[0][0].input[0].content;
    expect(content[1].type).toBe("input_file");
    expect(content[1].filename).toBe("doc.pdf");
    expect(content[1].file_data).toMatch(/^data:application\/pdf;base64,/);
  });

  it("returns 'error' verdict and does not throw when OpenAI fails", async () => {
    mockCreate.mockRejectedValueOnce(new Error("network blew up"));

    const res = await analyzeDocumentRequirement({
      ...baseInput,
      fileBuffer: Buffer.from([1]),
      mimeType: "image/jpeg",
    });

    expect(res.verdict).toBe("error");
    expect(res.reasoning).toMatch(/could not be completed/i);
  });

  it("returns 'error' when output_text is empty", async () => {
    mockCreate.mockResolvedValueOnce({ output_text: "" });

    const res = await analyzeDocumentRequirement({
      ...baseInput,
      fileBuffer: Buffer.from([1]),
      mimeType: "image/jpeg",
    });

    expect(res.verdict).toBe("error");
  });

  it("trims very long reasoning to the cap", async () => {
    const longReason = "x".repeat(900);
    withVerdict("meets", longReason);

    const res = await analyzeDocumentRequirement({
      ...baseInput,
      fileBuffer: Buffer.from([1]),
      mimeType: "image/jpeg",
    });

    expect(res.verdict).toBe("meets");
    expect(res.reasoning.length).toBeLessThanOrEqual(500);
  });
});
