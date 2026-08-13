"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";

interface RegisterButtonProps {
  sessionId: string;
  hasRoom: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function RegisterButton({ sessionId, hasRoom, size = "md", className }: RegisterButtonProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setIsSubmitting(true);
    setError(null);
    const res = await fetch(`/api/sessions/${sessionId}/register`, { method: "POST" });
    setIsSubmitting(false);
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      setError(data?.error ?? "Something went wrong. Please try again.");
      return;
    }
    router.refresh();
  }

  return (
    <div className={className}>
      <Button
        size={size}
        variant={hasRoom ? "primary" : "outline"}
        onClick={handleClick}
        disabled={isSubmitting}
        className="w-full"
      >
        {isSubmitting ? "Saving…" : hasRoom ? "Reserve My Seat" : "Join Waitlist"}
      </Button>
      {error && <p className="mt-1.5 text-xs text-danger">{error}</p>}
    </div>
  );
}
