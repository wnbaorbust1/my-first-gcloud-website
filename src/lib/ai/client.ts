import "server-only";

export interface AiChatTurn {
  role: "user" | "assistant";
  content: string;
}

/** True only when a real key is configured — never assume the SDK/API is reachable. */
export function isAiConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

const NOT_CONFIGURED_MESSAGE =
  "Blueprint AI isn't fully connected in this environment yet — no AI provider key is configured, so I can't generate a real response right now. Everything else here works normally: this conversation, the business context I'd use, and this message are all saved, and real answers will start appearing the moment a key is added. (Same situation as this environment's email sending — see docs/BUILD_STATUS.md.)";

const REQUEST_FAILED_MESSAGE =
  "Something went wrong reaching Blueprint AI just now. Your message was saved — try asking again in a moment.";

/**
 * Calls the Anthropic Messages API directly via `fetch` rather than
 * adding the `@anthropic-ai/sdk` dependency — this is the only place in
 * the app that needs it, and a server-only `fetch` call already
 * satisfies "no sensitive keys exposed client-side" (the key never
 * leaves this function). Never throws: a missing key or a failed
 * request both resolve to a clear, honest message instead of crashing
 * the conversation — matching the "no email provider" graceful-
 * degradation pattern used elsewhere in this app.
 */
export async function callBlueprintAi(params: {
  systemPrompt: string;
  history: AiChatTurn[];
}): Promise<string> {
  if (!isAiConfigured()) {
    return NOT_CONFIGURED_MESSAGE;
  }

  const model = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-5";

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY!,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: 1024,
        system: params.systemPrompt,
        messages: params.history.map((t) => ({ role: t.role, content: t.content })),
      }),
    });

    if (!res.ok) {
      return REQUEST_FAILED_MESSAGE;
    }

    const data = (await res.json()) as {
      content?: { type: string; text?: string }[];
    };
    const textBlock = data.content?.find((b) => b.type === "text" && b.text);
    return textBlock?.text?.trim() || REQUEST_FAILED_MESSAGE;
  } catch {
    return REQUEST_FAILED_MESSAGE;
  }
}
