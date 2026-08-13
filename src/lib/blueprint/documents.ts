import "server-only";

import { getMyBlueprintData } from "@/lib/blueprint/data";
import { prisma } from "@/lib/prisma";

/**
 * DOCUMENT GENERATOR (spec Prompt 6). Each document is a list of headed
 * blocks built from real data the member has already entered — Business
 * profile fields, My Blueprint sections, their active Goal, and their
 * Post-Session Summary. No AI call is involved (spec: "Do not require AI
 * for every document yet — structured template generation is acceptable").
 *
 * `GeneratedDocument` is intentionally renderer-agnostic: it's just
 * headings + paragraphs, no HTML or layout baked in. Today only the
 * printable-HTML view (src/app/(app)/my-blueprint/documents/[slug]) reads
 * it, but the same object is exactly what a future DOCX exporter (e.g.
 * the `docx` package, walking blocks into Paragraph/Heading runs) would
 * need — no change to this file, just a new renderer alongside the HTML
 * one.
 */

export interface DocBlock {
  heading: string;
  /** Empty when nothing in the business's data answers this block yet — rendered as an honest "not yet defined" note, never fabricated. */
  paragraphs: string[];
}

export interface GeneratedDocument {
  slug: string;
  title: string;
  subtitle: string;
  businessName: string;
  generatedAt: Date;
  blocks: DocBlock[];
}

export interface DocumentTypeMeta {
  slug: string;
  title: string;
  description: string;
}

export const DOCUMENT_TYPES: DocumentTypeMeta[] = [
  { slug: "business-overview", title: "Business Overview", description: "Who you are, what you do, and who you do it for." },
  { slug: "executive-summary", title: "Executive Summary", description: "A one-page snapshot of the business, ready to share." },
  { slug: "mission-vision", title: "Mission and Vision", description: "Your purpose, mission, and long-term vision in one place." },
  { slug: "ideal-customer-profile", title: "Ideal Customer Profile", description: "Who you serve best, and the pain points you solve." },
  { slug: "offer-summary", title: "Offer Summary", description: "Your products/services and how they're priced." },
  { slug: "marketing-plan", title: "Marketing Plan", description: "How prospects find you and what draws them in." },
  { slug: "sales-plan", title: "Sales Plan", description: "Your sales process, follow-up, and CRM approach." },
  { slug: "customer-journey", title: "Customer Journey", description: "The path a customer takes from lead to loyal customer." },
  { slug: "sop", title: "SOP", description: "Standard operating procedures for how the business runs." },
  { slug: "revenue-plan", title: "Revenue Plan", description: "Pricing, revenue goals, and how they connect." },
  { slug: "30-60-90-plan", title: "30/60/90-Day Plan", description: "Your near-term goals and next best actions." },
  { slug: "legacy-plan", title: "Legacy Plan", description: "Scaling, team, succession, and the legacy you're building." },
];

async function getDocumentContext(businessId: string) {
  const [business, sectionsByStage, goal, summary] = await Promise.all([
    prisma.business.findUniqueOrThrow({ where: { id: businessId } }),
    getMyBlueprintData(businessId),
    prisma.goal.findFirst({ where: { businessId, status: "ACTIVE" }, orderBy: { createdAt: "desc" } }),
    prisma.postSessionSummary.findFirst({ where: { businessId }, orderBy: { createdAt: "desc" } }),
  ]);

  const sections = new Map<string, string>();
  for (const list of Object.values(sectionsByStage)) {
    for (const s of list) if (s.content) sections.set(s.title, s.content);
  }

  const roadmap = await prisma.roadmap.findFirst({
    where: { businessId },
    include: { tasks: { where: { status: "NOT_STARTED" }, orderBy: { order: "asc" }, take: 3 } },
  });

  return { business, sections, goal, summary, nextTasks: roadmap?.tasks ?? [] };
}

type DocContext = Awaited<ReturnType<typeof getDocumentContext>>;

const NOT_YET = "Not yet defined — build this in My Blueprint.";

function block(heading: string, ...values: (string | null | undefined)[]): DocBlock {
  const paragraphs = values.map((v) => v?.trim()).filter((v): v is string => Boolean(v));
  return { heading, paragraphs: paragraphs.length ? paragraphs : [NOT_YET] };
}

function s(ctx: DocContext, title: string): string | null {
  return ctx.sections.get(title) ?? null;
}

