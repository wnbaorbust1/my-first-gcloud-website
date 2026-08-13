# Blueprint Master Spec

## Status: Living document — permanent project design standard

This file is the master specification for the Blueprint platform. Sections
in this document are **mandatory** and apply across the entire application
unless a future section explicitly overrides one.

---

## Blueprint Visual Experience Directive

**Scope:** Applies to the entire platform, especially the Quiz (Assessment)
and Member Dashboard.

**Status:** MANDATORY ACCEPTANCE CRITERIA for all future build phases,
including — but not limited to — the assessment, results screens,
dashboard, roadmap, Business Builder, and My Blueprint.

No phase of work should be considered complete if its screens do not meet
this directive. When a future prompt or phase conflicts with this
directive, this directive wins unless a person explicitly overrides it in
writing in this document.

Blueprint must be visually impressive, polished, premium, and easy to
understand. Do **not** build a plain SaaS dashboard consisting of white
rectangles, gray borders, and text-heavy forms. The experience should feel
intentionally designed around the Blueprint brand:

> **From Passion to Power to Legacy™**

The interface should immediately communicate progress, possibility,
confidence, and forward movement.

### 1. Overall Design Direction

Create a modern premium visual experience that feels like a blend of:

- High-end entrepreneurship platform
- Personal business planner
- Business coaching experience
- Interactive roadmap
- Modern fintech-style dashboard
- Premium lifestyle brand

The platform should feel professional enough for established entrepreneurs
while remaining approachable for someone building their first business.

**Avoid:**

- Generic admin dashboard appearance
- Excessive white boxes
- Dense text
- Tiny fonts
- Huge tables on member-facing screens
- Gray-on-gray layouts
- Overly corporate designs
- Cartoonish graphics
- Childlike gamification
- Cheap-looking gradients
- Excessive animations

### 2. Brand Color System

Use a cohesive Blueprint color system.

**Global**

- **Deep Navy** — primary professional foundation color.
- **Warm White / Cream** — main page backgrounds.
- **Gold** — premium accents, milestones, highlights, and achievement.

**Passion**
- Use: Pink / Magenta family
- Symbol: Heart
- Represents: Purpose, Vision, Clarity, Ideas, Identity

**Power**
- Use: Orange / Warm Gold family
- Symbol: Lightning Bolt
- Represents: Execution, Systems, Money, Marketing, Sales, Momentum

**Legacy**
- Use: Purple / Royal Purple family
- Symbol: Crown
- Represents: Leadership, Scale, Impact, Ownership, Long-term wealth, Legacy

### 3. Visual Hierarchy

Every screen should clearly communicate:

1. Where am I?
2. What matters most right now?
3. What should I do next?
4. How much progress have I made?

Avoid screens where every element has equal visual weight. Use:

- Large primary headings
- Short supportive copy
- Bold key metrics
- Progress bars
- Stage colors
- Icons
- Illustrations where useful
- Clear CTA buttons
- Generous spacing

### 4. Quiz Visual Experience

The Blueprint Assessment must feel like an experience, not a government
form. Do **not** display dozens of questions on one screen. Show one
primary question at a time.

**Quiz Welcome Screen**

Create an impressive opening screen. Display:

- Headline: **Discover Your Business Blueprint**
- Supporting copy: *Find out where your business stands today and what you
  should focus on next.*
- The three-stage journey shown visually: 💗 PASSION → ⚡ POWER → 👑 LEGACY
- CTA: **START MY BLUEPRINT**

Include:

- Estimated completion time
- Save-and-return note
- Brief explanation that results determine the recommended Blueprint Session

### 5. Quiz Progress Header

At the top of the assessment show:

- **BLUEPRINT ASSESSMENT**
- Question X of XX
- Progress percentage
- Visual progress bar
- Current section: PASSION, POWER, or LEGACY

The progress bar should change visually as the member moves through the
stages. Example: Passion section = Pink, Power = Orange/Gold, Legacy =
Purple.

### 6. Quiz Question Card

Each question should appear in a spacious, centered area. Use:

- Large readable question text
- Short helper text if necessary
- Large answer controls
- Generous spacing
- Strong selection state
- Previous / Continue buttons

Avoid tiny radio buttons. For 1–5 scale questions, create visual
selectable cards or large buttons, e.g.:

1. Not Started
2. Needs Work
3. Developing
4. Strong
5. Established

Selection should have a clear border, stage color, checkmark, and subtle
transition. Do not rely only on color.

### 7. Quiz Stage Transitions

When moving from Passion to Power, show a brief visual transition, e.g.:

> 💗 Passion Complete
> You've explored the clarity and purpose behind your business.
>
> Next: ⚡ Let's Look at Your Business Power
> Now we'll explore the systems that help turn your vision into results.
>
> Button: **CONTINUE TO POWER**

Do the same before Legacy. This gives the assessment emotional pacing.

### 8. Quiz Micro-Copy

