import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { prisma } from "@/lib/prisma";

/**
 * ROUTE/INTEGRATION COVERAGE — "reschedule" (BLUEPRINT_MASTER_SPEC_CLAUDE_CODE.md
 * §13, Phase D). Confirms a member can pause/resume their own task
 * without losing its saved answers, and can't touch someone else's.
 */
const mockUser: { id: string; role: "MEMBER" | "ADMIN" } = { id: "", role: "MEMBER" };
vi.mock("@/lib/session", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/session")>();
  return {
    ...actual,
    getCurrentUser: async () => (mockUser.id ? { id: mockUser.id, role: mockUser.role } : null),
  };
});

const { POST: pause } = await import("@/app/api/roadmap/tasks/[id]/pause/route");
const { POST: resume } = await import("@/app/api/roadmap/tasks/[id]/resume/route");

function callPause(taskId: string) {
  return pause(new Request(`http://test/api/roadmap/tasks/${taskId}/pause`, { method: "POST" }), {
    params: Promise.resolve({ id: taskId }),
  });
}
function callResume(taskId: string) {
  return resume(new Request(`http://test/api/roadmap/tasks/${taskId}/resume`, { method: "POST" }), {
    params: Promise.resolve({ id: taskId }),
  });
}

describe("POST /api/roadmap/tasks/[id]/pause and resume (real DB)", () => {
  const suffix = `resched-${Date.now()}`;
  const userId = `usr-${suffix}`;
  const otherUserId = `usr-other-${suffix}`;
  const businessId = `biz-${suffix}`;
  const roadmapId = `rm-${suffix}`;
  const taskId = `task-${suffix}`;

  beforeAll(async () => {
    await prisma.user.create({
      data: { id: userId, email: `${suffix}@test.local`, firstName: "R", lastName: "S", role: "MEMBER" },
    });
    await prisma.user.create({
      data: { id: otherUserId, email: `other-${suffix}@test.local`, firstName: "O", lastName: "T", role: "MEMBER" },
    });
    await prisma.business.create({ data: { id: businessId, name: "Reschedule Co" } });
    await prisma.userBusinessMembership.create({ data: { userId, businessId, role: "OWNER" } });
    await prisma.roadmap.create({ data: { id: roadmapId, businessId } });
    await prisma.roadmapTask.create({
      data: { id: taskId, roadmapId, stage: "PASSION", title: "Write mission statement", status: "NOT_STARTED", priority: "MUST_DO" },
    });
    await prisma.taskResponse.create({
      data: { roadmapTaskId: taskId, answers: { mission: "draft answer" } as never },
    });
    mockUser.id = userId;
    mockUser.role = "MEMBER";
  });

  afterAll(async () => {
    await prisma.taskResponse.deleteMany({ where: { roadmapTaskId: taskId } });
    await prisma.roadmapTask.deleteMany({ where: { roadmapId } });
    await prisma.roadmap.deleteMany({ where: { id: roadmapId } });
    await prisma.userBusinessMembership.deleteMany({ where: { businessId } });
    await prisma.business.deleteMany({ where: { id: businessId } });
    await prisma.user.deleteMany({ where: { id: { in: [userId, otherUserId] } } });
  });

  it("a stranger cannot pause someone else's task", async () => {
    mockUser.id = otherUserId;
    const res = await callPause(taskId);
    expect(res.status).toBe(404);
    mockUser.id = userId;
  });

  it("pauses a NOT_STARTED task without touching its saved answers", async () => {
    const res = await callPause(taskId);
    expect(res.status).toBe(200);

    const task = await prisma.roadmapTask.findUnique({ where: { id: taskId } });
    expect(task?.status).toBe("PAUSED");

    const response = await prisma.taskResponse.findUnique({ where: { roadmapTaskId: taskId } });
    expect(response?.answers).toEqual({ mission: "draft answer" }); // untouched
  });

  it("pausing an already-paused task is idempotent", async () => {
    const res = await callPause(taskId);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok: boolean };
    expect(body.ok).toBe(true);
  });

  it("resumes a paused task back to NOT_STARTED, answers still intact", async () => {
    const res = await callResume(taskId);
    expect(res.status).toBe(200);

    const task = await prisma.roadmapTask.findUnique({ where: { id: taskId } });
    expect(task?.status).toBe("NOT_STARTED");

    const response = await prisma.taskResponse.findUnique({ where: { roadmapTaskId: taskId } });
    expect(response?.answers).toEqual({ mission: "draft answer" });
  });

  it("cannot resume a task that isn't paused", async () => {
    const res = await callResume(taskId); // already NOT_STARTED from the previous test
    expect(res.status).toBe(409);
  });
});
