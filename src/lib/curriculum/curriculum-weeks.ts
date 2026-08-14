import type { ActionSize, BlueprintStage } from "@/generated/prisma/enums";

export interface DailyActionSeed {
  dayNumber: number;
  title: string;
  description: string;
  size: ActionSize;
}

export interface CurriculumWeekSeed {
  weekNumber: number;
  stage: BlueprintStage;
  topic: string;
  requiredAsset: string;
  lesson: string;
  whyItMatters: string;
  completedExample: string;
  weeklyReviewPrompt: string;
  actions: DailyActionSeed[];
}

const day = (
  dayNumber: number,
  title: string,
  description: string,
  size: ActionSize,
): DailyActionSeed => ({ dayNumber, title, description, size });

/**
 * The Passion-sprint curriculum (BLUEPRINT_MASTER_SPEC_CLAUDE_CODE.md §5's
 * 52-week map, rows 1-13 — this pilot phase's scope). Each week follows
 * the spec's required shape: "a concise lesson, why it matters, a
 * completed example, five daily actions... a required asset, a weekly
 * review, proof of completion, points, and a next-week preview." Points
 * and proof-of-completion are handled by the engine
 * (src/lib/curriculum/curriculum.ts), not stored per-week here; the
 * "next-week preview" is simply the next row in this array, surfaced by
 * the UI.
 *
 * "Wrap, don't replace": where a week's required asset overlaps with an
 * existing Business Builder task (weeks 2, 6, 7, 10, 11, 12), the lesson
 * text says so explicitly and points the member back to that task instead
 * of asking them to redo the same thinking from scratch.
 */
