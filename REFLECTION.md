# Reflection

## 1. What was the hardest technical challenge and how did you solve it?

The deduplication logic in the audit engine was tricky. When a user had Cursor Business with 2 seats, both "minimum seat waste" and "plan overkill" rules fired, creating duplicates. I used a Map to keep only the highest-savings finding per tool. This taught me that edge cases in "simple" business logic hide the most bugs.

## 2. What would you do differently if you had another week?

I'd add real-time pricing scraping instead of hardcoded data. Prices change frequently (Cursor updated mid-project), and manual verification doesn't scale. I'd also invest more in AI summary prompt engineering — the current prompt is basic and could be more personalized.

## 3. What was your biggest product insight from user interviews?

[To be filled after interviews — preliminary hypothesis: users care more about monthly savings than annual. The monthly number is what they budget for.]

## 4. How did you decide when to use AI vs. hardcoded rules?

The brief required hardcoded rules for audit math — correct call. Pricing logic must be deterministic and explainable. I used AI only for summary generation, where creativity matters more than precision.

## 5. What does "production-ready" mean for this project?

(1) Audit math is verifiably correct, (2) user data is secure, (3) app degrades gracefully when APIs fail, (4) fast enough that users don't bounce, (5) enough documentation for another developer to onboard in 30 minutes.
