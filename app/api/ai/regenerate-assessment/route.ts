import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getAdminProfile } from "@/lib/auth/session";
import { regenerateAssessmentVariant } from "@/lib/ai/generate-assessment";

export const maxDuration = 120;

const requestSchema = z.object({
  sourceAssessmentId: z.string().uuid(),
  variant: z.enum(["retake", "modified"]),
});

const VARIANT_SUFFIX: Record<"retake" | "modified", string> = {
  retake: "(Retake)",
  modified: "(Modified)",
};

export async function POST(request: Request) {
  const admin = await getAdminProfile();
  if (!admin) {
    return NextResponse.json({ error: "Admins only." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request." },
      { status: 400 },
    );
  }
  const { sourceAssessmentId, variant } = parsed.data;

  const supabase = createClient();

  const { data: source, error: sourceError } = await supabase
    .from("assessments")
    .select("id, unit_id, title, questions, course_id")
    .eq("id", sourceAssessmentId)
    .maybeSingle();
  if (sourceError || !source) {
    return NextResponse.json({ error: "Source assessment not found." }, { status: 404 });
  }

  const { data: course } = await supabase
    .from("courses")
    .select("slug")
    .eq("id", source.course_id)
    .maybeSingle();

  const result = await regenerateAssessmentVariant({
    variant,
    sourceTitle: source.title,
    sourceQuestions: source.questions,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 502 });
  }

  const { data: newAssessment, error: insertError } = await supabase
    .from("assessments")
    .insert({
      unit_id: source.unit_id,
      title: `${source.title} ${VARIANT_SUFFIX[variant]}`,
      questions: result.questions,
      answer_key: result.answerKey,
      variant_type: variant,
      source_assessment_id: source.id,
    })
    .select("id")
    .single();

  if (insertError || !newAssessment) {
    console.error("regenerate-assessment: failed to save variant", insertError);
    return NextResponse.json(
      { error: "Generated the variant but couldn't save it. Try again." },
      { status: 500 },
    );
  }

  return NextResponse.json({ assessmentId: newAssessment.id, courseSlug: course?.slug });
}
