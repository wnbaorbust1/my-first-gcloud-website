import { NextResponse } from "next/server";

/**
 * OpenAPI schema for the Blueprint Vision Board export — this is the
 * document a member pastes (via "Import from URL") into a ChatGPT
 * Custom GPT Action so ChatGPT knows how to call
 * GET /api/gpt/vision-board itself. Schema only, no member data lives
 * here, so this route is intentionally unauthenticated (same
 * reasoning as e.g. Stripe or GitHub publishing their OpenAPI specs at
 * a public URL — the schema is not the secret, the bearer token is).
 */
export async function GET(request: Request) {
  const origin = new URL(request.url).origin;

  const schema = {
    openapi: "3.1.0",
    info: {
      title: "Blueprint Vision Board Export",
      description:
        "Returns a Blueprint member's real business data, shaped around the pillars of a hand-drawn vision-board worksheet (story, why, scores, goals, accountability, resources, business model canvas, affirmations) — for generating a personalized vision-board image.",
      version: "1.0.0",
    },
    servers: [{ url: origin }],
    paths: {
      "/api/gpt/vision-board": {
        get: {
          operationId: "getVisionBoard",
          summary: "Get the signed-in member's Blueprint vision-board data",
          security: [{ bearerAuth: [] }],
          responses: {
            "200": {
              description: "The member's real vision-board data. Fields the member hasn't filled in are null/empty — never fabricate a value for them; render that pillar as an honest blank instead.",
              content: { "application/json": { schema: { type: "object" } } },
            },
            "401": { description: "Missing or invalid token." },
            "404": { description: "This account has no Blueprint business profile yet." },
            "429": { description: "Rate limited — wait and retry." },
          },
        },
      },
    },
    components: {
      securitySchemes: {
        bearerAuth: { type: "http", scheme: "bearer" },
      },
    },
  };

  return NextResponse.json(schema);
}
