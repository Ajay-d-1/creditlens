# Architecture

## System Overview

```mermaid
graph TD
    A[User Browser] --> B[Next.js App]
    B --> C[Spend Input Form]
    C --> D[Audit Engine]
    D --> E[Anthropic API]
    C --> F[Supabase DB]
    D --> G[Shareable URL]