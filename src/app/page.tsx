'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Trash2, Sparkles } from 'lucide-react';
import { ShareAuditButton } from '@/components/ShareAuditButton';
import { runAudit, type AuditFinding, type AuditResult } from '@/lib/audit-engine';

interface ToolEntry {
  id: string;
  tool: string;
  plan: string;
  monthlySpend: number;
  seats: number;
}

const TOOLS = {
  cursor: {
    name: 'Cursor',
    plans: ['Hobby', 'Pro', 'Business', 'Enterprise'],
    hasSeats: true,
  },
  copilot: {
    name: 'GitHub Copilot',
    plans: ['Individual', 'Business', 'Enterprise'],
    hasSeats: true,
  },
  claude: {
    name: 'Claude',
    plans: ['Free', 'Pro', 'Max', 'Team', 'Enterprise', 'API direct'],
    hasSeats: true,
  },
  chatgpt: {
    name: 'ChatGPT',
    plans: ['Plus', 'Team', 'Enterprise', 'API direct'],
    hasSeats: true,
  },
  anthropic_api: {
    name: 'Anthropic API',
    plans: ['Pay-as-you-go'],
    hasSeats: false,
  },
  openai_api: {
    name: 'OpenAI API',
    plans: ['Pay-as-you-go'],
    hasSeats: false,
  },
  gemini: {
    name: 'Gemini',
    plans: ['Pro', 'Ultra', 'API'],
    hasSeats: true,
  },
  windsurf: {
    name: 'Windsurf',
    plans: ['Free', 'Pro', 'Teams', 'Enterprise'],
    hasSeats: true,
  },
};

const USE_CASES = ['coding', 'writing', 'data', 'research', 'mixed'];

function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

function getToolName(toolKey: string): string {
  return TOOLS[toolKey as keyof typeof TOOLS]?.name || toolKey;
}

function formatToolsList(tools: ToolEntry[]): string {
  return tools
    .map((entry) => `${getToolName(entry.tool)} ${entry.plan}`)
    .join(', ');
}

function getSeverityLabel(finding: AuditFinding): 'HIGH' | 'MEDIUM' | 'LOW' {
  if (finding.severity === 'high') return 'HIGH';
  if (finding.severity === 'medium') return 'MEDIUM';
  return 'LOW';
}

