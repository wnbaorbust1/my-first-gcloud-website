"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/form-input";
import { Label } from "@/components/ui/label";

/**
 * `window.location.origin` doesn't exist during the server render pass,
 * so reading it directly (`typeof window !== "undefined" ? ... : ""`)
 * renders "" on the server and the real origin on the client — a
 * hydration mismatch React has to discard and re-render around.
 * useSyncExternalStore is the built-in, hydration-safe way to read a
 * browser-only value: it uses the given server snapshot during SSR/
 * hydration and only switches to the client snapshot after mount, with
 * no mismatch warning. The subscribe function is a no-op since the
 * origin never changes during the page's life.
 */
function useOrigin(): string {
  return useSyncExternalStore(
    () => () => {},
    () => window.location.origin,
    () => "",
  );
}

interface TokenListItem {
  id: string;
  label: string;
  createdAt: string;
  lastUsedAt: string | null;
}

const SUGGESTED_INSTRUCTIONS = `You help this member turn their real Blueprint business data into a hand-drawn, vision-board-style poster image (numbered panels, a script headline with their name, a purple/gold palette, crown and heart accents, checklist-style callouts).

Call getVisionBoard to fetch their real data before generating anything. Use only what it returns — if a field is null or empty, leave that panel off the image or show it blank; never invent a name, goal, score, or affirmation that isn't in the response. Regenerate the image whenever they ask for a new version, always pulling fresh data first.`;

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
    >
      {copied ? "Copied!" : label}
    </Button>
  );
}

export function ConnectChatGptCard() {
  const [tokens, setTokens] = useState<TokenListItem[] | null>(null);
  const [label, setLabel] = useState("");
  const [newSecret, setNewSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const origin = useOrigin();

  useEffect(() => {
    void refresh();
  }, []);

  async function refresh() {
    const res = await fetch("/api/settings/tokens");
    if (res.ok) {
      const data = (await res.json()) as { tokens: TokenListItem[] };
      setTokens(data.tokens);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    const res = await fetch("/api/settings/tokens", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label: label || "ChatGPT" }),
    });
    setIsSubmitting(false);
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      setError(data?.error ?? "Something went wrong.");
      return;
    }
    const data = (await res.json()) as { token: { secret: string } };
    setNewSecret(data.token.secret);
    setLabel("");
    void refresh();
  }

  async function handleRevoke(id: string) {
    await fetch(`/api/settings/tokens/${id}`, { method: "DELETE" });
    void refresh();
  }

  const schemaUrl = origin ? `${origin}/api/gpt/openapi.json` : "";

  return (
    <div className="flex flex-col gap-6 text-sm">
      <p className="text-foreground-muted">
        Connect a ChatGPT Custom GPT (requires ChatGPT Plus or Team) to pull your real Blueprint
        data — your scores, goals, accountability partner, vision board profile — and generate a
        personalized vision-board image, instead of copying it over by hand.
      </p>

      <div>
        <p className="font-semibold text-navy-900">1. Generate a token</p>
        <p className="mt-1 text-foreground-muted">
          This is what your Custom GPT uses to call Blueprint as you. Treat it like a password —
          anyone with it can read your Blueprint data.
        </p>

        {newSecret && (
          <Alert variant="success" className="mt-3">
            <div className="flex flex-col gap-2">
              <p className="font-medium">
                Copy this now — it won&apos;t be shown again: <code className="rounded bg-navy-900/5 px-1.5 py-0.5 font-mono text-xs">{newSecret}</code>
              </p>
              <CopyButton text={newSecret} label="Copy token" />
            </div>
          </Alert>
        )}
        {error && (
          <Alert variant="danger" className="mt-3">
            {error}
          </Alert>
        )}

        <form onSubmit={handleCreate} className="mt-3 flex flex-wrap items-end gap-3">
          <div>
            <Label htmlFor="token-label">Label</Label>
            <Input
              id="token-label"
              placeholder="ChatGPT"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
            />
          </div>
          <Button type="submit" size="sm" disabled={isSubmitting}>
            {isSubmitting ? "Generating…" : "Generate Token"}
          </Button>
        </form>

        {tokens && tokens.length > 0 && (
          <ul className="mt-4 flex flex-col gap-2">
            {tokens.map((t) => (
              <li
                key={t.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-navy-100 px-3 py-2"
              >
                <span>
                  <span className="font-medium text-navy-900">{t.label}</span>{" "}
                  <span className="text-foreground-muted">
                    · created {new Date(t.createdAt).toLocaleDateString()}
                    {t.lastUsedAt && ` · last used ${new Date(t.lastUsedAt).toLocaleDateString()}`}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => handleRevoke(t.id)}
                  className="text-xs font-medium text-danger hover:underline"
                >
                  Revoke
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <p className="font-semibold text-navy-900">2. Create the Custom GPT</p>
        <ol className="mt-1 list-decimal space-y-1 pl-5 text-foreground-muted">
          <li>
            In ChatGPT, go to <span className="font-medium text-navy-900">Explore GPTs → Create</span>.
          </li>
          <li>
            Under <span className="font-medium text-navy-900">Configure → Actions</span>, click{" "}
            <span className="font-medium text-navy-900">Create new action</span>, then{" "}
            <span className="font-medium text-navy-900">Import from URL</span> and paste:
          </li>
        </ol>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <code className="rounded bg-navy-50 px-2 py-1 font-mono text-xs">{schemaUrl}</code>
          {schemaUrl && <CopyButton text={schemaUrl} label="Copy URL" />}
        </div>
        <ol start={3} className="mt-2 list-decimal space-y-1 pl-5 text-foreground-muted">
          <li>
            Set Authentication to <span className="font-medium text-navy-900">API Key</span>, type{" "}
            <span className="font-medium text-navy-900">Bearer</span>, and paste the token from step 1.
          </li>
          <li>
            Paste this into the GPT&apos;s <span className="font-medium text-navy-900">Instructions</span> field:
          </li>
        </ol>
        <div className="mt-2 rounded-lg border border-navy-100 bg-navy-50 p-3">
          <pre className="whitespace-pre-wrap font-mono text-xs text-navy-800">
            {SUGGESTED_INSTRUCTIONS}
          </pre>
          <div className="mt-2">
            <CopyButton text={SUGGESTED_INSTRUCTIONS} label="Copy instructions" />
          </div>
        </div>
      </div>

      <div>
        <p className="font-semibold text-navy-900">3. Fill in your Vision Board Profile</p>
        <p className="mt-1 text-foreground-muted">
          My Vibes, Resources, Business Model Canvas, and Daily Affirmations aren&apos;t generated
          by Blueprint — add your own under{" "}
          <a href="/my-blueprint/vision-board" className="font-medium text-navy-900 underline">
            My Blueprint → Vision Board Profile
          </a>{" "}
          so your GPT has real content for those panels instead of leaving them blank.
        </p>
      </div>
    </div>
  );
}
