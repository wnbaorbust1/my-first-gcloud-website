"use client";

import { Heart, Sparkles, Star } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

export interface AffirmationCardProps {
  businessId: string;
  affirmationId: string;
  text: string;
  spoken: boolean;
  reflected: boolean;
  connected: boolean;
  favorited: boolean;
  /** Today's Next Best Action, if there is one — the default target for "Connect it to today's action." */
  nextActionTaskId: string | null;
  nextActionTitle: string | null;
}

/**
 * TODAY'S AFFIRMATION (spec §7, Phase B). ADHD-friendly per
 * BLUEPRINT_MASTER_SPEC.md's ratified requirement: one card, one
 * sentence, a few obvious buttons — no wall of text, nothing to
 * remember to come back to.
 */
export function AffirmationCard(props: AffirmationCardProps) {
  const router = useRouter();
  const [spoken, setSpoken] = useState(props.spoken);
  const [reflected, setReflected] = useState(props.reflected);
  const [connected, setConnected] = useState(props.connected);
  const [favorited, setFavorited] = useState(props.favorited);
  const [showReflection, setShowReflection] = useState(false);
  const [reflection, setReflection] = useState("");
  const [busy, setBusy] = useState(false);

  async function post(url: string, body: Record<string, unknown>) {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ businessId: props.businessId, affirmationId: props.affirmationId, ...body }),
    });
    return res.ok;
  }

  async function handleSpoken() {
    if (spoken || busy) return;
    setBusy(true);
    setSpoken(true); // optimistic — this is a same-day idempotent action, safe to assume success
    await post("/api/affirmations/spoken", {});
    setBusy(false);
    router.refresh();
  }

  async function handleReflectionSubmit() {
    if (!reflection.trim() || busy) return;
    setBusy(true);
    const ok = await post("/api/affirmations/reflection", { reflection });
    setBusy(false);
    if (ok) {
      setReflected(true);
      setShowReflection(false);
      setReflection("");
      router.refresh();
    }
  }

  async function handleConnect() {
    if (connected || busy || !props.nextActionTaskId) return;
    setBusy(true);
    setConnected(true);
    await post("/api/affirmations/connect", { taskId: props.nextActionTaskId });
    setBusy(false);
    router.refresh();
  }

  async function handleFavorite() {
    if (busy) return;
    setBusy(true);
    const next = !favorited;
    setFavorited(next);
    await post("/api/affirmations/favorite", {});
    setBusy(false);
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Today&apos;s Affirmation</CardTitle>
          <button
            type="button"
            onClick={handleFavorite}
            aria-label={favorited ? "Remove favorite" : "Save as favorite"}
            className="text-navy-300 hover:text-gold-500"
          >
            <Star className={favorited ? "h-4 w-4 fill-gold-500 text-gold-500" : "h-4 w-4"} aria-hidden="true" />
          </button>
        </div>
      </CardHeader>

      <p className="font-display text-lg text-navy-900">&ldquo;{props.text}&rdquo;</p>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button size="sm" variant={spoken ? "outline" : "primary"} disabled={spoken || busy} onClick={handleSpoken}>
          <Heart className="h-4 w-4" aria-hidden="true" />
          {spoken ? "Spoken today" : "I Spoke This Today"}
        </Button>

        {!reflected && !showReflection && (
          <Button size="sm" variant="outline" onClick={() => setShowReflection(true)}>
            Complete Reflection
          </Button>
        )}
        {reflected && (
          <span className="inline-flex items-center gap-1 rounded-full bg-gold-50 px-3 py-1.5 text-xs font-medium text-gold-700">
            Reflection saved
          </span>
        )}

        {props.nextActionTaskId && (
          <Button size="sm" variant="outline" disabled={connected || busy} onClick={handleConnect}>
            <Sparkles className="h-4 w-4" aria-hidden="true" />
            {connected ? `Connected to "${props.nextActionTitle}"` : "Connect it to today's action"}
          </Button>
        )}
      </div>

      {showReflection && (
        <div className="mt-3 flex flex-col gap-2">
          <p className="text-xs text-foreground-muted">One line is enough — what does this mean for you today?</p>
          <Textarea
            value={reflection}
            onChange={(e) => setReflection(e.target.value)}
            rows={2}
            autoFocus
          />
          <div className="flex gap-2">
            <Button size="sm" disabled={!reflection.trim() || busy} onClick={handleReflectionSubmit}>
              Save
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setShowReflection(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
