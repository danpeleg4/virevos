import type { AIFormField } from "@/types/ai";

/**
 * Turns a submitted form into a readable multi-line summary that is shown as
 * the user's chat message (e.g. "Case name: Smith H-1B\nPriority: High").
 * Only fields the user actually filled in are included.
 */
export function formatFormSubmission(
  fields: AIFormField[],
  values: Record<string, string>
): string {
  const lines = fields
    .map((field) => {
      const value = values[field.name]?.trim();
      return value ? `${field.label}: ${value}` : null;
    })
    .filter((line): line is string => line !== null);

  return lines.length > 0 ? lines.join("\n") : "(no details provided)";
}

/** Builds the initial empty value map for a form's fields. */
export function emptyFormValues(fields: AIFormField[]): Record<string, string> {
  return Object.fromEntries(fields.map((field) => [field.name, ""]));
}

/** Returns the labels of required fields the user left blank. */
export function missingRequiredFields(
  fields: AIFormField[],
  values: Record<string, string>
): string[] {
  return fields
    .filter((field) => field.required && !values[field.name]?.trim())
    .map((field) => field.label);
}