Use short encouraging messages, e.g.:

- "You're making progress."
- "Great — let's keep going."
- "Your answers help personalize your Blueprint."
- "Almost there."

Avoid overly cheesy motivational statements.

### 9. Quiz Completion Screen

Before results, show:

- **Your Blueprint Is Ready**
- A short elegant completion animation or progress completion state
- CTA: **VIEW MY RESULTS**

### 10. Results Page Design

Results should feel valuable enough that the user wants to screenshot or
share them.

Top area: **YOUR BLUEPRINT RESULTS**

Display three large visual score cards, e.g.:

- 💗 PASSION — 78%
- ⚡ POWER — 51%
- 👑 LEGACY — 26%

Use visual progress rings or high-quality progress bars.

### 11. Current Stage Hero

Create a visually prominent card, e.g.:

> **YOUR CURRENT BLUEPRINT STAGE**
> ⚡ POWER
>
> You have clarity around what you're building. Your next focus is
> creating the systems that turn your vision into consistent execution.
>
> CTA: **VIEW MY RECOMMENDED SESSION**

### 12. Strengths + Opportunities

Use two visually distinct sections:

- **YOUR STRENGTHS** — check icons, short descriptions
- **YOUR NEXT OPPORTUNITIES** — roadmap/location icons, short descriptions

Avoid calling weaknesses "failures."

### 13. Session Recommendation Card

Make the recommended session look premium, e.g.:

> ⚡ **BLUEPRINT POWER SESSION** — Recommended for You

Include: what this session solves, 3 key outcomes, duration, next
available date. CTA: **RESERVE MY SEAT**

### 14. Dashboard Visual Experience

The Blueprint Builder Dashboard must **not** look like accounting
software. It should feel like: *"My business command center."*

### 15. Dashboard Hero Area

Top area:

- "Good Morning, [First Name]"
- Small supporting line: "Let's keep building [Business Name]."
- CURRENT STAGE: ⚡ POWER
- Blueprint Health: 62%
- 90-Day Goal: "Launch My Consulting Offer"

### 16. Next Best Move Card

This should be visually dominant — a large premium card. Header:
**YOUR NEXT BEST MOVE**, e.g.:

> Finalize Your Pricing Strategy
> Estimated Time: 15 minutes
> Impact: HIGH
> Why This Matters: Your pricing determines how much revenue each sale
> contributes toward your goal.
>
> CTA: **START BUILDING**

This should be the first thing the user's eye sees after the dashboard
header.

### 17. Passion / Power / Legacy Progress

