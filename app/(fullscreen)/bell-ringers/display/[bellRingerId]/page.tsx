import { notFound } from "next/navigation";
import Link from "next/link";
import { getBellRingerById } from "@/lib/teacher/bell-ringer-queries";
import { hasCourseAccess } from "@/lib/billing/access";
import { Paywall } from "@/components/billing/paywall";
import { BellRingerDisplay } from "@/components/teacher/bell-ringer-display";

export default async function BellRingerDisplayPage({
  params,
}: {
  params: { bellRingerId: string };
}) {
  // RLS (bell_ringers_all) already restricts this to the signed-in
  // teacher's own row or an admin — a stranger's id simply comes back
  // null here, same as a genuinely missing one.
  const bellRinger = await getBellRingerById(params.bellRingerId);
  if (!bellRinger) notFound();

  const canAccess = await hasCourseAccess(bellRinger.course_id);
  if (!canAccess) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6">
        <div>
          <Link href="/bell-ringers" className="font-mono text-[11px] uppercase tracking-wide text-slate hover:text-ink">
            ← Exit
          </Link>
          <div className="mt-6">
            <Paywall
              courseName={bellRinger.course.display_name}
              message="Your subscription to this course has lapsed — resubscribe to present this again."
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <BellRingerDisplay
      title={bellRinger.title}
      promptText={bellRinger.prompt_text}
      answerKey={bellRinger.answer_key}
      courseDisplayName={bellRinger.course.display_name}
    />
  );
}
