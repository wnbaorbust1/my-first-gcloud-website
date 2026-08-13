import type { InputHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export function Input({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-11 w-full rounded-xl border border-navy-200 bg-surface px-4 text-sm text-navy-800 placeholder:text-navy-300 transition-colors",
        "focus:border-navy-400 focus:outline-none focus:ring-2 focus:ring-gold-300",
        "disabled:cursor-not-allowed disabled:bg-navy-50 disabled:text-navy-300",
        "aria-[invalid=true]:border-danger aria-[invalid=true]:ring-danger/20",
        className,
      )}
      {...props}
    />
  );
}
