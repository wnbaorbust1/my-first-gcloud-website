import type { Metadata } from "next";
import { getAllCourses } from "@/lib/curriculum/queries";
import { TeksImportForm } from "@/components/admin/teks-import-form";

export const metadata: Metadata = { title: "Admin TEKS Import — Legacy Command Center" };

export default async function AdminTeksImportPage() {
  const courses = await getAllCourses();

  return (
    <div className="mx-auto max-w-3xl">
      <p className="font-mono text-xs uppercase tracking-[0.18em] text-slate">Admin</p>
      <h1 className="mt-2 font-display text-4xl font-semibold text-ink">
        Import TEKS standards<span className="text-rose-gold">.</span>
      </h1>
      <p className="mt-2 max-w-xl text-sm text-slate">
        Paste the official TEA TEKS text for a subject — Claude extracts each standard&apos;s code and
        description. Review and edit every row before anything is written to the reference table.
      </p>

      <TeksImportForm subjects={courses.map((c) => c.display_name)} />
    </div>
  );
}