export default function Home() {
  const [entries, setEntries] = useState<ToolEntry[]>([]);
  const [teamSize, setTeamSize] = useState<number>(1);
  const [useCase, setUseCase] = useState<string>('coding');
  const [auditResult, setAuditResult] = useState<AuditResult | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [aiSummary, setAiSummary] = useState<string>('');
  const [aiLoading, setAiLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [role, setRole] = useState('');
  const [b_address, setB_address] = useState('');
  const [emailCaptured, setEmailCaptured] = useState(false);
  const [shareId, setShareId] = useState('');
  const [savingAudit, setSavingAudit] = useState(false);
  const [captureError, setCaptureError] = useState('');
  const emailCaptureRef = useRef<HTMLDivElement>(null);
  const emailInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem('creditlens_form');
    if (saved) {
      const parsed = JSON.parse(saved);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setEntries(parsed.entries || []);
      setTeamSize(parsed.teamSize || 1);
      setUseCase(parsed.useCase || 'coding');
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('creditlens_form', JSON.stringify({ entries, teamSize, useCase }));
  }, [entries, teamSize, useCase]);

  function addEntry() {
    const newEntry: ToolEntry = {
      id: generateId(),
      tool: 'cursor',
      plan: 'Hobby',
      monthlySpend: 0,
      seats: 1,
    };
    setEntries([...entries, newEntry]);
  }

  function updateEntry(id: string, field: keyof ToolEntry, value: string | number) {
    setEntries(entries.map((entry) =>
      entry.id === id ? { ...entry, [field]: value } : entry
    ));
  }

  function removeEntry(id: string) {
    setEntries(entries.filter((entry) => entry.id !== id));
  }

  async function runAuditAndSummarize() {
    if (entries.length === 0) return;

    const result = runAudit(entries, teamSize, useCase);
    setAuditResult(result);
    setShowResults(true);
    setEmailCaptured(false);
    setShareId('');
    setCaptureError('');

    setAiLoading(true);
    try {
      const topFinding = result.findings[0];
      const summaryRes = await fetch('/api/summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          findings: result.findings,
          totalSpend: result.totalMonthlySpend,
          totalSavings: result.totalMonthlySavings,
          teamSize,
          useCase,
          tools: entries,
          toolsList: formatToolsList(entries),
          topRecommendation: topFinding
            ? `${topFinding.tool}: ${topFinding.reason} Save $${Math.round(topFinding.savings)}/mo.`
            : 'No major savings recommendation found',
        }),
      });
      const summaryData = await summaryRes.json();
      setAiSummary(summaryData.summary || result.summary);
    } catch (err) {
      console.error('AI summary failed:', err);
      setAiSummary(result.summary);
    } finally {
      setAiLoading(false);
    }
  }

  async function handleEmailSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!auditResult) return;

    setSavingAudit(true);
    setCaptureError('');

    try {
      const saveRes = await fetch('/api/save-audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          companyName,
          role,
          b_address,
          toolsData: entries,
          totalSpend: auditResult.totalMonthlySpend,
          totalSavings: auditResult.totalMonthlySavings,
          findings: auditResult.findings,
          teamSize,
          useCase,
        }),
      });

      const saveData = await saveRes.json();

      if (!saveRes.ok || !saveData.shareId) {
        throw new Error(saveData.details || saveData.error || 'Could not save audit');
      }

      setShareId(saveData.shareId);
      setEmailCaptured(true);
    } catch (error) {
      console.error('Lead capture failed:', error);
      setCaptureError(
        'Having trouble saving — your audit results are still shown above. Try again or copy the link manually.'
      );
    } finally {
      setSavingAudit(false);
    }
  }

  function focusEmailCapture() {
    emailCaptureRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    emailInputRef.current?.focus();
  }

  const totalSpend = entries.reduce((sum, entry) => sum + (entry.monthlySpend || 0), 0);
  const totalSavings = Math.round(auditResult?.totalMonthlySavings || 0);
  const totalAnnualSavings = totalSavings * 12;
  const findings = auditResult?.findings || [];
  const summary = aiSummary || auditResult?.summary || '';
  const shareUrl = shareId ? `https://creditlens-navy.vercel.app/audit/${shareId}` : '';
  const visibleShareUrl = shareId
    ? `creditlens-navy.vercel.app/audit/${shareId}`
    : 'Save your report to generate a shareable link';

  /* ─────────────────────────────────────────────
   *  FORM VIEW  (Mockup 1 — white content card)
   * ───────────────────────────────────────────── */
  if (!showResults) {
    return (
      <div className="flex-1 bg-white">
        <div className="mx-auto max-w-3xl px-4 py-12 md:py-16">
          {/* Hero heading */}
          <div className="mb-10 text-center">
            <h1 className="mb-3 text-3xl font-bold text-gray-900 md:text-4xl">
              Audit your AI tool spend
            </h1>
            <p className="text-gray-400">
              Find savings instantly. Free for any team.
            </p>
          </div>

          {/* ── Team Information ── */}
          <div className="border-t border-gray-200 pt-8 pb-8">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.15em] text-gray-400">
                  Team Size
                </label>
                <input
                  type="number"
                  min={1}
                  placeholder="e.g. 5"
                  value={teamSize}
                  onChange={(e) => setTeamSize(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-gray-900 placeholder-gray-400 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 focus:outline-none transition-colors"
                />
              </div>
              <div>
                <label className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.15em] text-gray-400">
                  Primary Use Case
                </label>
                <select
                  value={useCase}
                  onChange={(e) => setUseCase(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-gray-900 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 focus:outline-none transition-colors"
                >
                  {USE_CASES.map((uc) => (
                    <option key={uc} value={uc}>
                      {uc.charAt(0).toUpperCase() + uc.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* ── AI Tools Section ── */}
          <div className="border-t border-gray-200 pt-6">
            {/* Add Tool button */}
            <div className="mb-5 flex justify-end">
              <button
                type="button"
                onClick={addEntry}
                className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-500 transition-colors hover:text-cyan-600"
              >
                <span className="text-base leading-none">+</span> Add Tool
              </button>
            </div>

            {/* Column headers + rows */}
            {entries.length > 0 && (
              <>
                <div className="mb-1 hidden border-b border-gray-200 pb-2 md:grid md:grid-cols-[2fr_2fr_1.5fr_1fr_36px] md:gap-4">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-gray-400">Tool</span>
                  <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-gray-400">Plan</span>
                  <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-gray-400">Spend</span>
                  <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-gray-400">Seats</span>
                  <span />
                </div>

                {entries.map((entry) => (
                  <div
                    key={entry.id}
                    className="grid grid-cols-1 gap-3 border-b border-gray-100 py-3 md:grid-cols-[2fr_2fr_1.5fr_1fr_36px] md:items-center md:gap-4"
                  >
                    {/* Tool select */}
                    <div>
                      <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.15em] text-gray-400 md:hidden">Tool</span>
                      <select
                        value={entry.tool}
                        onChange={(e) => updateEntry(entry.id, 'tool', e.target.value)}
                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-cyan-500 focus:outline-none"
                      >
                        {Object.entries(TOOLS).map(([key, tool]) => (
                          <option key={key} value={key}>{tool.name}</option>
                        ))}
                      </select>
                    </div>

                    {/* Plan select */}
                    <div>
                      <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.15em] text-gray-400 md:hidden">Plan</span>
                      <select
                        value={entry.plan}
                        onChange={(e) => updateEntry(entry.id, 'plan', e.target.value)}
                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-cyan-500 focus:outline-none"
                      >
                        {TOOLS[entry.tool as keyof typeof TOOLS].plans.map((plan) => (
                          <option key={plan} value={plan}>{plan}</option>
                        ))}
                      </select>
                    </div>

                    {/* Spend input */}
                    <div>
                      <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.15em] text-gray-400 md:hidden">Spend</span>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={entry.monthlySpend === 0 ? '' : entry.monthlySpend}
                        onChange={(e) => {
                          const raw = e.target.value.replace(/[^0-9.]/g, '');
                          updateEntry(entry.id, 'monthlySpend', raw === '' ? 0 : Math.max(0, parseFloat(raw) || 0));
                        }}
                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-cyan-500 focus:outline-none"
                        placeholder="$0"
                      />
                    </div>

                    {/* Seats */}
                    <div>
                      <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.15em] text-gray-400 md:hidden">Seats</span>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          min={1}
                          value={entry.seats}
                          onChange={(e) => updateEntry(entry.id, 'seats', Math.max(1, parseInt(e.target.value) || 1))}
                          className="w-16 rounded-lg border border-gray-300 bg-white px-2 py-2 text-center text-sm text-gray-900 focus:border-cyan-500 focus:outline-none"
                        />
                        <span className="text-xs text-gray-400">seats</span>
                      </div>
                    </div>

                    {/* Delete */}
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => removeEntry(entry.id)}
                        className="rounded p-1.5 text-gray-300 transition-colors hover:bg-red-50 hover:text-red-500"
                        aria-label="Remove tool"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                ))}
              </>
            )}

            {entries.length === 0 && (
              <div className="py-14 text-center">
                <p className="text-gray-400">Add the AI tools your team pays for.</p>
                <p className="mt-1 text-sm text-gray-300">We&apos;ll find where you&apos;re overspending.</p>
              </div>
            )}

            {/* Total spend */}
            {entries.length > 0 && (
              <div className="mt-2 flex items-center justify-between border-t border-gray-200 pt-5">
                <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-gray-400">
                  Total Monthly Spend
                </span>
                <span className="text-xl font-bold text-cyan-500">
                  ${totalSpend.toLocaleString()}
                </span>
              </div>
            )}
          </div>

          {/* Run Audit button */}
          <div className="mt-10">
            <button
              type="button"
              disabled={entries.length === 0}
              onClick={runAuditAndSummarize}
              className="w-full rounded-xl border-2 border-dashed py-4 text-lg font-semibold transition-all
                disabled:cursor-not-allowed disabled:border-gray-300 disabled:text-gray-300
                enabled:border-cyan-500/60 enabled:text-cyan-600 enabled:hover:border-cyan-500 enabled:hover:bg-cyan-50"
            >
              {entries.length === 0 ? 'Add at least one tool to run audit' : 'Run Audit →'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ─────────────────────────────────────────────
   *  RESULTS VIEW  (Mockup 2 — dark theme)
   * ───────────────────────────────────────────── */
  return (
    <div className="flex-1 pb-20">
      <div className="mx-auto max-w-6xl px-4 pt-8">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_340px]">
          {/* ── Left column ── */}
          <div className="space-y-5">
            {/* Green savings banner */}
            <div className="rounded-xl bg-gradient-to-br from-green-500 to-green-600 p-8 text-center shadow-lg shadow-green-900/30">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-green-950">
                Potential Monthly Savings
              </p>
              <p className="mb-2 text-5xl font-black text-white lg:text-7xl">
                ${totalSavings.toLocaleString()}
              </p>
              <p className="font-medium text-green-900">
                ${totalAnnualSavings.toLocaleString()} / year
              </p>
            </div>

            {/* Amber CTA */}
            {totalSavings > 500 && (
              <div className="flex flex-col gap-4 rounded-xl bg-amber-500 p-5 md:flex-row md:items-center md:justify-between">
                <p className="font-medium text-amber-950">
                  Your team could save ${totalSavings.toLocaleString()}/mo — Credex offers discounted AI credits...
                </p>
                <a
                  href={`mailto:hello@credex.rocks?subject=${encodeURIComponent(`CreditLens Audit — $${totalSavings}/mo savings opportunity`)}`}
                  className="shrink-0 whitespace-nowrap rounded-lg bg-amber-950 px-4 py-2 text-sm font-medium text-amber-100 transition-colors hover:bg-amber-900"
                >
                  Book a Credex Consultation →
                </a>
              </div>
            )}

            {/* AI Summary */}
            <div className="card-accent rounded-xl border border-[#334155] bg-[#1e293b] p-6">
              <h3 className="mb-3 flex items-center gap-2 font-semibold text-cyan-300">
                <Sparkles size={16} className="text-cyan-400" />
                AI Summary
              </h3>
              {aiLoading ? (
                <div className="animate-pulse space-y-2">
                  <div className="h-4 w-full rounded bg-slate-700" />
                  <div className="h-4 w-5/6 rounded bg-slate-700" />
                  <div className="h-4 w-4/6 rounded bg-slate-700" />
                </div>
              ) : (
                <p className="text-sm leading-relaxed text-slate-300">{summary}</p>
              )}
            </div>

            <div className="border-t border-[#334155]" />

            {/* Recommendations */}
            {findings.length > 0 ? (
              <div className="space-y-3">
                {findings.map((finding) => {
                  const priority = getSeverityLabel(finding);

                  return (
                    <div
                      key={`${finding.tool}-${finding.currentPlan}-${finding.recommendedPlan}`}
                      className="card-accent rounded-xl border border-[#334155] bg-[#1e293b] p-5"
                    >
                      <div className="mb-2 flex items-start justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <span className="font-semibold text-white">{finding.tool}</span>
                          <span className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                            priority === 'HIGH'
                              ? 'bg-red-500/20 text-red-400'
                              : priority === 'MEDIUM'
                                ? 'bg-amber-500/20 text-amber-400'
                                : 'bg-green-500/20 text-green-400'
                          }`}
                          >
                            {priority}
                          </span>
                        </div>
                        <span className="shrink-0 font-bold text-green-400">
                          Save ${Math.round(finding.savings)}/mo
                        </span>
                      </div>
                      <p className="mb-3 text-sm text-slate-400">{finding.reason}</p>
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-mono text-xs text-slate-500">
                          {finding.currentPlan} → <span className="font-semibold text-white">{finding.recommendedPlan}</span>
                        </span>
                        <button
                          type="button"
                          className="rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-4 py-1.5 text-xs font-semibold text-cyan-400 transition-colors hover:bg-cyan-500/20"
                        >
                          Apply Fix
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-xl border border-[#334155] bg-[#1e293b] p-5 text-center">
                <p className="font-semibold text-green-400">You&apos;re all set!</p>
                <p className="mt-2 text-sm text-slate-400">{auditResult?.summary}</p>
              </div>
            )}

            {totalSavings < 100 && (
              <div className="rounded-xl border border-[#334155] bg-[#1e293b] p-5 text-center">
                <p className="mb-4 text-sm text-slate-300">
                  You&apos;re spending efficiently. We&apos;ll notify you when better options appear for your stack.
                </p>
                <button
                  type="button"
                  onClick={focusEmailCapture}
                  className="rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-4 py-2 text-sm font-medium text-cyan-400 transition-colors hover:bg-cyan-500/20"
                >
                  Notify me
                </button>
              </div>
            )}

            <p className="pt-4 text-center text-xs text-slate-600">
              Audited by CreditLens · creditlens-navy.vercel.app
            </p>
          </div>

          {/* ── Right sidebar ── */}
          <div className="space-y-4">
            {/* Share card */}
            <div className="rounded-xl border border-[#334155] bg-[#1e293b] p-5">
              <h3 className="mb-3 font-semibold text-white">Share your audit</h3>
              <div className="mb-3 flex gap-2">
                <div className="flex-1 truncate rounded-lg border border-[#334155] bg-[#0f172a] px-3 py-2 text-sm text-slate-400">
                  {visibleShareUrl}
                </div>
                {shareUrl ? (
                  <ShareAuditButton
                    url={shareUrl}
                    idleLabel="⎘ Copy"
                    className="whitespace-nowrap rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-3 py-2 text-sm font-medium text-cyan-400 transition-colors hover:bg-cyan-500/20"
                  />
                ) : (
                  <button
                    type="button"
                    disabled
                    className="whitespace-nowrap rounded-lg border border-slate-600 px-3 py-2 text-sm text-slate-500"
                  >
                    ⎘ Copy
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={() => setShowResults(false)}
                className="w-full rounded-lg border border-[#334155] py-2 text-center text-sm text-slate-400 transition-colors hover:border-slate-500 hover:text-slate-300"
              >
                ← Start New Audit
              </button>
            </div>

            {/* Save report card */}
            <div
              ref={emailCaptureRef}
              className="rounded-xl border border-[#334155] bg-[#1e293b] p-5"
            >
              <h3 className="mb-1 font-semibold text-white">Save your report</h3>
              <p className="mb-4 text-sm text-slate-400">
                Get the shareable link by email.
              </p>

              <form onSubmit={handleEmailSubmit} className="space-y-3">
                {/* Honeypot */}
                <input
                  type="text"
                  name="b_address"
                  value={b_address}
                  onChange={(e) => setB_address(e.target.value)}
                  style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}
                  tabIndex={-1}
                  autoComplete="off"
                  aria-hidden="true"
                />

                <input
                  ref={emailInputRef}
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email"
                  required
                  className="w-full rounded-lg border border-[#334155] bg-[#0f172a] px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:border-cyan-500/50 focus:outline-none transition-colors"
                />
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Company"
                  className="w-full rounded-lg border border-[#334155] bg-[#0f172a] px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:border-cyan-500/50 focus:outline-none transition-colors"
                />
                <input
                  type="text"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  placeholder="Role"
                  className="w-full rounded-lg border border-[#334155] bg-[#0f172a] px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:border-cyan-500/50 focus:outline-none transition-colors"
                />

                {captureError && (
                  <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3">
                    <p className="text-xs text-red-300">{captureError}</p>
                    <button
                      type="submit"
                      disabled={savingAudit}
                      className="mt-2 text-xs font-semibold text-red-200 underline underline-offset-4 disabled:opacity-50"
                    >
                      Try again
                    </button>
                  </div>
                )}

                {emailCaptured && (
                  <p className="text-xs text-green-400">
                    ✓ Report sent to your email!
                  </p>
                )}

                <button
                  type="submit"
                  disabled={savingAudit}
                  className="w-full rounded-lg bg-cyan-500 py-2.5 font-semibold text-white transition-colors hover:bg-cyan-400 disabled:opacity-50"
                >
                  {savingAudit ? 'Saving...' : captureError ? 'Retry Save' : 'Get My Report'}
                </button>
                <p className="text-center text-xs text-slate-500">
                  No spam. We&apos;ll reach out only for high-savings cases.
                </p>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
