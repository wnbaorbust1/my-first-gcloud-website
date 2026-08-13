import type { Stage } from "@/lib/utils";

export interface CategoryContent {
  stage: Stage;
  whyItMatters: string;
  nextStep: string;
}

/**
 * Score Detail page copy (spec example: "Lead Generation... Why It
 * Matters... Recommended Next Step..."), one entry per assessment
 * category. Deliberately plain content, not a rules engine — a category
 * with no live entry still renders fine (src/lib/assessment/scoring.ts
 * falls back to generic copy), so adding a new category later is
 * additive.
 */
export const CATEGORY_CONTENT: Record<string, CategoryContent> = {
  // ---- PASSION --------------------------------------------------------
  Purpose: {
    stage: "PASSION",
    whyItMatters:
      "A clear purpose is what keeps decisions consistent and keeps you motivated when things get hard.",
    nextStep: "Write one sentence describing why your business exists, beyond making money.",
  },
  Vision: {
    stage: "PASSION",
    whyItMatters:
      "Without a vision for where the business is headed, it's easy to react to whatever comes up instead of building toward something.",
    nextStep: "Draft a one-paragraph vision of what your business looks like in 3 years.",
  },
  "Ideal Customer": {
    stage: "PASSION",
    whyItMatters:
      "Trying to serve everyone usually means your marketing, offer, and messaging resonate with no one.",
    nextStep: "Write a short profile of the one customer you serve best.",
  },
  "Customer Problem": {
    stage: "PASSION",
    whyItMatters:
      "If you can't name the problem precisely, your marketing and offer will stay generic.",
    nextStep: "List the top 3 problems your best customers hire you to solve.",
  },
  "Offer Clarity": {
    stage: "PASSION",
    whyItMatters:
      "A confusing offer is one of the most common reasons a good business struggles to sell.",
    nextStep: "Write one sentence connecting your offer directly to the problem it solves.",
  },
  "Business Clarity": {
    stage: "PASSION",
    whyItMatters:
      "If you can't explain your business in two sentences, customers and referral partners can't either.",
    nextStep: "Write and practice a 2-sentence explanation of what your business does.",
  },
  Positioning: {
    stage: "PASSION",
    whyItMatters:
      "Without clear differentiation, price becomes the only thing customers can compare.",
    nextStep: "Write down the one thing you do that competitors don't.",
  },
  Goals: {
    stage: "PASSION",
    whyItMatters:
      "Vague goals produce vague effort. Specific goals make it obvious what to prioritize this month.",
    nextStep: "Set one specific, measurable 12-month goal for your business.",
  },

  // ---- POWER ------------------------------------------------------------
  "Business Foundation": {
    stage: "POWER",
    whyItMatters:
      "The right legal and financial foundation protects you personally and unlocks banking, contracts, and funding.",
    nextStep: "Confirm your business registration is current, or file for the structure that fits.",
  },
  "Products and Services": {
    stage: "POWER",
    whyItMatters:
      "Loosely defined offers are hard to price, market, or deliver consistently.",
    nextStep: "Write a one-page description of exactly what's included in your core offer.",
  },
  Pricing: {
    stage: "POWER",
    whyItMatters: "Without a pricing strategy, prices tend to drift down under pressure.",
    nextStep: "Revisit your pricing against your costs, time, and the value delivered.",
  },
  Branding: {
    stage: "POWER",
    whyItMatters:
      "A brand that doesn't match your business creates friction between what you promise and what people expect.",
    nextStep: "Audit your name, visuals, and messaging for consistency across one channel.",
  },
  Marketing: {
    stage: "POWER",
    whyItMatters: "Inconsistent marketing produces inconsistent revenue.",
    nextStep: "Pick one marketing activity you can do every week for the next 90 days.",
  },
  "Lead Generation": {
    stage: "POWER",
    whyItMatters:
      "Without a consistent lead-generation method, revenue can become unpredictable.",
    nextStep: "Create one primary lead-generation channel and commit to it consistently.",
  },
  Sales: {
    stage: "POWER",
    whyItMatters:
      "Without a repeatable process, sales results depend entirely on memory and mood.",
    nextStep: "Write down the steps you take from first contact to closed sale.",
  },
  CRM: {
    stage: "POWER",
    whyItMatters: "Leads that aren't tracked are leads that get forgotten.",
    nextStep: "Set up one simple system (even a spreadsheet) to track every prospect.",
  },
  "Customer Journey": {
    stage: "POWER",
    whyItMatters:
      "A weak onboarding experience is one of the fastest ways to lose a customer you just won.",
    nextStep: "Map the first 3 steps a new customer experiences after they buy.",
  },
  Operations: {
    stage: "POWER",
    whyItMatters:
      "Undocumented processes live only in your head, which makes delegation and scaling nearly impossible.",
    nextStep: "Document your single most repeated process, step by step.",
  },
  Technology: {
    stage: "POWER",
    whyItMatters: "The right tools save hours every week that can go back into growth.",
    nextStep: "Identify one manual task you could hand off to a tool this month.",
  },
  "Financial Management": {
    stage: "POWER",
    whyItMatters:
      "You can't make good decisions about a business whose numbers you don't track.",
    nextStep: "Set up a simple monthly habit for reviewing revenue, expenses, and profit.",
  },
  Automation: {
    stage: "POWER",
    whyItMatters: "Manual repetition is the ceiling on how much you can grow without burning out.",
    nextStep: "Automate one repetitive task — start with follow-ups or scheduling.",
  },

  // ---- LEGACY -----------------------------------------------------------
  Leadership: {
    stage: "LEGACY",
    whyItMatters:
      "A business that depends on you for every task is a job, not an asset.",
    nextStep: "Identify one task only you can currently do, and start documenting it.",
  },
  Delegation: {
    stage: "LEGACY",
    whyItMatters: "Growth is capped by how much you personally can do.",
    nextStep: "Delegate one recurring task this month, even imperfectly.",
  },
  Team: {
    stage: "LEGACY",
    whyItMatters:
      "Waiting until you're overwhelmed to plan hiring usually means hiring reactively and expensively.",
    nextStep: "List the next 1–2 roles that would free up your highest-value time.",
  },
  Systems: {
    stage: "LEGACY",
    whyItMatters: "Systems are what let a business run well without heroics.",
    nextStep: "Turn one more undocumented process into a simple written system.",
  },
  Scaling: {
    stage: "LEGACY",
    whyItMatters:
      "Revenue that only grows by adding more of your own hours doesn't scale.",
    nextStep: "Identify one place you could increase output without increasing your hours.",
  },
  "Automation Maturity": {
    stage: "LEGACY",
    whyItMatters:
      "Mature automation is what makes a business resilient when you're unavailable.",
    nextStep: "Pick one system to fully document and automate end-to-end.",
  },
  "Revenue Diversification": {
    stage: "LEGACY",
    whyItMatters: "A single revenue source is a single point of failure.",
    nextStep: "Evaluate one additional revenue stream — recurring, licensing, or a new offer.",
  },
  "Intellectual Property": {
    stage: "LEGACY",
    whyItMatters:
      "Packaged assets (courses, templates, licenses) create value independent of your hours.",
    nextStep: "Turn one thing you already know or do well into a reusable asset.",
  },
  "Strategic Partnerships": {
    stage: "LEGACY",
    whyItMatters: "The right partnerships extend your reach further than you can alone.",
    nextStep: "Identify one complementary business worth building a relationship with.",
  },
  Succession: {
    stage: "LEGACY",
    whyItMatters:
      "Without a succession or exit plan, the business's value is trapped with you.",
    nextStep: "Write down what you'd want to happen to the business in 10 years.",
  },
  Impact: {
    stage: "LEGACY",
    whyItMatters:
      "Impact beyond income is what makes a legacy — and what sustains motivation long-term.",
    nextStep: "Name one way your business creates impact beyond revenue.",
  },
  "Wealth and Long-Term Value": {
    stage: "LEGACY",
    whyItMatters:
      "A business run only for monthly income rarely becomes a long-term asset.",
    nextStep: "Define what long-term wealth or business value would look like for you.",
  },
};
