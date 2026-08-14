import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { prisma } from "@/lib/prisma";

import { getVaultContents } from "./vault";

/**
 * INTEGRATION COVERAGE — Phase E Vault, real Postgres. Confirms one real
 * row from each source lands in the right folder with the right origin,
 * and that a PRIVATE facilitator note never leaks into the Vault.
 */
describe("getVaultContents (real DB)", () => {
  const suffix = `vault-${Date.now()}`;
  const businessId = `biz-${suffix}`;
  const roadmapId = `rm-${suffix}`;
  const facilitatorId = `usr-fac-${suffix}`;

  beforeAll(async () => {
    await prisma.business.create({ data: { id: businessId, name: "Vault Co" } });
    await prisma.user.create({
      data: { id: facilitatorId, email: `fac-${suffix}@test.local`, firstName: "F", lastName: "N", role: "FACILITATOR" },
    });
    await prisma.roadmap.create({ data: { id: roadmapId, businessId } });

    const template = await prisma.taskTemplate.create({
      data: {
        stage: "PASSION",
        category: "Purpose",
        title: "Vault Test Purpose Task",
        whyItMatters: "test",
        instructions: [],
        blueprintDestination: "Purpose",
        order: 9999,
      },
    });
    await prisma.roadmapTask.create({
      data: {
        roadmapId,
        taskTemplateId: template.id,
        stage: "PASSION",
        title: "Vault Test Purpose Task",
        status: "COMPLETED",
        priority: "MUST_DO",
        completedAt: new Date(),
        facilitatorAdjusted: true,
      },
    });

    await prisma.sop.create({ data: { businessId, name: "Client Onboarding SOP" } });
    await prisma.offer.create({ data: { businessId, name: "Done-For-You Bookkeeping" } });
    await prisma.goal.create({
      data: { businessId, userId: facilitatorId, title: "Hit $10k MRR", cadence: "NINETY_DAY", goalType: "REVENUE" },
    });
    await prisma.facilitatorNote.create({
      data: { authorId: facilitatorId, businessId, noteType: "PARTICIPANT_VISIBLE", note: "Great progress this week!" },
    });
    await prisma.facilitatorNote.create({
      data: { authorId: facilitatorId, businessId, noteType: "PRIVATE", note: "Internal-only observation." },
    });

  });

  afterAll(async () => {
    await prisma.facilitatorNote.deleteMany({ where: { businessId } });
    await prisma.goal.deleteMany({ where: { businessId } });
    await prisma.offer.deleteMany({ where: { businessId } });
    await prisma.sop.deleteMany({ where: { businessId } });
    await prisma.roadmapTask.deleteMany({ where: { roadmapId } });
    await prisma.roadmap.deleteMany({ where: { id: roadmapId } });
    await prisma.taskTemplate.deleteMany({ where: { title: "Vault Test Purpose Task", order: 9999 } });
    await prisma.business.deleteMany({ where: { id: businessId } });
    await prisma.user.deleteMany({ where: { id: facilitatorId } });
  });

  it("buckets a completed, facilitator-adjusted task into Founder Identity with the right origin", async () => {
    const vault = await getVaultContents(businessId);
    const item = vault["Founder Identity"].find((i) => i.title === "Vault Test Purpose Task");
    expect(item).toBeDefined();
    expect(item?.origin).toBe("Your Facilitator");
    expect(item?.viewHref).toMatch(/^\/build\//);
  });

  it("buckets a SOP into Systems and Automation", async () => {
    const vault = await getVaultContents(businessId);
    expect(vault["Systems and Automation"].some((i) => i.title === "Client Onboarding SOP")).toBe(true);
  });

  it("buckets an Offer into Offers", async () => {
    const vault = await getVaultContents(businessId);
    expect(vault.Offers.some((i) => i.title === "Done-For-You Bookkeeping")).toBe(true);
  });

  it("buckets a Goal into Growth", async () => {
    const vault = await getVaultContents(businessId);
    expect(vault.Growth.some((i) => i.title === "Hit $10k MRR")).toBe(true);
  });

  it("surfaces a PARTICIPANT_VISIBLE note but never a PRIVATE one", async () => {
    const vault = await getVaultContents(businessId);
    const notes = vault["Facilitator Notes"];
    expect(notes.some((i) => i.title.includes("Great progress"))).toBe(true);
    expect(notes.some((i) => i.title.includes("Internal-only"))).toBe(false);
    expect(notes[0]?.origin).toBe("Your Facilitator");
  });

  it("leaves untouched folders (Research, Legal and Compliance, Brand) honestly empty", async () => {
    const vault = await getVaultContents(businessId);
    expect(vault.Research).toEqual([]);
    expect(vault["Legal and Compliance"]).toEqual([]);
    expect(vault.Brand).toEqual([]);
  });
});
