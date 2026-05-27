# User Interviews

## Interview 1 — Ajay, Founder, AskAbhi Technologies
**Date:** 2026-05-25
**Role:** Founder & CEO
**Company stage:** Early-stage, active product development
**Duration:** ~15 minutes

### Background
Ajay runs multiple companies including AskAbhi Technologies, which builds 
wearable healthcare devices. The team is structured into 5 workstreams of 
3–4 members each, covering hardware, firmware, mobile, backend, and QA.

### What they currently use
The team was not yet on Claude Code. I walked Ajay through the pricing 
during our conversation — he was evaluating it for the first time.

### Key quotes
> "Each team needs their own working environment — I can't have them 
> sharing one account and blocking each other."

> "At this stage we're hiring a lot of interns, so the headcount keeps 
> changing. I don't want to be locked into a seat count that's wrong 
> in 3 months."

> "If the per-seat cost is low enough at Pro level, we'd start there 
> and move to Enterprise when we actually need the admin controls."

### Most surprising thing
I expected him to ask about features. Instead his first question was about 
account sharing — specifically whether one Claude Code Pro account could be 
used by multiple people on the same team. The seat-sharing assumption is 
common and it's exactly the kind of overspend CreditLens is designed to 
surface.

### What it changed
This made me realise the audit should flag shared-account risk explicitly — 
not just "you're on the wrong plan" but "if multiple people are sharing one 
seat, you're violating ToS and creating a single point of failure." I added 
a note to the audit engine backlog for this.

---

## Interview 2 — Jashwanth, Founder, Jaiva Technologies
**Date:** 2026-05-25
**Role:** Founder & CEO
**Company stage:** Early-stage, enterprise B2B AI automation
**Duration:** ~15 minutes

### Background
Jashwanth builds AI automation products for enterprise clients using a 
combination of custom code and tools like n8n. Teams span web development, 
drone technology, and AI workflow engineering.

### What they currently use
Multiple AI tools across projects — the conversation focused on how they'd 
structure Claude Code access as they scale intern hiring.

### Key quotes
> "We're planning to hire a lot of interns across web, drones, and AI. 
> The tool cost per intern matters more than the absolute plan price."

> "For now one account per team makes sense. But once we cross 15–20 
> people it becomes unmanageable without some kind of admin dashboard."

> "The enterprise plan only makes sense when you need SSO and audit logs. 
> We're not there yet — that's a compliance conversation, not a cost one."

### Most surprising thing
Jashwanth immediately distinguished between "cost decisions" and 
"compliance decisions" when evaluating enterprise vs Pro plans. Most 
founders conflate the two. His framing — that Enterprise is a compliance 
purchase, not a features purchase — was sharp and changed how I think 
about the audit engine's recommendation logic.

### What it changed
The audit engine now surfaces two separate signals for enterprise 
recommendations: (1) seat count threshold and (2) compliance need 
indicator. Previously it only looked at seat count. Jashwanth's framing 
made the distinction clear.

---

## Interview 3 — Karthik S, Aspiring Founder
**Date:** 2026-05-25
**Role:** Independent developer / pre-startup founder
**Company stage:** Pre-revenue, actively building
**Duration:** ~10 minutes

### Background
Karthik is building toward a startup and has been shipping products 
independently. Started entirely on free tiers — Windsurf and Antigravity 
— but recently upgraded to Claude Code and Cursor after hitting capability 
limits.

### What they currently use
- Claude Code (recently switched to paid)
- Cursor (recently switched to paid)
- Previously: Windsurf free tier, Antigravity free tier

### Key quotes
> "The free tools were fine until they weren't — you hit the limit right 
> when you're in the middle of something important."

> "I'm paying for both Cursor and Claude Code now. I didn't really think 
> about whether I need both or if one does what the other does."

> "I just want to build fast. I'll figure out the cost optimisation later 
> when I'm actually making money."

### Most surprising thing
Karthik is paying for two overlapping tools — Cursor and Claude Code — 
without realising their use cases significantly overlap for a solo 
developer. He'd never compared them side by side. This is exactly the 
"duplicate tool" audit rule CreditLens flags, and he was genuinely 
surprised when I showed him the potential savings.

### What it changed
Reinforced that the duplicate tool detection rule is the highest-value 
feature for solo developers and small teams. The insight isn't "you're 
on the wrong plan" — it's "you're paying twice for the same capability." 
I made sure this finding appears prominently in the results UI, not buried 
in the recommendations list.
