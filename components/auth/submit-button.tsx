"use client";

import { useFormStatus } from "react-dom";
import { cn } from "@/lib/utils";

export function SubmitButton({
  children,
  pendingLabel,
  className,
  disabled = false,
}: {
  children: React.ReactNode;
  pendingLabel: string;
  className?: string;
  /** Extra disable condition beyond the form's own pending state — e.g. an incomplete selection elsewhere on the form. */
  disabled?: boolean;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending || disabled}
      className={cn(
        "w-full bg-ink px-4 py-2.5 text-sm font-medium text-cream transition-opacity hover:opacity-90 disabled:opacity-60",
        className,
      )}
    >
      {pending ? pendingLabel : children}
    </button>
  );
}
