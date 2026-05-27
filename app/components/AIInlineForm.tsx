"use client";

import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import type { AIFormRequest } from "@/types/ai";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { emptyFormValues, missingRequiredFields } from "@/lib/util/ai_form";

interface InlineFormProps {
  form: AIFormRequest;
  submitted?: boolean;
  disabled?: boolean;
  onSubmit: (values: Record<string, string>) => void;
}

export function InlineForm({
  form,
  submitted = false,
  disabled = false,
  onSubmit,
}: InlineFormProps) {
  const [values, setValues] = useState<Record<string, string>>(() =>
    emptyFormValues(form.fields)
  );
  const [error, setError] = useState<string | null>(null);

  const locked = submitted || disabled;

  const setField = (name: string, value: string) => {
    setValues((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = () => {
    const missing = missingRequiredFields(form.fields, values);
    if (missing.length > 0) {
      setError(`Please fill in: ${missing.join(", ")}`);
      return;
    }
    setError(null);
    onSubmit(values);
  };

  return (
    <div className="mt-3 space-y-3 rounded-lg border border-border bg-background p-3">
      {form.title && (
        <p className="text-sm font-medium text-foreground">{form.title}</p>
      )}

      {form.fields.map((field) => {
        const fieldId = `aiform-${form.callId}-${field.name}`;
        return (
          <div key={field.name} className="space-y-1">
            <label
              htmlFor={fieldId}
              className="text-xs font-medium text-muted-foreground"
            >
              {field.label}
              {field.required && <span className="text-red-500"> *</span>}
            </label>

            {field.type === "textarea" ? (
              <Textarea
                id={fieldId}
                value={values[field.name] ?? ""}
                placeholder={field.placeholder ?? ""}
                disabled={locked}
                onChange={(e) => setField(field.name, e.target.value)}
                className="min-h-[64px] text-sm"
              />
            ) : field.type === "select" ? (
              <Select
                value={values[field.name] || undefined}
                onValueChange={(v) => setField(field.name, v)}
                disabled={locked}
              >
                <SelectTrigger id={fieldId} className="h-9 text-sm">
                  <SelectValue placeholder={field.placeholder ?? "Select…"} />
                </SelectTrigger>
                <SelectContent>
                  {field.options.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                id={fieldId}
                type={field.type === "date" ? "date" : "text"}
                value={values[field.name] ?? ""}
                placeholder={field.placeholder ?? ""}
                disabled={locked}
                onChange={(e) => setField(field.name, e.target.value)}
                className="h-9 text-sm"
              />
            )}
          </div>
        );
      })}

      {error && <p className="text-xs text-red-500">{error}</p>}

      {submitted ? (
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
          Submitted
        </p>
      ) : (
        <Button
          size="sm"
          className="w-full bg-blue-600 hover:bg-blue-700"
          onClick={handleSubmit}
          disabled={disabled}
        >
          Submit
        </Button>
      )}
    </div>
  );
}
