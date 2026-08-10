import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getOrCreateActiveAssessment } from "@/lib/assessment/session";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import type { Stage } from "@/lib/utils";

import { AssessmentFlow } from "./assessment-flow";
import type { AssessmentQuestionClient, ResponseMap, ResponseValue } from "./types";

export const metadata: Metadata = { title: "Blueprint Assessment — Blueprint" };
export const dynamic = "force-dynamic";

export default async function AssessmentPage() {
  const user = await requireUser();

  const membership = await prisma.userBusinessMembership.findFirst({
    where: { userId: user.id },
    orderBy: { createdAt: "asc" },
    include: { business: { select: { id: true, name: true } } },
  });

  if (!membership) {
    redirect("/business-profile");
  }
  const business = membership.business;

  // A completed assessment already has results — send them there instead
  // of silently starting a duplicate. (Retaking is a deliberate future
  // action, not something a stray revisit to /assessment should trigger.)
  const mostRecent = await prisma.assessment.findFirst({
    where: { businessId: business.id },
    orderBy: { createdAt: "desc" },
  });
  if (mostRecent?.status === "COMPLETED") {
    redirect(`/assessment/results/${mostRecent.id}`);
  }

  const assessment = await getOrCreateActiveAssessment(business.id);

  const [questions, responses] = await Promise.all([
    prisma.assessmentQuestion.findMany({
      where: { isActive: true },
      orderBy: { order: "asc" },
    }),
    prisma.assessmentResponse.findMany({
      where: { assessmentId: assessment.id },
    }),
  ]);

  const questionsClient: AssessmentQuestionClient[] = questions.map((q) => ({
    id: q.id,
    stage: q.stage as Stage,
    category: q.category,
    questionType: q.questionType,
    order: q.order,
    prompt: q.prompt,
    helperText: q.helperText,
    options: q.options as AssessmentQuestionClient["options"],
    minValue: q.minValue,
    maxValue: q.maxValue,
    includeInScoring: q.includeInScoring,
  }));

  const initialResponses: ResponseMap = {};
  for (const r of responses) {
    initialResponses[r.questionId] = r.value as ResponseValue;
  }

  return (
    <AssessmentFlow
      assessmentId={assessment.id}
      businessName={business.name}
      questions={questionsClient}
      initialResponses={initialResponses}
      hasStarted={assessment.status === "IN_PROGRESS"}
    />
  );
}
