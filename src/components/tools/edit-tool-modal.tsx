"use client";

import { Pencil } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/form-input";
import { Label } from "@/components/ui/label";
import {
  Modal,
  ModalClose,
  ModalContent,
  ModalDescription,
  ModalTitle,
  ModalTrigger,
} from "@/components/ui/modal";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

/**
 * Shared full-field edit form for every Phase 10 (Advanced Business Tools)
 * record — one generic modal instead of eight near-duplicate ones, the
 * same "one small consistent affordance" pattern as `DeleteButton`.
 * Create forms handle every field on the way in; this is the same field
 * set on the way back out, PATCHed instead of POSTed.
 */
export type EditField =
  | { key: string; label: string; type: "text"; placeholder?: string; maxLength?: number; required?: boolean }
  | { key: string; label: string; type: "textarea"; rows?: number; maxLength?: number; required?: boolean }
  | { key: string; label: string; type: "money"; placeholder?: string }
  | { key: string; label: string; type: "select"; options: { value: string; label: string }[] };

export function EditToolModal({
  endpoint,
  title,
  description,
  fields,
  initialValues,
}: {
  endpoint: string;
  title: string;
  description?: string;
  fields: EditField[];
  /** Raw record values keyed by field.key — money fields are read as cents and shown as dollars. */
  initialValues: Record<string, string | number | null | undefined>;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<Record<string, string>>(() => toFormValues(fields, initialValues));
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) {
      // Reset to the latest server values every time the modal (re)opens.
      setValues(toFormValues(fields, initialValues));
      setError(null);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const body: Record<string, unknown> = {};
    for (const field of fields) {
      const raw = values[field.key] ?? "";
      if (field.type === "money") {
        body[field.key] = raw.trim() ? Math.round(Number(raw) * 100) : undefined;
      } else {
        body[field.key] = raw.trim() ? raw : undefined;
      }
    }

    const res = await fetch(endpoint, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    setIsSubmitting(false);
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      setError(data?.error ?? "Something went wrong.");
      return;
    }

    setOpen(false);
    router.refresh();
  }

  return (
    <Modal open={open} onOpenChange={handleOpenChange}>
      <ModalTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-1 text-xs font-medium text-navy-400 transition-colors hover:text-navy-700"
        >
          <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
          Edit
        </button>
      </ModalTrigger>
      <ModalContent className="max-h-[85vh] overflow-y-auto">
        <ModalTitle>{title}</ModalTitle>
        {description && <ModalDescription>{description}</ModalDescription>}

        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-4">
          {error && <Alert variant="danger">{error}</Alert>}

          {fields.map((field) => (
            <div key={field.key}>
              <Label htmlFor={`edit-${field.key}`}>{field.label}</Label>
              {field.type === "textarea" ? (
                <Textarea
                  id={`edit-${field.key}`}
                  rows={field.rows ?? 3}
                  maxLength={field.maxLength}
                  required={field.required}
                  value={values[field.key] ?? ""}
                  onChange={(e) => setValues((v) => ({ ...v, [field.key]: e.target.value }))}
                />
              ) : field.type === "select" ? (
                <Select
                  value={values[field.key] ?? ""}
                  onValueChange={(v) => setValues((prev) => ({ ...prev, [field.key]: v }))}
                >
                  <SelectTrigger id={`edit-${field.key}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {field.options.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  id={`edit-${field.key}`}
                  type={field.type === "money" ? "number" : "text"}
                  min={field.type === "money" ? "0" : undefined}
                  step={field.type === "money" ? "any" : undefined}
                  maxLength={field.type === "text" ? field.maxLength : undefined}
                  required={field.type === "text" ? field.required : undefined}
                  placeholder={field.type === "text" || field.type === "money" ? field.placeholder : undefined}
                  value={values[field.key] ?? ""}
                  onChange={(e) => setValues((v) => ({ ...v, [field.key]: e.target.value }))}
                />
              )}
            </div>
          ))}

          <div className="mt-1 flex justify-end gap-2">
            <ModalClose asChild>
              <Button type="button" variant="outline" size="sm">
                Cancel
              </Button>
            </ModalClose>
            <Button type="submit" size="sm" disabled={isSubmitting}>
              {isSubmitting ? "Saving…" : "Save Changes"}
            </Button>
          </div>
        </form>
      </ModalContent>
    </Modal>
  );
}

function toFormValues(
  fields: EditField[],
  initialValues: Record<string, string | number | null | undefined>,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const field of fields) {
    const raw = initialValues[field.key];
    if (raw === null || raw === undefined) {
      out[field.key] = "";
    } else if (field.type === "money") {
      out[field.key] = (Number(raw) / 100).toString();
    } else {
      out[field.key] = String(raw);
    }
  }
  return out;
}
