# LLM Prompts

## AI Summary Generation

**Model:** Groq (llama3-8b-8192) — free tier, fast inference  
**Why Groq instead of Anthropic:** Anthropic requires paid API access. Groq offers generous free tier with comparable model quality.

### Prompt Template
```
Generate a concise, helpful 100-word summary for a startup founder about their AI tool spend audit.

Audit findings:
{findings_list}

Total potential savings: ${totalSavings}/month.

Write in a friendly, actionable tone. Focus on the biggest opportunity and give one specific next step.
```

### Why this prompt structure:
- **Context first:** Tells the model who the reader is (startup founder)
- **Data injection:** Dynamic findings list provides specific details
- **Tone instruction:** "friendly, actionable" prevents generic corporate speak
- **Length constraint:** "100-word" keeps it concise for UI display
- **Focus instruction:** "biggest opportunity" ensures prioritization
- **Call to action:** "one specific next step" makes it useful

### Fallback strategy:
If Groq API fails (rate limit, downtime), return a pre-written template summary. Never let the user see a broken app.
