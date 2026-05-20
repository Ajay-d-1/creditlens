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
- page.tsx = user-facing page, oute.ts = API endpoint
- npm overrides can force nested dependencies to safe versions without breaking the main package
- Vercel auto-deploys on every git push to main branch

**Blockers / what I'm stuck on:** 
- Need to verify Anthropic API free credits application status
- Deciding between Windsurf and v0 as the 9th tool — Windsurf has clearer per-seat pricing
- Need to set up Supabase project for lead capture backend

**Plan for tomorrow:** 
- Build the spend input form with localStorage persistence
- Complete PRICING_DATA.md with all verified pricing URLs
- Set up Supabase project and define database schema
- Write first audit engine rule (Cursor plan evaluation)
