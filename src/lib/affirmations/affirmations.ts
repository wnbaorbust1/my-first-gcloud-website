import "server-only";

import type { AffirmationEventType, BlueprintStage } from "@/generated/prisma/enums";
import { awardPoints } from "@/lib/gamification/points";
import { prisma } from "@/lib/prisma";

/**
 * spec §7's stage-based affirmation examples, verbatim, plus its one
 * general example. `stage: null` = shown regardless of the member's
 * current stage.
 */
const AFFIRMATION_SEED: { text: string; stage: BlueprintStage | null }[] = [
  { text: "My experience has value, and I can turn it into an opportunity.", stage: null },

  { text: "I have valuable skills, knowledge, and experiences.", stage: "PASSION" },
  { text: "My story contains clues to my purpose.", stage: "PASSION" },
  { text: "Clarity comes when I take action.", stage: "PASSION" },
  { text: "Starting small does not mean thinking small.", stage: "PASSION" },
  { text: "My purpose can create both impact and income.", stage: "PASSION" },
  { text: "I am ready to turn my passion into a plan.", stage: "PASSION" },

  { text: "I am building my business one strong system at a time.", stage: "POWER" },
  { text: "My work deserves confident pricing.", stage: "POWER" },
  { text: "Selling is an invitation to solve a problem.", stage: "POWER" },
  { text: "Consistency is more powerful than perfection.", stage: "POWER" },
  { text: "Every system I build gives me back time.", stage: "POWER" },
  { text: "I have the power to turn ideas into results.", stage: "POWER" },

  { text: "I am building something that can outlive me.", stage: "LEGACY" },
  { text: "I lead with courage, clarity, and integrity.", stage: "LEGACY" },
  { text: "Delegation creates room for growth.", stage: "LEGACY" },
  { text: "My business can create wealth and opportunity.", stage: "LEGACY" },
  { text: "My impact extends beyond revenue.", stage: "LEGACY" },
  { text: "My legacy is being built through today's decisions.", stage: "LEGACY" },
];

/** Idempotent — same pattern as ensureBadgesSeeded()/ensureTaskTemplatesSeeded(). */
export async function ensureAffirmationsSeeded(): Promise<void> {
  const count = await prisma.affirmation.count({ where: { isCustom: false } });
  if (count >= AFFIRMATION_SEED.length) return;

  await prisma.affirmation.createMany({
    data: AFFIRMATION_SEED,
    skipDuplicates: true,
  });
}

function utcDayStart(d: Date = new Date()): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

/** Small deterministic hash — no crypto needed, just needs to spread evenly across a day-changing seed. */
function hashToIndex(seed: string, length: number): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h * 31 + seed.charCodeAt(i)) | 0;
  }
  return Math.abs(h) % length;
}

async function resolveMemberStage(businessId: string): Promise<BlueprintStage | null> {
  const assessment = await prisma.assessment.findFirst({
    where: { businessId, status: "COMPLETED" },
    orderBy: { completedAt: "desc" },
    select: { recommendedSessionType: true },
  });
  const type = assessment?.recommendedSessionType;
  if (!type) return null;
  // Same GROWTH->LEGACY convention as src/lib/assessment/scoring.ts's focusStage.
  return type === "GROWTH" ? "LEGACY" : (type as BlueprintStage);
}

export interface TodaysAffirmation {
  id: string;
  text: string;
  stage: BlueprintStage | null;
  spoken: boolean;
  reflected: boolean;
  connectedTaskId: string | null;
  favorited: boolean;
}