Create three attractive stage panels, each with icon, stage name,
percentage, status label, and progress bar (e.g. 💗 Passion 82% "Foundation
Strong", ⚡ Power 56% "Building Systems", 👑 Legacy 21% "Coming Next"). The
stage cards should feel connected as a journey. Desktop: may display
horizontally. Mobile: stack vertically.

### 18. Visual Blueprint Roadmap

Create an interactive roadmap rather than a plain task list, e.g.:

```
START
 ↓
✅ Define Purpose
 ↓
✅ Ideal Customer
 ↓
🟡 Core Offer
 ↓
⬜ Pricing
 ↓
🔒 Marketing Plan
 ↓
🔒 Sales System
```

Use checkmarks, progress lines, stage colors, lock icons, and a
current-step highlight. Keep it clean and professional.

### 19. Today's Blueprint

Display three visually distinct action tiers: **MUST DO** (highest
priority), **SHOULD DO** (secondary priority), **BONUS** (optional). Each
task should show an icon, task name, estimated time, stage, and CTA.

### 20. Progress Story

Instead of showing only statistics, visually communicate the member's
journey, e.g.:

> **LOOK HOW FAR YOU'VE COME**
> Started: Power 41% → Today: Power 63% (+22% Growth)
>
> 5 tasks completed · 2 systems built · 1 major milestone reached

### 21. Milestone Design

Milestones should look premium — gold accent, crown, badge, subtle
celebration animation. Examples: "CORE OFFER COMPLETE," "FIRST SOP
CREATED," "BUSINESS FOUNDATION BUILT," "CEO MODE," "LEGACY BUILDER." Avoid
childish trophies or game graphics.

### 22. My Blueprint Visual Design

My Blueprint should resemble a beautifully organized digital business
binder. Use left navigation or tabs: Overview, Passion, Power, Legacy,
Documents. Each section can contain elegant structured content blocks.
Avoid presenting the entire Business Blueprint as one giant text page.

### 23. Builder Activities

Each Builder activity should feel like an interactive workbook, e.g.:

- Left/Top: lesson title, progress, why this matters
- Center: question or activity
- Right/Below: tips, example, "Ask Blueprint AI"

Use responsive behavior so it works well on mobile.

### 24. Blueprint AI Visual Style

Blueprint AI should feel integrated into the platform — not like an
unrelated generic chatbot. Use Blueprint branding, business context
indicators, and suggested-action buttons such as "Help Me Answer," "Give
Me an Example," "Improve My Answer," "Build This With Me."

### 25. Empty States

Never leave empty blank screens. Instead of "NO GOALS FOUND," show:

> **Your Next Goal Starts Here**
> Set a 90-day goal so Blueprint can personalize your next actions.
>
> CTA: **CREATE MY FIRST GOAL**

### 26. Mobile Visual Design

Design mobile intentionally — do not simply shrink desktop. On mobile,
prioritize in this order: (1) Next Best Move, (2) Today's Blueprint, (3)
Progress, (4) Roadmap, (5) AI. Use large touch targets. Avoid horizontal
scrolling.

### 27. Responsive Dashboard

- Desktop: spacious 12-column layout
- Tablet: simplified 2-column layout
- Mobile: one-column priority layout

### 28. Icon Style

Use one consistent icon library. Preferred visual concepts: Heart,
Lightning, Crown, Map, Compass, Target, Check, Calendar, Rocket, Document,
Briefcase, Graph, Spark. Avoid mixing several icon styles.

### 29. Animation

Use subtle motion only where it adds meaning: progress bar filling, task
completion, stage transition, milestone achievement, hover effects. Avoid
constant movement, auto-playing animation everywhere, and excessive
bouncing.

### 30. Visual Accessibility

Color should **not** be the only indicator. Always pair stage colors with
icons, labels, and text. Ensure accessible contrast. Support keyboard
navigation. Use readable font sizes.

### 31. Typography

Use a clean, modern sans-serif for interface copy. Optionally use an
elegant display/serif font sparingly for the Blueprint title, major
marketing headings, and Legacy messaging. Do not use decorative fonts for
normal dashboard copy.

### 32. Visual Quality Check

Before considering any quiz or dashboard screen complete, compare it
against this checklist:

- Does it look premium?
- Is the next action obvious?
- Is there enough white space?
- Are the stage colors used intentionally?
- Can someone understand the page within 5 seconds?
- Are the important numbers visually prominent?
- Does it feel like Blueprint rather than a generic SaaS template?
- Does mobile look intentionally designed?
- Would a user want to return to this dashboard?

If the answer to any of these is no, improve the screen before marking it
complete.

### Final Design Standard

Blueprint should visually communicate:

- "I KNOW WHERE I AM."
- "I KNOW WHAT I NEED TO DO NEXT."
- "I CAN SEE MY BUSINESS GROWING."

The product should feel beautiful enough to inspire users to return, but
simple enough that the visual design never becomes more important than
taking action.

---

## Personalized Vision Board & Blueprint Generator

**Status:** Approved feature requirements — audited 2026-08-13, not yet
implemented. See `BUILD_STATUS.md` for the audit and phased plan. This
section is **mandatory acceptance criteria** for that build, same standing
as the Visual Experience Directive above.

### Board Sections

The board must present exactly these twelve sections, populated from real
member data — never fabricated placeholder content:

1. My Story
2. My Why
3. My Blueprint
4. My Resources
5. Action Plan
6. Legacy
7. Accountability
8. My Big Goals
9. Passion Assessment
10. Business Model Canvas
11. 90-Day Goal Tracker
12. Daily Affirmations

A section with no real data behind it yet must render an honest empty
state (consistent with the rest of this app's convention — see `BUILD_STATUS.md`'s
"never fabricate" pattern), never invented text.

### Rendering Constraint

The board **must** use a fixed, responsive HTML/CSS template — not an
AI-generated image. The template owns layout, typography, and branding.
The AI's role is limited to generating **structured recommendations
returned as validated JSON**; the application places that JSON into the
branded template. AI output that fails schema validation must never reach
the template unmodified.

### Access Rules

- **Assessment completion** unlocks a limited results page and a
  vision-board **preview** only.
- The **full** vision board — editing, downloads, the roadmap, and the
  dashboard — remains locked until a qualifying **$150 Blueprint Session**
  is marked completed.
- Session completion includes the first dashboard month free.
- Continued access after that is **$9.99/month or $100/year** (unchanged
  from the existing Membership pricing — see `src/lib/billing/pricing.ts`).

### Scoring Rules (existing behavior, ratified — no change)

- Passion, Power, and Legacy scores: 0–100%.
- Overall Business Health Score: 0–100%.
- Passion below its threshold (default 65%) → recommend **Passion**.
- Passion at/above threshold and Power below its threshold → recommend
  **Power**.
- Passion and Power at/above threshold and Legacy below its threshold →
  recommend **Legacy**.
- All three at/above threshold → **Strategic Growth/Legacy** (existing
  "GROWTH" recommendation type), unless the weakest of the three is still
  below the excellence threshold (default 85%), in which case recommend
  that weakest stage instead.
- Thresholds **must remain configurable** (already true — stored in the
  `AssessmentScoringConfig` database row, not code, editable via the
  existing admin scoring-thresholds UI).
