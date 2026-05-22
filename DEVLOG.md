# Development Log

## Day 1 — 2026-05-20
**Hours worked:** 4
**What I did:** 
- Initialized Next.js 16.2.6 project with TypeScript, Tailwind CSS, and App Router
- Fixed postcss XSS vulnerability by adding npm override to v8.5.10
- Committed security fix with conventional commit format
- Deployed to Vercel at https://creditlens-navy.vercel.app
- Started researching pricing data for all 9 AI tools

**What I learned:** 
- Next.js App Router uses pp/ directory for pages and API routes
- page.tsx = user-facing page, 
oute.ts = API endpoint
- npm overrides can force nested dependencies to safe versions without breaking the main package
- Vercel auto-deploys on every git push to main branch

**Blockers / what I'm stuck on:** 
- Need to verify Anthropic API free credits application status
- Deciding between Windsurf and v0 as the 9th tool — Windsurf has clearer per-seat pricing
- Need to set up Supabase project for lead capture backend

**End of Day 1 summary:** 
7 commits, live deployment at https://creditlens-navy.vercel.app, spend input form working with localStorage persistence, all documentation files started.


## Day 2 — 2026-05-22
**Hours worked:** 5
**What I did:** 
- Built audit engine with hardcoded pricing rules for all 9 tools
- Implemented 3 audit rules: minimum seat check, plan overkill check, duplicate tool detection
- Wired audit engine to form — "Run Audit" button works end-to-end
- Created results page with hero savings number and color-coded recommendations
- Fixed duplicate findings bug by deduplicating per-tool (kept highest savings)
- Wrote 6 unit tests covering audit engine logic (all passing)
- Fixed bug where Claude Team was recommending Max instead of Pro — added cost-saving validation in findDowngradePlan
- Verified live deployment at https://creditlens-navy.vercel.app

**What I learned:** 
- Hardcoded rules are more reliable than AI for deterministic pricing logic
- Deduplication is critical when multiple rules can fire for the same tool
- Jest + ts-jest works well for testing TypeScript business logic
- Test-driven development caught a real bug (Claude Team → Max was wrong, should be Pro)
- Antigravity (AI agent) was helpful for quick bug fixes and file creation

**Blockers / what I'm stuck on:** 
- Need to verify all pricing URLs are still current
- Supabase setup pending — need to create project and define schema
- Anthropic API credits status still unknown

**Plan for tomorrow:** 
- Verify pricing data by visiting all URLs
- Set up Supabase project with `audits` table
- Add email capture form after results
- Start on shareable URL system


## Day 3 — 2026-05-23
**Hours worked:** 4
**What I did:** 
- Set up Supabase project with `audits` table
- Created `audits` table schema: id, created_at, tools_data, total_spend, total_savings, findings, email, company_name, role, team_size, use_case, share_id
- Installed `@supabase/supabase-js` and created client in `src/lib/supabase.ts`
- Built database layer in `src/lib/database.ts` with `saveAudit()` and `getAuditByShareId()`
- Added email capture form after audit results with optional company name
- Wired "Run Audit" button to save audit data to Supabase with unique `share_id`
- Added `shareId`, `email`, `companyName`, `emailCaptured` states to page.tsx
- Verified build passes and live deployment works

**What I learned:** 
- Supabase free tier is generous and fast to set up
- `gen_random_uuid()` for primary keys, `share_id` for public URLs
- Environment variables in Next.js: `NEXT_PUBLIC_` prefix for client-side access
- JSONB columns in PostgreSQL store nested audit data efficiently
- Row Level Security (RLS) is important but disabled for MVP speed

**Blockers / what I'm stuck on:** 
- Need to enable RLS policies on `audits` table for production security
- Email sending (Resend/Postmark) not set up yet — just storing emails for now
- Anthropic API credits status still unknown
- Shareable URL page (`/audit/[id]`) not built yet

**Plan for tomorrow:** 
- Build shareable URL page (`/audit/[id]`) with PII stripped
- Add Open Graph meta tags for link previews
- Set up Resend for transactional emails
- Integrate Anthropic API for AI-generated summary
