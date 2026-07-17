// src/engine/vendorMatcher.test.ts
import { describe, it, expect } from 'vitest';
import { normalizeMerchant, matchVendor } from './vendorMatcher';

describe('normalizeMerchant', () => {
  it('uppercases and trims', () => {
    expect(normalizeMerchant('  openai  ')).toBe('OPENAI');
  });

  it('strips POS prefix', () => {
    expect(normalizeMerchant('POS CURSOR.COM 8821')).toBe('CURSOR.COM');
  });

  it('strips WWW. prefix', () => {
    expect(normalizeMerchant('WWW.MIDJOURNEY.COM SUBSCRIPTION')).toBe('MIDJOURNEY.COM');
  });

  it('strips PAYPAL * prefix', () => {
    expect(normalizeMerchant('PAYPAL *ANTHROPIC')).toBe('ANTHROPIC');
  });

  it('strips asterisks and trailing reference codes', () => {
    expect(normalizeMerchant('OPENAI *CHATGPT SUBSCR CA')).toBe('OPENAI CHATGPT');
  });

  it('strips trailing digits', () => {
    expect(normalizeMerchant('CURSOR.COM 8821')).toBe('CURSOR.COM');
  });

  it('collapses multiple spaces', () => {
    expect(normalizeMerchant('ELEVEN   LABS    MONTHLY')).toBe('ELEVEN LABS');
  });

  it('handles mixed noise', () => {
    const result = normalizeMerchant('POS PAYPAL *STABILITY AI INC 12345');
    expect(result).toContain('STABILITY');
  });
});

