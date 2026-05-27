import {
  formatFormSubmission,
  emptyFormValues,
  missingRequiredFields,
} from "@/lib/util/ai_form";
import type { AIFormField } from "@/types/ai";

const fields: AIFormField[] = [
  {
    name: "caseName",
    label: "Case name",
    type: "text",
    required: true,
    options: [],
    placeholder: null,
  },
  {
    name: "priority",
    label: "Priority",
    type: "select",
    required: false,
    options: ["Low", "Normal", "High"],
    placeholder: null,
  },
  {
    name: "notes",
    label: "Notes",
    type: "textarea",
    required: false,
    options: [],
    placeholder: null,
  },
];

describe("formatFormSubmission", () => {
  it("includes only filled fields, labelled, one per line", () => {
    const out = formatFormSubmission(fields, {
      caseName: "Smith H-1B",
      priority: "High",
      notes: "",
    });
    expect(out).toBe("Case name: Smith H-1B\nPriority: High");
  });

  it("trims whitespace and drops blank values", () => {
    const out = formatFormSubmission(fields, {
      caseName: "  Doe OPT  ",
      priority: "   ",
      notes: "urgent",
    });
    expect(out).toBe("Case name: Doe OPT\nNotes: urgent");
  });

  it("returns a placeholder when nothing was filled in", () => {
    expect(formatFormSubmission(fields, {})).toBe("(no details provided)");
  });
});

describe("emptyFormValues", () => {
  it("creates an empty string for every field", () => {
    expect(emptyFormValues(fields)).toEqual({
      caseName: "",
      priority: "",
      notes: "",
    });
  });
});

describe("missingRequiredFields", () => {
  it("returns labels of required fields left blank", () => {
    expect(
      missingRequiredFields(fields, { caseName: "", priority: "High" })
    ).toEqual(["Case name"]);
  });

  it("treats whitespace-only required values as missing", () => {
    expect(missingRequiredFields(fields, { caseName: "   " })).toEqual([
      "Case name",
    ]);
  });

  it("returns nothing when all required fields are filled", () => {
    expect(missingRequiredFields(fields, { caseName: "X" })).toEqual([]);
  });
});
