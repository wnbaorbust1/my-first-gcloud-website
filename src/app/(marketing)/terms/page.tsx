import type { Metadata } from "next";

import { ANNUAL_PRICE_CENTS, MONTHLY_PRICE_CENTS, TRIAL_DAYS, formatCents } from "@/lib/billing/pricing";

export const metadata: Metadata = { title: "Terms of Service — Blueprint" };

const LAST_UPDATED = "August 11, 2026";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8 first:mt-0">
      <h2 className="font-display text-xl font-semibold text-navy-900">{title}</h2>
      <div className="mt-2 flex flex-col gap-3 text-sm leading-relaxed text-navy-700">{children}</div>
    </section>
  );
}

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 pb-24 pt-16">
      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-gold-600">Legal</p>
      <h1 className="mt-2 font-display text-3xl font-semibold text-navy-900">Terms of Service</h1>
      <p className="mt-2 text-sm text-foreground-muted">Last updated {LAST_UPDATED}</p>

      <Section title="1. Agreement">
        <p>
          These Terms govern your use of Blueprint Business Growth OS (&quot;Blueprint,&quot; &quot;we,&quot;
          &quot;us&quot;). By creating an account you agree to these Terms and to our{" "}
          <a href="/privacy" className="font-medium text-gold-700 hover:text-gold-600 underline">
            Privacy Policy
          </a>
          . If you don&apos;t agree, don&apos;t use Blueprint.
        </p>
      </Section>

      <Section title="2. What Blueprint Is">
        <p>
          Blueprint is a business-growth platform built around an assessment (Passion, Power, Legacy),
          guided sessions, a personalized roadmap, business-builder tools, a growing business document
          (&quot;My Blueprint&quot;), and an AI assistant. Blueprint provides guidance and tools, not a
          guarantee of business outcomes.
        </p>
      </Section>

      <Section title="3. Accounts">
        <p>
          You&apos;re responsible for keeping your login credentials secure and for all activity under your
          account. Tell us right away if you believe your account has been compromised. You must be at
          least 18 to create an account.
        </p>
      </Section>

      <Section title="4. Membership &amp; Billing">
        <p>
          After attending a qualifying Blueprint Session, your Blueprint Builder dashboard activates and
          you get {TRIAL_DAYS} days of complimentary access. After that, continued Builder access requires
          a paid membership: {formatCents(MONTHLY_PRICE_CENTS)}/month or {formatCents(ANNUAL_PRICE_CENTS)}
          /year, billed automatically until cancelled. You can cancel anytime from your Billing page —
          you&apos;ll keep access through the end of the period you already paid for. Prices may change with
          advance notice; changes won&apos;t apply retroactively to a period you&apos;ve already paid for.
        </p>
        <p>
          Some participants may be sponsored by a partner organization (nonprofit, school, employer, or
          program) instead of paying directly. Sponsored access is granted and managed by that
          organization and may have its own end date.
        </p>
      </Section>

      <Section title="5. Acceptable Use">
        <p>
          Use Blueprint for your own business or one you&apos;re authorized to represent. Don&apos;t: share
          your account with people it wasn&apos;t created for; try to access another member&apos;s, business&apos;s,
          or organization&apos;s data without authorization; scrape, reverse-engineer, or overload the
          service; or use Blueprint AI to generate content that violates law or these Terms.
        </p>
      </Section>

      <Section title="6. Your Content">
        <p>
          You own what you put into Blueprint — your business profile, assessment answers, roadmap
          responses, My Blueprint content, and messages to Blueprint AI. You grant us a license to store,
          process, and display it back to you (and to facilitators/staff with a legitimate reason to see
          it, per our Privacy Policy) solely to operate the service.
        </p>
      </Section>

      <Section title="7. Blueprint AI">
        <p>
          Blueprint AI is an assistant grounded in your saved business data. It can make mistakes — review
          anything it produces before you rely on it, especially for legal, tax, or financial decisions.
          Blueprint AI is not a substitute for a licensed attorney, accountant, or financial advisor.
        </p>
      </Section>

      <Section title="8. Facilitators, Admins &amp; Organizations">
        <p>
          If you attend a session through a facilitator, program, or sponsoring organization, staff
          affiliated with that program may be able to see your progress, scores, and notes to support you
          — never your Blueprint AI conversations, which stay private to you. Organizations see aggregate
          data about their participants by default; individual participant detail is only shown when your
          program agreement allows it.
        </p>
      </Section>

      <Section title="9. Termination">
        <p>
          You can stop using Blueprint anytime. We may suspend or terminate an account that violates these
          Terms. If your account is terminated, your saved business data is retained per our Privacy
          Policy rather than deleted immediately, so it&apos;s available if you return.
        </p>
      </Section>

      <Section title="10. Disclaimers &amp; Limitation of Liability">
        <p>
          Blueprint is provided &quot;as is.&quot; We don&apos;t guarantee any particular business result, revenue
          outcome, or that the service will be uninterrupted or error-free. To the maximum extent
          permitted by law, Blueprint isn&apos;t liable for indirect, incidental, or consequential damages
          arising from your use of the service.
        </p>
      </Section>

      <Section title="11. Changes to These Terms">
        <p>
          We may update these Terms as Blueprint evolves. We&apos;ll post the updated version here with a new
          &quot;Last updated&quot; date; continued use after a change means you accept the update.
        </p>
      </Section>

      <Section title="12. Contact">
        <p>
          Questions about these Terms? Reach us from the{" "}
          <a href="/support" className="font-medium text-gold-700 hover:text-gold-600 underline">
            Support
          </a>{" "}
          page, or contact your facilitator/organization if you joined through a program.
        </p>
      </Section>
    </div>
  );
}
