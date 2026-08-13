"use client";

import { BookOpen } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { DeleteButton } from "@/components/tools/delete-button";
import { Button } from "@/components/ui/button";

export function OfferControls({ offerId }: { offerId: string }) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);

  async function handleSaveToBlueprint() {
    setIsSaving(true);
    await fetch(`/api/tools/offers/${offerId}/save-to-blueprint`, { method: "POST" });
    setIsSaving(false);
    router.refresh();
  }

  return (
    <div className="flex shrink-0 flex-col items-end gap-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleSaveToBlueprint}
        disabled={isSaving}
      >
        <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
        {isSaving ? "Saving…" : "Save to My Blueprint"}
      </Button>
      <DeleteButton endpoint={`/api/tools/offers/${offerId}`} />
    </div>
  );
}
