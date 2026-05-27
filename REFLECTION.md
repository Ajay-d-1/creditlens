# Reflection

## 1. What was the hardest technical challenge and how did you solve it?

The deduplication logic in the audit engine was tricky. When a user had Cursor Business with 2 seats, both "minimum seat waste" and "plan overkill" rules fired, creating duplicates. I used a Map to keep only the highest-savings finding per tool. This taught me that edge cases in "simple" business logic hide the most bugs.

## 2. What would you do differently if you had another week?

I'd add real-time pricing scraping instead of hardcoded data. Prices change frequently (Cursor updated mid-project), and manual verification doesn't scale. I'd also invest more in AI summary prompt engineering — the current prompt is basic and could be more personalized.

## 3. What was your biggest product insight from user interviews?

The most valuable insight came from Jashwanth (Jaiva Technologies) who 
immediately reframed Enterprise plans as "compliance purchases, not 
feature purchases." Most founders conflate cost and compliance when 
evaluating tiers — they upgrade to Enterprise because it sounds more 
serious, not because they actually need SSO or audit logs. This 
reframing changed the audit engine's enterprise recommendation logic: 
it now surfaces two separate signals — seat count threshold AND 
compliance need — instead of just seat count. The second insight from 
Karthik was that duplicate tool detection is the highest-value finding 
for solo developers. He was paying for both Cursor and Claude Code 
without realising the overlap. The "you're paying twice" framing 
resonates more than any downgrade recommendation.
## 4. How did you decide when to use AI vs. hardcoded rules?

The brief required hardcoded rules for audit math — correct call. Pricing logic must be deterministic and explainable. I used AI only for summary generation, where creativity matters more than precision.

## 5. What does "production-ready" mean for this project?

(1) Audit math is verifiably correct, (2) user data is secure, (3) app degrades gracefully when APIs fail, (4) fast enough that users don't bounce, (5) enough documentation for another developer to onboard in 30 minutes.