/** Deterministic "today's affirmation" — same one all day, changes at UTC midnight, picked from the member's current stage (falls back to the general pool). */
export async function getTodaysAffirmation(businessId: string): Promise<TodaysAffirmation> {
  await ensureAffirmationsSeeded();

  const stage = await resolveMemberStage(businessId);
  const day = utcDayStart();

  let pool = await prisma.affirmation.findMany({
    where: { isCustom: false, stage: stage ?? undefined },
    orderBy: { id: "asc" },
  });
  if (pool.length === 0) {
    pool = await prisma.affirmation.findMany({ where: { isCustom: false, stage: null }, orderBy: { id: "asc" } });
  }
  // Defense in depth: if seeding somehow never landed (or landed after
  // this business's very first request raced it), retry the seed once
  // rather than indexing into an empty array.
  if (pool.length === 0) {
    await ensureAffirmationsSeeded();
    pool = await prisma.affirmation.findMany({ where: { isCustom: false }, orderBy: { id: "asc" } });
  }
  // Still empty after a real retry means something is genuinely wrong
  // (not a transient race) — throw rather than fabricate a fake,
  // non-database-backed affirmation whose id would fail on the very
  // first click. The dashboard's fault-isolation around this call
  // already turns this into "card doesn't render" instead of a crash.
  if (pool.length === 0) {
    throw new Error(`No affirmations available (seeding did not produce any rows) for business ${businessId}`);
  }

  const affirmation = pool[hashToIndex(`${businessId}:${day.toISOString().slice(0, 10)}`, pool.length)];

  const events = await prisma.affirmationEvent.findMany({
    where: { businessId, affirmationId: affirmation.id, day },
  });
  const has = (type: AffirmationEventType) => events.some((e) => e.type === type);

  return {
    id: affirmation.id,
    text: affirmation.text,
    stage: affirmation.stage,
    spoken: has("SPOKEN"),
    reflected: has("REFLECTION"),
    connectedTaskId: events.find((e) => e.type === "CONNECTED_ACTION")?.connectedTaskId ?? null,
    favorited: has("FAVORITED"),
  };
}

/** Records one of today's four affirmation actions — idempotent per (business, affirmation, type, day) via the unique constraint, so a duplicate click just returns false instead of double-awarding. */
async function logEventOnce(
  businessId: string,
  affirmationId: string,
  type: AffirmationEventType,
  extra?: { reflection?: string; connectedTaskId?: string },
): Promise<boolean> {
  const day = utcDayStart();
  try {
    await prisma.affirmationEvent.create({
      data: { businessId, affirmationId, type, day, ...extra },
    });
    return true;
  } catch {
    // Unique constraint hit — already logged today, not an error.
    return false;
  }
}

export async function markSpoken(businessId: string, affirmationId: string): Promise<boolean> {
  const created = await logEventOnce(businessId, affirmationId, "SPOKEN");
  if (created) await awardPoints(businessId, "AFFIRMATION_SPOKEN", "Daily affirmation spoken");
  return created;
}

export async function addReflection(businessId: string, affirmationId: string, reflection: string): Promise<boolean> {
  const created = await logEventOnce(businessId, affirmationId, "REFLECTION", { reflection });
  if (created) await awardPoints(businessId, "AFFIRMATION_REFLECTION", "Affirmation reflection");
  return created;
}

export async function connectToAction(businessId: string, affirmationId: string, taskId: string): Promise<boolean> {
  const created = await logEventOnce(businessId, affirmationId, "CONNECTED_ACTION", { connectedTaskId: taskId });
  if (created) await awardPoints(businessId, "AFFIRMATION_CONNECTED_ACTION", "Affirmation connected to today's action");
  return created;
}

/** Favoriting doesn't award points (spec doesn't list it in the points table) and toggles rather than being once-per-day. */
export async function toggleFavorite(businessId: string, affirmationId: string): Promise<boolean> {
  const day = utcDayStart();
  const existing = await prisma.affirmationEvent.findUnique({
    where: { businessId_affirmationId_type_day: { businessId, affirmationId, type: "FAVORITED", day } },
  });
  if (existing) {
    await prisma.affirmationEvent.delete({ where: { id: existing.id } });
    return false;
  }
  await prisma.affirmationEvent.create({ data: { businessId, affirmationId, type: "FAVORITED", day } });
  return true;
}
