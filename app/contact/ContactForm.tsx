"use client";

import { useState } from "react";
import axios from "axios";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Textarea } from "@/app/components/ui/textarea";
import { useSubmitDemoRequest, type DemoRequestFormValues } from "./_lib/hooks";

const EMPTY_FORM: DemoRequestFormValues = {
  name: "",
  email: "",
  company: "",
  message: "",
  honeypot: "",
};

function getErrorMessage(err: unknown): string {
  if (
    axios.isAxiosError(err) &&
    typeof err.response?.data?.error === "string"
  ) {
    return err.response.data.error;
  }
  return "Something went wrong. Please try again.";
}

export function ContactForm() {
  const [values, setValues] = useState<DemoRequestFormValues>(EMPTY_FORM);

  const mutation = useSubmitDemoRequest();

  if (mutation.isSuccess) {
    return (
      <div className="rounded-xl border border-green-200 bg-green-50 p-8 text-center">
        <h2 className="text-xl font-medium text-green-800 mb-2">
          Thanks for reaching out!
        </h2>
        <p className="text-green-700">
          We&apos;ve received your request and will get back to you shortly.
        </p>
      </div>
    );
  }

  return (
    <form
      className="space-y-6"
      onSubmit={(e) => {
        e.preventDefault();
        mutation.mutate(values);
      }}
    >
      {/* Honeypot field — hidden from real users, bots tend to fill every input. */}
      <div style={{ display: "none" }} aria-hidden="true">
        <label htmlFor="company-website">Company website</label>
        <input
          id="company-website"
          name="company-website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={values.honeypot}
          onChange={(e) =>
            setValues((v) => ({ ...v, honeypot: e.target.value }))
          }
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          required
          maxLength={200}
          value={values.name}
          onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          required
          maxLength={320}
          value={values.email}
          onChange={(e) => setValues((v) => ({ ...v, email: e.target.value }))}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="company">Company (optional)</Label>
        <Input
          id="company"
          maxLength={200}
          value={values.company}
          onChange={(e) =>
            setValues((v) => ({ ...v, company: e.target.value }))
          }
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="message">Message / preferred time</Label>
        <Textarea
          id="message"
          rows={5}
          maxLength={5000}
          value={values.message}
          onChange={(e) =>
            setValues((v) => ({ ...v, message: e.target.value }))
          }
        />
      </div>

      {mutation.isError && (
        <p className="text-sm text-red-600">
          {getErrorMessage(mutation.error)}
        </p>
      )}

      <Button type="submit" size="lg" disabled={mutation.isPending}>
        {mutation.isPending ? "Sending…" : "Schedule a demo"}
      </Button>
    </form>
  );
}
