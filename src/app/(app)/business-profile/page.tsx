import type { Metadata } from "next";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

import { BusinessProfileForm } from "./business-profile-form";

export const metadata: Metadata = { title: "Business Profile — Blueprint" };
export const dynamic = "force-dynamic";

export default async function BusinessProfilePage() {
  const user = await requireUser();

  const membership = await prisma.userBusinessMembership.findFirst({
    where: { userId: user.id },
    include: { business: true },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="font-display text-3xl font-semibold text-navy-900">
        {membership ? "Your Business Profile" : "Tell Us About Your Business"}
      </h1>
      <p className="mt-1 text-foreground-muted">
        {membership
          ? "Update your business details any time — Blueprint uses these to personalize your roadmap."
          : "Only the business name is required. Skip anything you're not sure about — you can always come back and fill it in later."}
      </p>

      <div className="mt-8">
        <BusinessProfileForm business={membership?.business ?? null} />
      </div>
    </div>
  );
}