export const CURRICULUM_WEEKS: CurriculumWeekSeed[] = [
  {
    weekNumber: 1,
    stage: "PASSION",
    topic: "Entrepreneurial mindset",
    requiredAsset: "Founder Mindset Agreement",
    lesson:
      "Starting a business is less about having the perfect idea and more about building the habits that carry you through the weeks when nothing feels certain. This week is about naming those habits on purpose, before you need them, so they're already in place when things get hard.",
    whyItMatters:
      "Most founders don't quit because their idea was bad — they quit because they hit a normal hard week without a plan for how to keep going. Deciding your mindset now, while things are calm, means you don't have to invent your resilience under pressure.",
    completedExample:
      "\"I will treat setbacks as information, not verdicts. I will take one action every business day, even a 5-minute one, on the weeks I don't feel motivated. I will ask for help before I quit, not after. I will protect Sunday evenings for a 15-minute plan of the week ahead.\"",
    weeklyReviewPrompt:
      "Which of your mindset agreements will be hardest to keep on a bad week — and who or what will you lean on when that happens?",
    actions: [
      day(
        1,
        "Name your 'why I'm starting'",
        "In your own words, write 2-3 sentences on why you're doing this now, not someday. Keep it plain — no polish needed yet.",
        "QUICK",
      ),
      day(
        2,
        "List 3 past hard things you got through",
        "Think of 3 difficult situations (business or not) you've already gotten through. Write what got you through each one.",
        "STANDARD",
      ),
      day(
        3,
        "Write your Founder Mindset Agreement",
        "Using today's lesson, write 3-5 short commitments to yourself for how you'll show up on hard weeks. Keep each one to one sentence.",
        "STANDARD",
      ),
      day(
        4,
        "Identify your support person",
        "Name one person (or a coach, community, or facilitator) you'll actually reach out to when you're stuck — and how you'll reach them.",
        "QUICK",
      ),
      day(
        5,
        "Set your minimum weekly action",
        "Decide the smallest action you'll commit to on your lowest-energy weeks (e.g. '15 minutes, one task'). Write it down where you'll see it.",
        "QUICK",
      ),
    ],
  },
  {
    weekNumber: 2,
    stage: "PASSION",
    topic: "Story and WHY",
    requiredAsset: "Founder Story and WHY Statement",
    lesson:
      "Your story is the reason people will trust you before they've bought anything. This week you'll turn your personal history into a short, honest story that explains why you're the right person to build this.",
    whyItMatters:
      "Customers, partners, and lenders all buy the founder before they buy the offer. A clear story removes the awkward 'so why should I care' moment and replaces it with 'oh, that makes sense.'\n\nIf you've already completed \"Define Business Purpose\" or \"Create Mission Statement\" in Business Builder, this week builds directly on that work — bring it with you instead of starting over.",
    completedExample:
      "\"I spent 8 years managing logistics for a shipping company, watching small business owners get crushed by contracts they didn't understand. I started this consulting practice because I know exactly what that confusion costs — in money and in sleep — and I know how to fix it.\"",
    weeklyReviewPrompt:
      "Read your WHY statement out loud. Does it sound like you, or like a brochure? What would you change to make it sound more like you?",
    actions: [
      day(
        1,
        "Timeline your path here",
        "List 5-8 moments (jobs, experiences, turning points) that led you to this business idea, in order.",
        "STANDARD",
      ),
      day(
        2,
        "Find the thread",
        "Look at yesterday's timeline. Circle the 2-3 moments that most directly explain why you care about this. What connects them?",
        "QUICK",
      ),
      day(
        3,
        "Draft your story, out loud first",
        "Say your story out loud to yourself or record it, then write down what you said. Don't polish yet — just get it out.",
        "STANDARD",
      ),
      day(
        4,
        "Write your WHY statement",
        "In 2-3 sentences: why does this business matter to you, specifically, more than it would to someone else?",
        "QUICK",
      ),
      day(
        5,
        "Tighten it to 30 seconds",
        "Edit your story and WHY statement down to something you could say out loud in about 30 seconds.",
        "STANDARD",
      ),
    ],
  },
  {
    weekNumber: 3,
    stage: "PASSION",
    topic: "Strengths, skills, and experience",
    requiredAsset: "Founder Strengths Map",
    lesson:
      "You already have real, usable skills — from jobs, hobbies, volunteering, and just living life. This week is about mapping them out so you can see, in one place, what you're actually bringing to this business.",
    whyItMatters:
      "It's easy to discount your own experience because it wasn't labeled 'entrepreneurship.' A strengths map makes your real assets visible, so your business idea builds on what you're already good at instead of starting from zero.",
    completedExample:
      "Hard skills: bookkeeping, public speaking, basic design (Canva). Soft skills: calming down upset customers, staying organized under pressure. Experience: 5 years running a school fundraiser, 3 years as a shift supervisor. Gaps: never built a website, unsure about pricing.",
    weeklyReviewPrompt:
      "Looking at your full strengths map, what's the one skill you have that most people starting a business like yours wouldn't have?",
    actions: [
      day(
        1,
        "List your hard skills",
        "List every practical skill you have — things you were trained on, taught, or learned on the job. No skill is too small to list.",
        "STANDARD",
      ),
      day(
        2,
        "List your soft skills",
        "List the people/character skills you rely on — things like patience, organizing, persuading, calming people down, teaching.",
        "QUICK",
      ),
      day(
        3,
        "List your relevant experience",
        "List jobs, volunteer roles, or life situations that gave you experience relevant to this business, even indirectly.",
        "STANDARD",
      ),
      day(
        4,
        "Name your honest gaps",
        "List 2-3 things you don't know how to do yet that this business will need. Naming a gap isn't a failure — it's a plan.",
        "QUICK",
      ),
      day(
        5,
        "Build your Founder Strengths Map",
        "Pull the last 4 days together into one page: hard skills, soft skills, experience, and gaps to plan around.",
        "STANDARD",
      ),
    ],
  },
  {
    weekNumber: 4,
    stage: "PASSION",
    topic: "Lifestyle and business fit",
    requiredAsset: "Business Fit Profile",
    lesson:
      "A great business idea that doesn't fit your actual life — your hours, energy, money, and responsibilities — will struggle no matter how good it is. This week is about being honest about what fits.",
    whyItMatters:
      "Founders often design a business for the life they wish they had, not the one they're actually living. Matching the business to your real constraints now prevents burnout and false starts later.",
    completedExample:
      "Available hours: 12-15 per week, mostly evenings and Saturday mornings. Startup budget: $500. Risk tolerance: low — I need this to stay part-time until it consistently covers costs. Non-negotiables: home by 6pm for my kids, no debt.",
    weeklyReviewPrompt:
      "Where does your business idea currently NOT fit your real life — and what's one adjustment that would close that gap?",
    actions: [
      day(
        1,
        "Map your real available hours",
        "Write out a typical week and mark the actual hours you could realistically give to this business — be honest, not aspirational.",
        "STANDARD",
      ),
      day(
        2,
        "Name your money reality",
        "Write your realistic startup budget and how much income pressure you're under (do you need this to replace income soon, or can it grow slowly?).",
        "QUICK",
      ),
      day(
        3,
        "Name your non-negotiables",
        "List the parts of your life you won't sacrifice for this business (family time, health, other commitments).",
        "QUICK",
      ),
      day(
        4,
        "Check your risk tolerance",
        "Write a few sentences on how much risk (financial, time, reputation) you're actually comfortable taking on right now.",
        "QUICK",
      ),
      day(
        5,
        "Build your Business Fit Profile",
        "Combine your hours, money reality, non-negotiables, and risk tolerance into one page you'll check future decisions against.",
        "STANDARD",
      ),
    ],
  },
  {
    weekNumber: 5,
    stage: "PASSION",
    topic: "Business-idea discovery",
    requiredAsset: "Top Three Business Ideas",
    lesson:
      "This week you'll generate more ideas than you need, then narrow to your strongest three — using your strengths map and business fit profile from the last two weeks as your filter, not just gut feeling.",
    whyItMatters:
      "Picking the first idea that comes to mind skips real comparison. Generating several options and filtering them against what you're actually good at and what fits your life gives you a much stronger starting point.",
    completedExample:
      "Idea 1: Bookkeeping for local salons (fits skills + low startup cost). Idea 2: Online course on fundraising for schools (fits experience, but slow to build). Idea 3: Errand/organizing service for busy parents (fits hours, but lower ceiling). Top pick to pursue: Idea 1.",
    weeklyReviewPrompt:
      "Of your top three ideas, which one do you feel the least resistance to starting on Monday morning — and what does that tell you?",
    actions: [
      day(
        1,
        "Brainstorm without filtering",
        "List 10 possible business ideas, even ones that seem unlikely. Don't judge them yet — quantity over quality today.",
        "STANDARD",
      ),
      day(
        2,
        "Score each idea against your strengths",
        "Go through your list from yesterday and mark which ideas use skills from your Founder Strengths Map (week 3).",
        "QUICK",
      ),
      day(
        3,
        "Score each idea against your life fit",
        "Check your remaining ideas against your Business Fit Profile (week 4) — hours, budget, risk tolerance.",
        "QUICK",
      ),
      day(
        4,
        "Narrow to your top 3",
        "Pick the 3 ideas that scored best on both strengths and fit. Write one sentence on why each made the cut.",
        "STANDARD",
      ),
      day(
        5,
        "Rank your Top Three Business Ideas",
        "Put your top 3 in order of which you'd pursue first, second, and third, with a short reason for the ranking.",
        "QUICK",
      ),
    ],
  },
  {
    weekNumber: 6,
    stage: "PASSION",
    topic: "Choosing the problem",
    requiredAsset: "Customer Problem Statement",
    lesson:
      "Every strong business solves a real, specific problem for a specific person. This week you'll take your top idea and get precise about the exact problem it solves — not a vague category, but a real pain someone has right now.",
    whyItMatters:
      "\"People need better organization\" doesn't sell. \"Busy parents lose an hour a week hunting for permission slips\" does. A sharp problem statement makes every future decision — offer, pricing, marketing — easier.\n\nIf you completed \"Identify Customer Pain Points\" in Business Builder, this is the same muscle, applied to the idea you just picked — pull that work forward rather than starting blank.",
    completedExample:
      "Problem: Independent salon owners spend 3-5 hours a week on bookkeeping they dread and often get wrong, leading to tax-season panic and missed deductions. It costs them time they'd rather spend with clients, and real money in errors and stress.",
    weeklyReviewPrompt:
      "Say your problem statement to someone outside your industry. Did they understand it immediately, or did you have to explain?",
    actions: [
      day(
        1,
        "Pick your idea to move forward with",
        "From your Top Three (week 5), commit to the one idea you'll develop through the rest of this sprint. Write why.",
        "QUICK",
      ),
      day(
        2,
        "List every problem it could solve",
        "Brainstorm every problem or frustration this idea could address — even ones you're not sure matter yet.",
        "STANDARD",
      ),
      day(
        3,
        "Pick the sharpest one",
        "Choose the single problem from yesterday's list that feels most specific, most painful, and most solvable by you.",
        "QUICK",
      ),
      day(
        4,
        "Describe the cost of the problem",
        "Write what this problem actually costs the person who has it — time, money, stress, missed opportunity.",
        "STANDARD",
      ),
      day(
        5,
        "Write your Customer Problem Statement",
        "In 2-3 sentences: who has this problem, what is it exactly, and what does it cost them?",
        "QUICK",
      ),
    ],
  },
  {
    weekNumber: 7,
    stage: "PASSION",
    topic: "Identifying the audience",
    requiredAsset: "Ideal Customer Profile",
    lesson:
      "Now that you know the problem, this week is about getting specific on exactly who has it. A profile that fits everyone fits no one — the sharper the picture, the easier it is to find and talk to real people.",
    whyItMatters:
      "Marketing to \"everyone\" is marketing to no one — your words, images, and offer can't resonate with a vague audience. A specific profile means your next moves (research, messaging, offer) can be built for a real person, not a guess.\n\nThis is the same work as \"Define Ideal Customer\" in Business Builder if you've done it — bring that answer here and sharpen it against the problem you named this week.",
    completedExample:
      "Maria, 34, owns a one-chair salon, runs it solo, works 50+ hours a week. Not a numbers person — went into hair, not accounting. Does her books at 11pm on a laptop at her kitchen table, dreading it. Wants it handled so she can stop thinking about it.",
    weeklyReviewPrompt:
      "If you talked to 3 real people who match this profile this week, what's the one question you'd most want to ask them?",
    actions: [
      day(
        1,
        "Describe them as a real person",
        "Give your ideal customer a name and describe their situation — age range, role, day-to-day life — as if describing a real person you know.",
        "STANDARD",
      ),
      day(
        2,
        "Describe their situation right before they need you",
        "What's happening in their life or business in the moment right before this problem becomes urgent for them?",
        "QUICK",
      ),
      day(
        3,
        "Describe what they've tried already",
        "How is this person dealing with the problem today, without your help? What have they already tried?",
        "STANDARD",
      ),
      day(
        4,
        "Describe what they actually want",
        "Beyond the problem being solved, what outcome or feeling is this person actually chasing?",
        "QUICK",
      ),
      day(
        5,
        "Write your Ideal Customer Profile",
        "Combine the last 4 days into one profile: who they are, their situation, what they've tried, and what they want.",
        "STANDARD",
      ),
    ],
  },
  {
    weekNumber: 8,
    stage: "PASSION",
    topic: "Market and competitor research",
    requiredAsset: "Competitor and Market Gap Report",
    lesson:
      "Competition isn't a bad sign — it's proof people already pay to solve this problem. This week you'll look honestly at who else solves it, and find the gap where you can be genuinely different or better.",
    whyItMatters:
      "Skipping competitor research usually means finding out the hard way, after launch, what everyone else already offers. A little research now saves you from repeating what's already out there or missing what customers actually compare you to.",
    completedExample:
      "Competitor 1: local bookkeeper, $400/mo, slow to respond. Competitor 2: national app (QuickBooks self-serve) — cheap but customers still have to do the work themselves. Gap: nobody offers a done-for-you, salon-specific service at a solo-owner price point with fast turnaround.",
    weeklyReviewPrompt:
      "What's the one gap in the market you found that you're most confident you can actually fill — and why you, specifically?",
    actions: [
      day(
        1,
        "List 3-5 direct competitors",
        "Find and list businesses that solve the same problem for the same audience, even loosely. Note their price if visible.",
        "STANDARD",
      ),
      day(
        2,
        "List indirect alternatives",
        "List the other ways your ideal customer solves this today — DIY, a different tool, doing nothing. These compete for attention too.",
        "QUICK",
      ),
      day(
        3,
        "Note what competitors do well",
        "For your top 2-3 competitors, write what they seem to genuinely do well — be fair, not dismissive.",
        "QUICK",
      ),
      day(
        4,
        "Note what's missing",
        "For the same competitors, write what customers seem to complain about or what's clearly missing from their offer.",
        "STANDARD",
      ),
      day(
        5,
        "Write your Competitor and Market Gap Report",
        "Summarize who else is out there, what they do well, and the specific gap you're positioned to fill.",
        "STANDARD",
      ),
    ],
  },
  {
    weekNumber: 9,
    stage: "PASSION",
    topic: "Idea validation",
    requiredAsset: "Validation Evidence Report",
    lesson:
      "Before you build anything, this week is about testing your idea against real people — not friends and family being polite, but honest signals that this problem and this solution are real to someone other than you.",
    whyItMatters:
      "It's far cheaper to find out now that an assumption was wrong than after you've built an offer around it. Real evidence, even a small amount, is worth more than confidence alone.",
    completedExample:
      "Talked to 5 salon owners. 4 of 5 said bookkeeping was a top-3 stress point. 3 said they'd pay $150-250/mo for it to just be handled. 1 said they already had a system they liked. Evidence: real demand exists at roughly the price point I expected.",
    weeklyReviewPrompt:
      "What did you learn this week that you didn't expect — and does it change anything about your idea, problem, or audience?",
    actions: [
      day(
        1,
        "Write your validation questions",
        "Write 3-5 honest, open-ended questions to ask real people who match your Ideal Customer Profile — not leading questions.",
        "QUICK",
      ),
      day(
        2,
        "Talk to 2-3 real people",
        "Have real conversations (in person, call, or message) with 2-3 people who match your ideal customer. Take notes on their actual words.",
        "POWER",
      ),
      day(
        3,
        "Talk to 2-3 more people",
        "Continue conversations with 2-3 more people. Aim for at least 5 total real conversations by the end of today.",
        "POWER",
      ),
      day(
        4,
        "Look for patterns",
        "Review your notes from all conversations. What came up more than once? What surprised you?",
        "STANDARD",
      ),
      day(
        5,
        "Write your Validation Evidence Report",
        "Summarize who you talked to, what you asked, what you heard, and whether the evidence supports moving forward.",
        "STANDARD",
      ),
    ],
  },
  {
    weekNumber: 10,
    stage: "PASSION",
    topic: "Minimum viable offer",
    requiredAsset: "MVP Offer Sheet",
    lesson:
      "This week you'll shrink your idea down to the smallest real version you could sell right now — not the full vision, just the first honest offer that solves the core problem for your first customers.",
    whyItMatters:
      "Waiting until an offer feels 'ready' usually means waiting forever. A minimum viable offer gets you real customers and real feedback fast, so the full version gets built around what actually works.\n\nIf you completed \"Define Core Offer\" in Business Builder, use that work as your starting draft here — this week is about trimming it to its smallest sellable form, not rewriting it from scratch.",
    completedExample:
      "MVP Offer: \"Monthly Bookkeeping for Salons\" — I categorize your transactions and send you a clean monthly summary, done-for-you, delivered by the 5th of each month. $175/mo, first 3 clients only, month-to-month, no contract, cancel anytime.",
    weeklyReviewPrompt:
      "If you had to sell this offer to one real person tomorrow, what part of it still makes you nervous — and what's the smallest fix for that?",
    actions: [
      day(
        1,
        "List every feature you're imagining",
        "Write down everything you picture this business eventually offering, even the ambitious future stuff.",
        "QUICK",
      ),
      day(
        2,
        "Circle the core, cut the rest",
        "From yesterday's list, circle only what's needed to solve the core problem for a first customer. Everything else waits.",
        "STANDARD",
      ),
      day(
        3,
        "Decide what you deliver and how",
        "Describe exactly what the customer receives, how, and how often — be concrete, not vague.",
        "STANDARD",
      ),
      day(
        4,
        "Set a starting price",
        "Set a real starting price for this MVP version, based on what you learned in week 9's validation conversations.",
        "QUICK",
      ),
      day(
        5,
        "Write your MVP Offer Sheet",
        "Combine what you deliver, how, and at what price into one clear offer sheet you could show a real customer.",
        "STANDARD",
      ),
    ],
  },
  {
    weekNumber: 11,
    stage: "PASSION",
    topic: "Business message",
    requiredAsset: "Elevator Pitch and Short Bio",
    lesson:
      "This week you'll turn everything you've built so far — your why, your customer, your offer — into words you can actually say out loud: a short pitch and a short bio you're not embarrassed to share.",
    whyItMatters:
      "You'll be asked \"so what do you do?\" constantly — at networking events, in DMs, on forms. Having a clear, practiced answer ready means you never fumble the one moment that could turn into your next customer or referral.\n\nThis draws directly on \"Create Elevator Pitch\" and \"Create Value Proposition\" in Business Builder if you've completed them — pull that language forward and tighten it here.",
    completedExample:
      "Pitch: \"I do done-for-you monthly bookkeeping for solo salon owners, so they stop dreading their books and start trusting their numbers.\" Bio: \"Maria helps salon owners like you get their books handled — no jargon, no dread, just clean numbers every month.\"",
    weeklyReviewPrompt:
      "Say your pitch out loud to someone outside your industry. Did they get it without follow-up questions — or did you have to explain?",
    actions: [
      day(
        1,
        "Draft your elevator pitch",
        "Using your problem, audience, and offer, write a 2-3 sentence pitch you could say out loud in 15 seconds.",
        "STANDARD",
      ),
      day(
        2,
        "Practice it out loud",
        "Say your pitch out loud 5 times. Notice which words feel awkward and adjust them.",
        "QUICK",
      ),
      day(
        3,
        "Draft your short bio",
        "Write a 2-3 sentence bio, third person, that you could use on a website, LinkedIn, or a flyer.",
        "STANDARD",
      ),
      day(
        4,
        "Test it on someone",
        "Read your pitch and bio to one real person outside your industry. Ask what they understood — and what confused them.",
        "QUICK",
      ),
      day(
        5,
        "Finalize your Elevator Pitch and Short Bio",
        "Revise both based on yesterday's feedback and save your final versions.",
        "QUICK",
      ),
    ],
  },
  {
    weekNumber: 12,
    stage: "PASSION",
    topic: "One-year vision",
    requiredAsset: "Goals and Personalized Vision Board",
    lesson:
      "This week you'll zoom out from the day-to-day building and set a real one-year vision — what you want this business, and your life alongside it, to look like a year from now.",
    whyItMatters:
      "Without a destination, it's easy to stay busy without moving anywhere in particular. A one-year vision gives you something to measure decisions against, and something to look back at in 12 months to see how far you've come.\n\nThis is the same work as \"Create Vision Statement\" and \"Set 12-Month Goals\" in Business Builder if you've done them — and it feeds directly into your Vision Board (My Blueprint), the same board this app already builds for you.",
    completedExample:
      "In 12 months: 15 steady monthly clients at $175-225/mo, $2,500+/month recurring revenue, books handled in under 10 hours a week, and I've stopped doing client work at 11pm. Personal: still home for dinner most nights, savings cushion rebuilt.",
    weeklyReviewPrompt:
      "Of everything in your one-year vision, what's the one milestone that — if you hit it — would make the whole year feel worth it?",
    actions: [
      day(
        1,
        "Picture a good year from now",
        "Write freely for a few minutes: if this year goes well, what does your business and your life look like 12 months from today?",
        "STANDARD",
      ),
      day(
        2,
        "Set a revenue or growth goal",
        "Pick one specific, measurable number goal for the next 12 months (revenue, clients, hours worked — whatever matters most to you).",
        "QUICK",
      ),
      day(
        3,
        "Set a personal goal alongside it",
        "Set one personal goal that matters to you as much as the business goal — health, time, family, whatever's true for you.",
        "QUICK",
      ),
      day(
        4,
        "Break the year into quarters",
        "Sketch roughly what needs to be true by the end of quarter 1, 2, and 3 to be on track for your one-year goal.",
        "STANDARD",
      ),
      day(
        5,
        "Save your Goals and update your Vision Board",
        "Enter your one-year goal(s) into Goals and update your My Blueprint Vision Board with this week's vision.",
        "STANDARD",
      ),
    ],
  },
  {
    weekNumber: 13,
    stage: "PASSION",
    topic: "Passion review",
    requiredAsset: "Reassessment and Foundations Certificate",
    lesson:
      "You've built real foundations over the last 12 weeks — mindset, story, strengths, customer, offer, message, and vision. This week is about pausing to see how far you've actually come before moving into Power.",
    whyItMatters:
      "Momentum needs proof, not just motivation. Looking back honestly at 12 weeks of real work — not just remembering it vaguely — is what makes the next stretch feel earned instead of endless.",
    completedExample:
      "12 weeks ago I had an idea and no evidence. Now I have a validated problem, a real customer profile, an MVP offer with a price, a pitch I can say without stumbling, and a one-year goal. Confidence: went from unsure I could do this, to knowing I already am.",
    weeklyReviewPrompt:
      "Looking back at week 1's Founder Mindset Agreement, which commitment did you actually keep — and which one needs to change going into Power?",
    actions: [
      day(
        1,
        "Reread everything you've built",
        "Go back through your Founder Mindset Agreement, WHY statement, Strengths Map, and Business Fit Profile. Notice what still feels true.",
        "STANDARD",
      ),
      day(
        2,
        "Reread your customer and offer work",
        "Reread your Customer Problem Statement, Ideal Customer Profile, and MVP Offer Sheet. Note anything you'd sharpen now.",
        "STANDARD",
      ),
      day(
        3,
        "Retake your assessment",
        "Retake the Passion assessment to see how your real, current answers compare to where you started 12 weeks ago.",
        "STANDARD",
      ),
      day(
        4,
        "Write your 12-week reflection",
        "In a few sentences: what changed the most for you over these 12 weeks — in your business, and in how you see yourself as a founder?",
        "QUICK",
      ),
      day(
        5,
        "Complete your Passion Foundations review",
        "Confirm your Reassessment is submitted and your foundations are complete — you're ready to move into Power.",
        "QUICK",
      ),
    ],
  },
];
