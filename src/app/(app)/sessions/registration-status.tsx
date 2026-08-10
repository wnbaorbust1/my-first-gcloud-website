"use client";

import { CheckCircle2, Clock } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface RegistrationStatusProps {
  registrationId: string;
  status: "REGISTERED" | "WAITLISTED";
  waitlistPosition: number | null;
}

/** Shown instead of the Register button once the member has a registration. */
export function RegistrationStatus({
  registrationId,
  status,
  waitlistPosition,
}: RegistrationStatusProps) {
  const router = useRouter();
  const [isCancelling, setIsCancelling] = useState(false);

  async function handleCancel() {
    if (!confirm("Cancel this registration?")) return;
    setIsCancelling(true);
    await fetch(`/api/sessions/registrations/${registrationId}/cancel`, { method: "POST" });
    setIsCancelling(false);
    router.refresh();
  }

  return (
    <div className="flex flex-col items-stretch gap-1.5">
      <span className="inline-flex items-center justify-center gap-1.5 rounded-full bg-success-bg px-3 py-2 text-sm font-medium text-success">
        {status === "REGISTERED" ? (
          <>
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            You&apos;re Registered
          </>
        ) : (
          <>
            <Clock className="h-4 w-4" aria-hidden="true" />
            Waitlisted{waitlistPosition ? ` (#${waitlistPosition})` : ""}
          </>
        )}
      </span>
      <button
        type="button"
        onClick={handleCancel}
        disabled={isCancelling}
        className="text-xs font-medium text-navy-400 underline hover:text-navy-700"
      >
        {isCancelling ? "Cancelling…" : "Cancel"}
      </button>
    </div>
  );
}
