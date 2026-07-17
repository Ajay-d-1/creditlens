import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getProvider, MockProvider, GroqProvider, MistralProvider, GeminiProvider } from './provider';
import type { AuditResult } from '@/engine/types';

describe('LLM Provider Selection and MockProvider', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    delete process.env.LLM_PROVIDER;
    delete process.env.GROQ_API_KEY;
    delete process.env.MISTRAL_API_KEY;
    delete process.env.GEMINI_API_KEY;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('defaults to MockProvider when NODE_ENV=test or no keys set', () => {
    const provider = getProvider();
    expect(provider).toBeInstanceOf(MockProvider);
    expect(provider.name).toBe('mock');
  });

  it('throws clear error if explicit mistral provider is chosen without MISTRAL_API_KEY', () => {
    expect(() => getProvider('mistral')).toThrow('Mistral API key (MISTRAL_API_KEY) is missing');
  });

  it('throws clear error if explicit gemini provider is chosen without GEMINI_API_KEY', () => {
    expect(() => getProvider('gemini')).toThrow('Gemini API key (GEMINI_API_KEY) is missing');
  });

  it('returns MistralProvider when MISTRAL_API_KEY and mistral requested', () => {
    process.env.MISTRAL_API_KEY = 'test_mistral_key';
    const provider = getProvider('mistral');
    expect(provider).toBeInstanceOf(MistralProvider);
    expect(provider.name).toBe('mistral');
  });

  it('returns GroqProvider when GROQ_API_KEY set and groq requested', () => {
    process.env.GROQ_API_KEY = 'test_groq_key';
    const provider = getProvider('groq');
    expect(provider).toBeInstanceOf(GroqProvider);
    expect(provider.name).toBe('groq');
  });

  it('MockProvider generates well-structured markdown strictly using input figures', async () => {
    const mockAudit: AuditResult = {
      totalMonthlySpend: 250,
      totalAnnualSpend: 3000,
      potentialMonthlySavings: 64,
      findings: [
        {
          id: 'f1',
          type: 'duplicate-chat-subscriptions',
          title: 'Duplicate Chat Tool Subscriptions',
          severity: 'high',
          monthlySavings: 64,
          annualSavings: 768,
          confidence: 0.5,
          evidence: {
            activeVendors: 'OpenAI / ChatGPT, Anthropic / Claude',
            retainedVendor: 'Anthropic / Claude',
          },
        },
      ],
      vendorForecasts: [],
    };

    const provider = new MockProvider();
    const markdown = await provider.phraseFindings(mockAudit);

    expect(markdown).toContain('$250');
    expect(markdown).toContain('$3,000');
    expect(markdown).toContain('$64');
    expect(markdown).toContain('Duplicate Chat Tool Subscriptions');
    expect(markdown).toContain('retained vendor: Anthropic / Claude');
    expect(markdown).not.toContain('🚀'); // No emojis
  });
});
