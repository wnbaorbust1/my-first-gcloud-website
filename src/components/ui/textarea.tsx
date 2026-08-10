import type { TextareaHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export function Textarea({
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "min-h-28 w-full rounded-xl border border-navy-200 bg-surface px-4 py-3 text-sm text-navy-800 placeholder:text-navy-300 transition-colors",
        "focus:border-navy-400 focus:outline-none focus:ring-2 focus:ring-gold-300",
        "disabled:cursor-not-allowed disabled:bg-navy-50 disabled:text-navy-300",
        className,
      )}
      {...props}
    />
  );
}
