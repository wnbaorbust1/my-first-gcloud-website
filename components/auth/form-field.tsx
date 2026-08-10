import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function FormField({
  label,
  name,
  error,
  className,
  ...inputProps
}: {
  label: string;
  name: string;
  error?: string;
} & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label htmlFor={name} className="block text-sm font-medium text-ink">
        {label}
      </label>
      <input
        id={name}
        name={name}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${name}-error` : undefined}
        className="w-full border border-slate/40 bg-cream px-3 py-2 text-sm text-ink placeholder:text-slate/60"
        {...inputProps}
      />
      {error && (
        <p id={`${name}-error`} role="alert" className="text-xs text-rose-gold">
          {error}
        </p>
      )}
    </div>
  );
}