describe('matchVendor', () => {
  // Test all 20 vendors with realistic messy strings

  it('matches OpenAI / ChatGPT', () => {
    const match = matchVendor(normalizeMerchant('OPENAI *CHATGPT SUBSCR CA'));
    expect(match).not.toBeNull();
    expect(match!.vendorId).toBe('openai');
    expect(match!.displayName).toBe('OpenAI / ChatGPT');
    expect(match!.category).toBe('chat');
  });

  it('matches Anthropic / Claude via PAYPAL', () => {
    const match = matchVendor(normalizeMerchant('PAYPAL *ANTHROPIC'));
    expect(match).not.toBeNull();
    expect(match!.vendorId).toBe('anthropic');
  });

  it('matches Anthropic via Claude name', () => {
    const match = matchVendor(normalizeMerchant('CLAUDE.AI SUBSCRIPTION'));
    expect(match).not.toBeNull();
    expect(match!.vendorId).toBe('anthropic');
  });

  it('matches Cursor', () => {
    const match = matchVendor(normalizeMerchant('CURSOR.COM 8821'));
    expect(match).not.toBeNull();
    expect(match!.vendorId).toBe('cursor');
    expect(match!.category).toBe('coding');
  });

  it('matches GitHub Copilot', () => {
    const match = matchVendor(normalizeMerchant('GITHUB.COM COPILO 12345'));
    expect(match).not.toBeNull();
    expect(match!.vendorId).toBe('github-copilot');
    expect(match!.category).toBe('coding');
  });

  it('matches GitHub Copilot full name', () => {
    const match = matchVendor(normalizeMerchant('GITHUB COPILOT MONTHLY'));
    expect(match).not.toBeNull();
    expect(match!.vendorId).toBe('github-copilot');
  });

  it('matches Google Gemini', () => {
    const match = matchVendor(normalizeMerchant('GOOGLE ONE GEMINI PRO'));
    expect(match).not.toBeNull();
    expect(match!.vendorId).toBe('google-gemini');
  });

  it('matches Perplexity', () => {
    const match = matchVendor(normalizeMerchant('PERPLEXITY AI INC'));
    expect(match).not.toBeNull();
    expect(match!.vendorId).toBe('perplexity');
    expect(match!.category).toBe('chat');
  });

  it('matches Midjourney', () => {
    const match = matchVendor(normalizeMerchant('WWW.MIDJOURNEY.COM SUBSCRIPTION'));
    expect(match).not.toBeNull();
    expect(match!.vendorId).toBe('midjourney');
    expect(match!.category).toBe('image');
  });

  it('matches Stability AI', () => {
    const match = matchVendor(normalizeMerchant('STABILITY AI LLC 99432'));
    expect(match).not.toBeNull();
    expect(match!.vendorId).toBe('stability');
    expect(match!.category).toBe('image');
  });

  it('matches Stability via DreamStudio', () => {
    const match = matchVendor(normalizeMerchant('DREAMSTUDIO.AI MONTHLY'));
    expect(match).not.toBeNull();
    expect(match!.vendorId).toBe('stability');
  });

  it('matches ElevenLabs', () => {
    const match = matchVendor(normalizeMerchant('ELEVENLABS SUBSCRIPTION'));
    expect(match).not.toBeNull();
    expect(match!.vendorId).toBe('elevenlabs');
    expect(match!.category).toBe('audio');
  });

  it('matches Notion AI', () => {
    const match = matchVendor(normalizeMerchant('NOTION LABS INC'));
    expect(match).not.toBeNull();
    expect(match!.vendorId).toBe('notion-ai');
    expect(match!.category).toBe('productivity');
  });

  it('matches Jasper', () => {
    const match = matchVendor(normalizeMerchant('JASPER AI INC MONTHLY'));
    expect(match).not.toBeNull();
    expect(match!.vendorId).toBe('jasper');
    expect(match!.category).toBe('productivity');
  });

  it('matches Copy.ai', () => {
    const match = matchVendor(normalizeMerchant('COPY.AI SUBSCRIPTION'));
    expect(match).not.toBeNull();
    expect(match!.vendorId).toBe('copyai');
    expect(match!.category).toBe('productivity');
  });

  it('matches Copy AI without dot', () => {
    const match = matchVendor(normalizeMerchant('COPYAI MONTHLY'));
    expect(match).not.toBeNull();
    expect(match!.vendorId).toBe('copyai');
  });

  it('matches Runway', () => {
    const match = matchVendor(normalizeMerchant('RUNWAY ML INC'));
    expect(match).not.toBeNull();
    expect(match!.vendorId).toBe('runway');
    expect(match!.category).toBe('video');
  });

  it('matches Descript', () => {
    const match = matchVendor(normalizeMerchant('DESCRIPT INC MONTHLY'));
    expect(match).not.toBeNull();
    expect(match!.vendorId).toBe('descript');
    expect(match!.category).toBe('video');
  });

  it('matches Replit', () => {
    const match = matchVendor(normalizeMerchant('REPLIT INC'));
    expect(match).not.toBeNull();
    expect(match!.vendorId).toBe('replit');
    expect(match!.category).toBe('coding');
  });

  it('matches xAI / Grok', () => {
    const match = matchVendor(normalizeMerchant('XAI CORP SUBSCRIPTION'));
    expect(match).not.toBeNull();
    expect(match!.vendorId).toBe('xai');
    expect(match!.category).toBe('chat');
  });

  it('matches Grok directly', () => {
    const match = matchVendor(normalizeMerchant('GROK AI MONTHLY'));
    expect(match).not.toBeNull();
    expect(match!.vendorId).toBe('xai');
  });

  it('matches Suno', () => {
    const match = matchVendor(normalizeMerchant('SUNO AI INC'));
    expect(match).not.toBeNull();
    expect(match!.vendorId).toBe('suno');
    expect(match!.category).toBe('audio');
  });

  it('matches Pika', () => {
    const match = matchVendor(normalizeMerchant('PIKA LABS INC'));
    expect(match).not.toBeNull();
    expect(match!.vendorId).toBe('pika');
    expect(match!.category).toBe('video');
  });

  it('matches Windsurf / Codeium', () => {
    const match = matchVendor(normalizeMerchant('CODEIUM INC WINDSURF'));
    expect(match).not.toBeNull();
    expect(match!.vendorId).toBe('windsurf');
    expect(match!.category).toBe('coding');
  });

  it('matches Cohere', () => {
    const match = matchVendor(normalizeMerchant('COHERE INC API'));
    expect(match).not.toBeNull();
    expect(match!.vendorId).toBe('cohere');
    expect(match!.category).toBe('api');
  });

  // Edge cases
  it('returns null for unrecognized merchant', () => {
    expect(matchVendor(normalizeMerchant('AMAZON WEB SERVICES'))).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(matchVendor('')).toBeNull();
  });

  it('returns null for generic grocery store', () => {
    expect(matchVendor(normalizeMerchant('WALMART SUPERCENTER 1234'))).toBeNull();
  });

  it('handles extreme noise gracefully', () => {
    const match = matchVendor(normalizeMerchant('POS PAYPAL *OPENAI *CHATGPT SUBSCR 99832 US'));
    expect(match).not.toBeNull();
    expect(match!.vendorId).toBe('openai');
  });
});
