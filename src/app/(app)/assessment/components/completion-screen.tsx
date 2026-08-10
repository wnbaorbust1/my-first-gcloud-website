import { Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";

interface CompletionScreenProps {
  isSubmitting: boolean;
  error: string | null;
  onViewResults: () => void;
}

export function CompletionScreen({ isSubmitting, error, onViewResults }: CompletionScreenProps) {
  return (
    <div className="mx-auto max-w-lg text-center">
      <span className="flex justify-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-gold-50 text-gold-600">
          <Sparkles className="h-8 w-8" aria-hidden="true" />
        </span>
      </span>
      <h2 className="mt-5 font-display text-3xl font-semibold text-navy-900">
        Your Blueprint Is Ready
      </h2>
      <p className="mt-2 text-foreground-muted">
        We&apos;re scoring your Passion, Power, and Legacy stages and matching you to your
        recommended Blueprint Session.
      </p>

      {error && (
        <Alert variant="danger" className="mt-6 text-left">
          {error}
        </Alert>
      )}

      <Button size="lg" className="mt-8" onClick={onViewResults} disabled={isSubmitting}>
        {isSubmitting ? "Calculating your results…" : "View My Results"}
      </Button>
    </div>
  );
}
