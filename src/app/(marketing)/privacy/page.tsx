import type { Metadata } from "next";

export const metadata: Metadata = { title: "Privacy Policy — Blueprint" };

const LAST_UPDATED = "August 11, 2026";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8 first:mt-0">
      <h2 className="font-display text-xl font-semibold text-navy-900">{title}</h2>
      <div className="mt-2 flex flex-col gap-3 text-sm leading-relaxed text-navy-700">{children}</div>
    </section>
  );
}

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 pb-24 pt-16">
      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-gold-600">Legal</p>
      <h1 className="mt-2 font-display text-3xl font-semibold text-navy-900">Privacy Policy</h1>
      <p className="mt-2 text-sm text-foreground-muted">Last updated {LAST_UPDATED}</p>

      <Section title="1. What We Collect">
        <p>
          <b>Account info:</b> name, email, password (stored as a one-way hash — we never see or store your
          actual password).
          <br />
          <b>Business info:</b> what you tell us in your business profile, assessment, roadmap, My
          Blueprint, and business-builder tools (CRM, offers, SOPs, and similar).
          <br />
          <b>Session &amp; billing info:</b> session registrations and attendance, and — if you have a paid
          membership — billing status and payment-method display details (card brand/last 4) from our
          payment processor. We never store your full card number.
          <br />
          <b>Blueprint AI conversations:</b> your messages and the business context used to answer them.
          <br />
          <b>Usage info:</b> basic activity timestamps (e.g. last active date) used to power features like
          progress tracking — not detailed page-by-page tracking.
        </p>
      </Section>

      <Section title="2. How We Use It">
        <p>
          To run Blueprint: score your assessment, generate and track your roadmap, power Blueprint AI with
          your real business context, process billing, and show your facilitator or sponsoring
          organization the information your program agreement allows. We don&apos;t sell your data, and we
          don&apos;t use your business data to train third-party AI models.
        </p>
      </Section>

      <Section title="3. Who Can See What">
        <p>
          <b>You:</b> everything you&apos;ve entered.
          <br />
          <b>Your facilitator</b> (if you have one): your progress, scores, roadmap, and any notes they or
          an admin have written — never your Blueprint AI conversations, which are private to you.
          <br />
          <b>Platform admins:</b> the same access as a facilitator, plus account and billing administration,
          used only to operate and support the platform.
          <br />
          <b>A sponsoring organization</b> (if you joined through one): aggregate statistics about all
          their participants by default. Your individual name and record are only shown to them if your
          program&apos;s data-sharing agreement explicitly allows it — this is a setting we control, not
          something the organization can turn on unilaterally.
          <br />
          <b>Other members:</b> never. Every business, assessment, roadmap, AI conversation, and billing
          record is isolated to the account (and program) it belongs to.
        </p>
      </Section>

      <Section title="4. Third Parties We Use">
        <p>
          <b>Stripe</b> for payment processing (we never touch your raw card number).
          <br />
          <b>Anthropic</b> for Blueprint AI responses — your message and relevant business context are sent
          to generate a reply, per Anthropic&apos;s own data-handling terms.
          <br />
          <b>An email provider</b> for account and password-reset emails.
          <br />
          We don&apos;t sell or rent your data to advertisers, data brokers, or anyone else.
        </p>
      </Section>

      <Section title="5. How Long We Keep It">
        <p>
          Your business&apos;s work — assessments, roadmap, My Blueprint, tools — stays intact even if your
          membership lapses or you stop paying, so it&apos;s there when you return; we don&apos;t delete a
          business&apos;s work just because a subscription ended. If you close your account entirely, contact
          us via Support and we&apos;ll delete your personal data other than what we&apos;re required to keep for
          legal, tax, or fraud-prevention reasons.
        </p>
      </Section>

      <Section title="6. Your Choices">
        <p>
          You can review and edit most of your data directly in Blueprint (business profile, roadmap
          answers, My Blueprint). Email us via Support to request a copy of your data, ask us to delete an
          account, or ask a question about anything on this page.
        </p>
      </Section>

      <Section title="7. Security">
        <p>
          Passwords are hashed, never stored in plain text. Payment details are handled by Stripe, not
          stored on our servers. Access to your business&apos;s data is checked on every request, not just
          hidden from the menu.
        </p>
      </Section>

      <Section title="8. Changes to This Policy">
        <p>
          We&apos;ll post updates here with a new &quot;Last updated&quot; date. Material changes affecting how
          your data is used will be communicated more directly (e.g. by email) where practical.
        </p>
      </Section>

      <Section title="9. Contact">
        <p>
          Questions about your data? Reach us from the{" "}
          <a href="/support" className="font-medium text-gold-700 underline hover:text-gold-600">
            Support
          </a>{" "}
          page.
        </p>
      </Section>
    </div>
  );
}