const BUILDERS: Record<string, (ctx: DocContext) => DocBlock[]> = {
  "business-overview": (ctx) => [
    block("Overview", s(ctx, "Business Overview"), ctx.business.description),
    block(
      "At a Glance",
      [ctx.business.industry && `Industry: ${ctx.business.industry}`, ctx.business.location && `Location: ${ctx.business.location}`, ctx.business.website && `Website: ${ctx.business.website}`, ctx.business.businessStage && `Stage: ${ctx.business.businessStage}`]
        .filter(Boolean)
        .join(" · ") || null,
    ),
    block("Purpose", s(ctx, "Purpose")),
    block("Ideal Customer", s(ctx, "Ideal Customer")),
    block("Business Goals", s(ctx, "Business Goals")),
  ],
  "executive-summary": (ctx) => [
    block("The Business", s(ctx, "Business Overview") ?? ctx.business.description),
    block("Value Proposition", s(ctx, "Value Proposition")),
    block("Products & Services", s(ctx, "Products & Services")),
    block("Ideal Customer", s(ctx, "Ideal Customer")),
    block("Where We're Headed", s(ctx, "Business Goals"), ctx.goal ? `Current goal: ${ctx.goal.title}` : null),
  ],
  "mission-vision": (ctx) => [
    block("Purpose", s(ctx, "Purpose")),
    block("Mission", s(ctx, "Mission")),
    block("Vision", s(ctx, "Vision")),
  ],
  "ideal-customer-profile": (ctx) => [
    block("Ideal Customer", s(ctx, "Ideal Customer"), ctx.business.idealCustomer),
    block("Pain Points We Solve", s(ctx, "Customer Pain Points")),
    block("Why They Choose Us", s(ctx, "Value Proposition"), s(ctx, "Elevator Pitch")),
  ],
  "offer-summary": (ctx) => [
    block("Products & Services", s(ctx, "Products & Services"), ctx.business.primaryProductOrService),
    block("Pricing", s(ctx, "Pricing")),
    block("Value Proposition", s(ctx, "Value Proposition")),
  ],
  "marketing-plan": (ctx) => [
    block("Marketing Strategy", s(ctx, "Marketing")),
    block("Lead Generation", s(ctx, "Lead Generation")),
    block("Elevator Pitch", s(ctx, "Elevator Pitch")),
    block("Customer Journey", s(ctx, "Customer Journey")),
  ],
  "sales-plan": (ctx) => [
    block("Sales Process", s(ctx, "Sales Process")),
    block("Follow-Up", s(ctx, "Follow-Up")),
    block("CRM", s(ctx, "CRM")),
  ],
  "customer-journey": (ctx) => [
    block("Lead Generation", s(ctx, "Lead Generation")),
    block("Sales Process", s(ctx, "Sales Process")),
    block("Customer Journey", s(ctx, "Customer Journey")),
    block("Follow-Up", s(ctx, "Follow-Up")),
  ],
  sop: (ctx) => [
    block("Operations", s(ctx, "Operations")),
    block("Standard Operating Procedures", s(ctx, "SOPs")),
    block("Automation", s(ctx, "Automation")),
  ],
  "revenue-plan": (ctx) => [
    block(
      "Current Revenue",
      [ctx.business.annualRevenueRange && `Annual: ${ctx.business.annualRevenueRange}`, ctx.business.monthlyRevenueRange && `Monthly: ${ctx.business.monthlyRevenueRange}`]
        .filter(Boolean)
        .join(" · ") || null,
    ),
    block("Pricing", s(ctx, "Pricing")),
    block("Revenue Goals", s(ctx, "Revenue Goals")),
    block("Recurring Revenue", s(ctx, "Recurring Revenue")),
  ],
  "30-60-90-plan": (ctx) => [
    block("30-Day Goal", ctx.summary?.goal30Day ?? null),
    block("60-Day Goal", ctx.summary?.goal60Day ?? null),
    block("90-Day Goal", ctx.summary?.goal90Day ?? null),
    block(
      "Next Best Actions",
      ctx.nextTasks.length ? ctx.nextTasks.map((t) => `• ${t.title}`).join("\n") : null,
    ),
  ],
  "legacy-plan": (ctx) => [
    block("Legacy Plan", s(ctx, "Legacy Plan")),
    block("Scaling Strategy", s(ctx, "Scaling Strategy")),
    block("Team", s(ctx, "Team")),
    block("Delegation", s(ctx, "Delegation")),
    block("Hiring", s(ctx, "Hiring")),
    block("Succession", s(ctx, "Succession")),
    block("Intellectual Property", s(ctx, "Intellectual Property")),
    block("Partnerships", s(ctx, "Partnerships")),
  ],
};

export async function generateDocument(
  businessId: string,
  slug: string,
): Promise<GeneratedDocument | null> {
  const meta = DOCUMENT_TYPES.find((d) => d.slug === slug);
  const builder = BUILDERS[slug];
  if (!meta || !builder) return null;

  const ctx = await getDocumentContext(businessId);

  return {
    slug,
    title: meta.title,
    subtitle: meta.description,
    businessName: ctx.business.name,
    generatedAt: new Date(),
    blocks: builder(ctx),
  };
}
