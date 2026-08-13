import type { SalesScriptType } from "@/generated/prisma/enums";

/**
 * SALES SCRIPT BUILDER (spec Prompt 10): "Generate/store." Matches Phase
 * 6's Document Generator precedent — a structured starter template, not
 * an AI call — so every script type always has something real to start
 * from with zero external dependency, then the member edits and saves
 * their own version.
 */
export const SCRIPT_TEMPLATES: Record<SalesScriptType, string> = {
  DISCOVERY_CALL: `Opening
Thanks for taking the time today, [Name]. Before I share anything about what we do, I'd love to understand your situation.

Questions to ask
- What's going on in your business right now that made you want to talk?
- What have you already tried?
- What would it mean for you if this were solved in the next 90 days?

Transition
Based on what you've shared, here's how I typically help businesses in your situation...

Close
Does it make sense to talk through next steps?`,
  SALES_CALL: `Opening
Recap what we learned on the discovery call and confirm it's still accurate.

Present the offer
- What it is
- What's included
- The outcome it produces

Handle questions
Pause here and ask: "What questions do you have so far?"

Close
"Based on everything we've talked about, I'd recommend we get started. Are you ready to move forward?"`,
  DM_RESPONSE: `Hey [Name]! Thanks so much for reaching out 🙌

Quick question so I can point you in the right direction — [one qualifying question].

[Once they answer] That makes sense. Here's what I'd suggest: [one-line recommendation]. Want me to send over the details?`,
  FOLLOW_UP: `Hi [Name], following up on our conversation from [date].

I know things get busy — just wanted to check in and see where your head's at with [the thing they were considering].

If now isn't the right time, no worries at all — just let me know and I'll follow up later. If you're ready, I'd love to get you started this week.`,
  OBJECTION_HANDLING: `"It's too expensive"
I understand — let's look at what it actually costs you to keep things as they are. [Reframe around cost of inaction.]

"I need to think about it"
Totally fair. What specifically would you want to think through? Sometimes I can answer it right now.

"I don't have time right now"
That's exactly why this exists — to give you back time. What would need to be true for this to feel doable?`,
  CLOSING: `Summarize the value
"So to recap, this gets you [outcome], and includes [key deliverables]."

Ask for the decision
"Does it make sense to move forward today?"

If yes
Confirm next steps in writing immediately.

If hesitant
"What's holding you back?" — then address that specific thing directly.`,
};
