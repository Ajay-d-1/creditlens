import type { AuditResult } from '@/engine/types';

export interface LLMProvider {
  name: string;
  phraseFindings(audit: AuditResult): Promise<string>;
}

export const SYSTEM_PROMPT = `You are a financial copywriter for an AI-spend audit tool. You receive a JSON audit result with pre-computed findings. Rewrite it as: (1) a 3-sentence executive summary, (2) one short paragraph per finding, (3) a closing recommended-actions list.
STRICT RULES: Never add, remove, or modify any number, vendor name, or recommendation. Every figure you write must appear in the input JSON.
If total savings are $0, say the spend looks well-optimized and explain which checks ran. Write plainly, no hype, no emojis.`;

export class MockProvider implements LLMProvider {
  name = 'mock';

  async phraseFindings(audit: AuditResult): Promise<string> {
    const formatEvidence = (evidence: Record<string, number | string>) => {
      return Object.entries(evidence)
        .map(([k, v]) => `${k.replace(/([A-Z])/g, ' $1').toLowerCase()}: ${v}`)
        .join(', ');
    };

    if (audit.potentialMonthlySavings === 0 || audit.findings.length === 0) {
      return `### Executive Summary
The AI spend analysis audited a total monthly expenditure of $${audit.totalMonthlySpend.toLocaleString()} ($${audit.totalAnnualSpend.toLocaleString()} annualized) across active tool subscriptions. The spend looks well-optimized with $0 in potential monthly savings detected by our diagnostic rules. Six comprehensive diagnostic checks ran covering duplicate subscriptions, team consolidation, price increases, usage anomalies, annual billing conversions, and seat benchmarks.

### Diagnostic Checks Completed
- **Duplicate Chat Subscriptions**: Verified no overlapping personal chat tool subscriptions are currently billed simultaneously.
- **Team Consolidation**: Checked for multiple individual seats of the same vendor that could be consolidated to a centralized team plan.
- **Price Increases**: Analyzed trailing month-over-month vendor pricing trends for unannounced subscription rate increases.
- **Spend Anomalies**: Evaluated historical billing variance to detect unexpected usage spikes above standard deviation thresholds.
- **Annual Billing Optimization**: Assessed monthly billed recurring tools against known annual discount rate schedules.
- **Seat Cost Benchmarking**: Compared overall per-seat monthly spend against industry midpoint ranges for your team tier.

### Recommended Actions
- Continue monitoring ongoing monthly subscription renewals and usage levels.
- Re-run this audit periodically or whenever new AI tools or seat allocations are introduced to the team.`;
    }

    return `### Executive Summary
The financial audit analyzed a total monthly expenditure of $${audit.totalMonthlySpend.toLocaleString()}, equivalent to $${audit.totalAnnualSpend.toLocaleString()} annually. Across the evaluated tool stack, our diagnostic rules identified $${Math.round(audit.potentialMonthlySavings).toLocaleString()} in potential monthly savings ($${Math.round(audit.potentialMonthlySavings * 12).toLocaleString()} annualized) across ${audit.findings.length} actionable finding${audit.findings.length === 1 ? '' : 's'}. Immediate optimization can eliminate redundant seat costs, capture annual contract discounts, and resolve subscription inefficiencies.

### Detailed Findings

${audit.findings
  .map(
    (f) => `#### ${f.title}
This diagnostic finding has a severity classification of ${f.severity} with estimated savings of $${Math.round(f.monthlySavings).toLocaleString()} per month ($${Math.round(f.annualSavings).toLocaleString()} annually). The engine detected this inefficiency based on ${formatEvidence(f.evidence)}. Addressing this item ensures your organization pays only for required capacity and standardized licensing tiers.`
  )
  .join('\n\n')}

### Recommended Actions
${audit.findings
  .map(
    (f, idx) =>
      `${idx + 1}. **${f.title}**: Transition or optimize this vendor to recover $${Math.round(f.monthlySavings).toLocaleString()} monthly ($${Math.round(f.annualSavings).toLocaleString()}/yr).`
  )
  .join('\n')}`;
  }
}

export class GroqProvider implements LLMProvider {
  name = 'groq';
  private apiKey: string;

  constructor(apiKey?: string) {
    const key = apiKey ?? process.env.GROQ_API_KEY;
    if (!key) {
      throw new Error('Groq API key (GROQ_API_KEY) is missing');
    }
    this.apiKey = key;
  }

  async phraseFindings(audit: AuditResult): Promise<string> {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: JSON.stringify(audit) },
        ],
        temperature: 0.2,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Groq API error (${response.status}): ${errText}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content ?? '';
  }
}

export class MistralProvider implements LLMProvider {
  name = 'mistral';
  private apiKey: string;

  constructor(apiKey?: string) {
    const key = apiKey ?? process.env.MISTRAL_API_KEY;
    if (!key) {
      throw new Error('Mistral API key (MISTRAL_API_KEY) is missing');
    }
    this.apiKey = key;
  }

  async phraseFindings(audit: AuditResult): Promise<string> {
    const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: 'mistral-small-latest',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: JSON.stringify(audit) },
        ],
        temperature: 0.2,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Mistral API error (${response.status}): ${errText}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content ?? '';
  }
}

export class GeminiProvider implements LLMProvider {
  name = 'gemini';
  private apiKey: string;

  constructor(apiKey?: string) {
    const key = apiKey ?? process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error('Gemini API key (GEMINI_API_KEY) is missing');
    }
    this.apiKey = key;
  }

  async phraseFindings(audit: AuditResult): Promise<string> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${this.apiKey}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        system_instruction: {
          parts: [{ text: SYSTEM_PROMPT }],
        },
        contents: [
          {
            role: 'user',
            parts: [{ text: JSON.stringify(audit) }],
          },
        ],
        generationConfig: {
          temperature: 0.2,
        },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Gemini API error (${response.status}): ${errText}`);
    }

    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
  }
}

export function getProvider(overrideProvider?: string): LLMProvider {
  const providerName = overrideProvider ?? process.env.LLM_PROVIDER;

  if (providerName === 'mock') {
    return new MockProvider();
  }

  // If no provider is explicitly requested AND (we are in test environment or no keys exist), default to MockProvider
  if (
    !providerName &&
    (process.env.NODE_ENV === 'test' ||
      (!process.env.GROQ_API_KEY &&
        !process.env.MISTRAL_API_KEY &&
        !process.env.GEMINI_API_KEY))
  ) {
    return new MockProvider();
  }

  const selected = (providerName ?? 'groq').toLowerCase();

  switch (selected) {
    case 'mistral':
      if (!process.env.MISTRAL_API_KEY) {
        throw new Error('Mistral API key (MISTRAL_API_KEY) is missing');
      }
      return new MistralProvider();
    case 'gemini':
      if (!process.env.GEMINI_API_KEY) {
        throw new Error('Gemini API key (GEMINI_API_KEY) is missing');
      }
      return new GeminiProvider();
    case 'groq':
    default:
      if (!process.env.GROQ_API_KEY) {
        if (providerName === 'groq') {
          throw new Error('Groq API key (GROQ_API_KEY) is missing');
        }
        return new MockProvider();
      }
      return new GroqProvider();
  }
}
