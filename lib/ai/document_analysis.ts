import OpenAI from "openai";
import { openai, MODEL } from "@/lib/ai/ai_tools";
import type { DocumentRequestItemAiVerdict } from "@/types/document_requests";

export interface AnalyzeDocumentRequirementInput {
  itemName: string;
  itemDescription: string | null;
  fileBuffer: Buffer;
  mimeType: string;
  fileName: string;
}

export interface DocumentAnalysisResult {
  verdict: DocumentRequestItemAiVerdict;
  reasoning: string;
}

const MAX_REASONING_LENGTH = 500;

const VERDICT_SCHEMA = {
  type: "object",
  properties: {
    verdict: {
      type: "string",
      enum: ["meets", "does_not_meet", "needs_review"],
      description:
        "Whether the uploaded file satisfies the requirement. Use 'needs_review' only when the file is not legible enough to decide.",
    },
    reasoning: {
      type: "string",
      description:
        "One or two sentences explaining the verdict in plain language the client can act on.",
    },
  },
  required: ["verdict", "reasoning"],
  additionalProperties: false,
} as const;

function isImageMime(mimeType: string): boolean {
  return mimeType.startsWith("image/");
}

function isPdfMime(mimeType: string): boolean {
  return mimeType === "application/pdf";
}

function trimReasoning(text: string): string {
  const cleaned = text.trim();
  if (cleaned.length <= MAX_REASONING_LENGTH) return cleaned;
  return cleaned.slice(0, MAX_REASONING_LENGTH - 1).trimEnd() + "…";
}

export async function analyzeDocumentRequirement(
  input: AnalyzeDocumentRequirementInput
): Promise<DocumentAnalysisResult> {
  const { itemName, itemDescription, fileBuffer, mimeType, fileName } = input;

  if (!isImageMime(mimeType) && !isPdfMime(mimeType)) {
    return {
      verdict: "skipped",
      reasoning: "File type not supported for automatic analysis.",
    };
  }

  const requirementText = [
    `Requirement title: ${itemName}`,
    itemDescription ? `Requirement details: ${itemDescription}` : null,
    "Decide whether the attached file satisfies this requirement.",
    "Return verdict 'meets' if the file clearly satisfies it,",
    "'does_not_meet' if the file is the wrong type/contents or is missing required information,",
    "'needs_review' only if the file is unreadable or you genuinely cannot tell.",
  ]
    .filter(Boolean)
    .join("\n");

  const base64 = fileBuffer.toString("base64");
  const fileContent: OpenAI.Responses.ResponseInputContent = isImageMime(
    mimeType
  )
    ? {
        type: "input_image",
        image_url: `data:${mimeType};base64,${base64}`,
        detail: "auto",
      }
    : {
        type: "input_file",
        filename: fileName,
        file_data: `data:application/pdf;base64,${base64}`,
      };

  const inputItems: OpenAI.Responses.ResponseInputItem[] = [
    {
      role: "user",
      content: [{ type: "input_text", text: requirementText }, fileContent],
    },
  ];

  try {
    const response = await openai.responses.create({
      model: MODEL,
      input: inputItems,
      text: {
        format: {
          type: "json_schema",
          name: "document_verdict",
          schema: VERDICT_SCHEMA,
          strict: true,
        },
      },
    });

    const raw = response.output_text?.trim();
    if (!raw) {
      return {
        verdict: "error",
        reasoning: "Automated analysis returned no result.",
      };
    }

    const parsed = JSON.parse(raw) as {
      verdict: "meets" | "does_not_meet" | "needs_review";
      reasoning: string;
    };

    return {
      verdict: parsed.verdict,
      reasoning: trimReasoning(parsed.reasoning),
    };
  } catch (err) {
    console.error("[document_analysis] analysis failed", err);
    return {
      verdict: "error",
      reasoning: "Automated analysis could not be completed.",
    };
  }
}
