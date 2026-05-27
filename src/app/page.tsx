'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
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
  const [website, setWebsite] = useState('');
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
          website,
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

  if (!showResults) {
    return (
      <main className="min-h-screen bg-[#0f172a] pb-20">
        <div className="pt-16 pb-10 text-center">
          <h1 className="mb-3 text-4xl font-bold text-white">
            Audit your AI tool spend
          </h1>
          <p className="text-lg text-slate-400">
            Find savings instantly. Free for any team.
          </p>
        </div>

        <div className="mx-auto max-w-3xl space-y-4 px-4">
          <div className="rounded-xl border border-[#334155] bg-[#1e293b] p-6">
            <h2 className="mb-4 font-semibold text-white">Team Information</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm text-slate-400">Team Size</label>
                <input
                  type="number"
                  min={1}
                  placeholder="e.g. 5"
                  value={teamSize}
                  onChange={(e) => setTeamSize(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full rounded-lg border border-[#334155] bg-[#0f172a] px-3 py-2.5 text-white placeholder-slate-500 focus:border-cyan-500/50 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm text-slate-400">Primary Use Case</label>
                <select
                  value={useCase}
                  onChange={(e) => setUseCase(e.target.value)}
                  className="w-full rounded-lg border border-[#334155] bg-[#0f172a] px-3 py-2.5 text-white focus:border-cyan-500/50 focus:outline-none"
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

          <div className="rounded-xl border border-[#334155] bg-[#1e293b] p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-semibold text-white">AI Tools</h2>
              <button
                type="button"
                onClick={addEntry}
                className="flex items-center gap-1 rounded-lg bg-cyan-500 px-3 py-1.5 text-sm text-white transition-colors hover:bg-cyan-400"
              >
                + Add Tool
              </button>
            </div>

            {entries.length > 0 && (
              <div className="space-y-3 md:space-y-0">
                <div className="mb-2 hidden grid-cols-[2fr_2fr_1.5fr_1fr_auto] gap-3 border-b border-[#334155] pb-2 text-xs uppercase tracking-wide text-slate-400 md:grid">
                  <span>Tool</span>
                  <span>Plan</span>
                  <span>Spend</span>
                  <span>Seats</span>
                  <span />
                </div>

                {entries.map((entry) => (
                  <div
                    key={entry.id}
                    className="grid grid-cols-1 gap-3 rounded-lg border border-[#334155] bg-[#0f172a]/50 p-3 md:grid-cols-[2fr_2fr_1.5fr_1fr_auto] md:border-0 md:bg-transparent md:p-0 md:py-2"
                  >
                    <label className="block">
                      <span className="mb-1 block text-xs uppercase tracking-wide text-slate-500 md:hidden">
                        Tool
                      </span>
                      <select
                        value={entry.tool}
                        onChange={(e) => updateEntry(entry.id, 'tool', e.target.value)}
                        className="w-full rounded-lg border border-[#334155] bg-[#0f172a] px-3 py-2 text-sm text-white focus:border-cyan-500/50 focus:outline-none"
                      >
                        {Object.entries(TOOLS).map(([key, tool]) => (
                          <option key={key} value={key}>{tool.name}</option>
                        ))}
                      </select>
                    </label>

                    <label className="block">
                      <span className="mb-1 block text-xs uppercase tracking-wide text-slate-500 md:hidden">
                        Plan
                      </span>
                      <select
                        value={entry.plan}
                        onChange={(e) => updateEntry(entry.id, 'plan', e.target.value)}
                        className="w-full rounded-lg border border-[#334155] bg-[#0f172a] px-3 py-2 text-sm text-white focus:border-cyan-500/50 focus:outline-none"
                      >
                        {TOOLS[entry.tool as keyof typeof TOOLS].plans.map((plan) => (
                          <option key={plan} value={plan}>{plan}</option>
                        ))}
                      </select>
                    </label>

                    <label className="block">
                      <span className="mb-1 block text-xs uppercase tracking-wide text-slate-500 md:hidden">
                        Spend
                      </span>
                      <input
                        type="number"
                        min={0}
                        value={entry.monthlySpend}
                        onChange={(e) => updateEntry(entry.id, 'monthlySpend', Math.max(0, parseFloat(e.target.value) || 0))}
                        className="w-full rounded-lg border border-[#334155] bg-[#0f172a] px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-cyan-500/50 focus:outline-none"
                        placeholder="0"
                      />
                      <p className="mt-1 text-xs text-slate-500">Enter your total monthly bill for this tool</p>
                    </label>

                    <label className="block">
                      <span className="mb-1 block text-xs uppercase tracking-wide text-slate-500 md:hidden">
                        Seats
                      </span>
                      <input
                        type="number"
                        min={1}
                        value={entry.seats}
                        onChange={(e) => updateEntry(entry.id, 'seats', Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-full rounded-lg border border-[#334155] bg-[#0f172a] px-3 py-2 text-sm text-white focus:border-cyan-500/50 focus:outline-none"
                      />
                    </label>

                    <button
                      type="button"
                      onClick={() => removeEntry(entry.id)}
                      className="rounded-lg border border-red-500/30 px-3 py-2 text-sm text-red-400 transition-colors hover:bg-red-500/10"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}

            {entries.length === 0 && (
              <div className="py-10 text-center text-slate-400">
                <p>Add the AI tools your team pays for.</p>
                <p className="mt-1 text-sm">We&apos;ll find where you&apos;re overspending.</p>
              </div>
            )}

            {entries.length > 0 && (
              <div className="mt-4 flex items-center justify-between border-t border-[#334155] pt-4">
                <span className="text-xs uppercase tracking-wide text-slate-400">
                  Total Monthly Spend
                </span>
                <span className="text-lg font-bold text-cyan-400">
                  ${totalSpend.toLocaleString()}
                </span>
              </div>
            )}
          </div>

          <button
            type="button"
            disabled={entries.length === 0}
            onClick={runAuditAndSummarize}
            className="w-full rounded-xl border-2 border-dashed py-4 text-lg font-semibold transition-all disabled:cursor-not-allowed disabled:border-slate-600 disabled:text-slate-500 disabled:opacity-40 enabled:border-cyan-500 enabled:text-white enabled:hover:bg-cyan-500/10"
          >
            {entries.length === 0 ? 'Add at least one tool to run audit' : 'Run Audit →'}
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0f172a] pb-20">
      <div className="mx-auto max-w-6xl px-4 pt-8">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_340px]">
          <div className="space-y-4">
            <div className="rounded-xl bg-green-500 p-8 text-center">
              <p className="mb-2 text-xs font-bold uppercase tracking-widest text-green-900">
                Potential Monthly Savings
              </p>
              <p className="mb-2 text-5xl font-black text-white lg:text-7xl">
                ${totalSavings.toLocaleString()}
              </p>
              <p className="font-medium text-green-900">
                ${totalAnnualSavings.toLocaleString()} / year
              </p>
            </div>

            {totalSavings > 500 && (
              <div className="flex flex-col gap-4 rounded-xl bg-amber-500 p-5 md:flex-row md:items-center md:justify-between">
                <p className="font-medium text-amber-950">
                  Your team could save ${totalSavings.toLocaleString()}/mo — Credex offers discounted AI credits that capture these savings directly.
                </p>
                <a
                  href={`mailto:hello@credex.rocks?subject=${encodeURIComponent(`CreditLens Audit — $${totalSavings}/mo savings opportunity`)}`}
                  className="shrink-0 whitespace-nowrap rounded-lg bg-amber-950 px-4 py-2 text-sm font-medium text-amber-100 transition-colors hover:bg-amber-900"
                >
                  Book a Credex Consultation →
                </a>
              </div>
            )}

            <div className="rounded-xl border border-indigo-800/50 bg-indigo-950/50 p-6">
              <h3 className="mb-3 flex items-center gap-2 font-semibold text-indigo-300">
                <span>✦</span> AI Summary
              </h3>
              {aiLoading ? (
                <div className="space-y-2 animate-pulse">
                  <div className="h-4 w-full rounded bg-indigo-900/50" />
                  <div className="h-4 w-5/6 rounded bg-indigo-900/50" />
                  <div className="h-4 w-4/6 rounded bg-indigo-900/50" />
                </div>
              ) : (
                <p className="leading-relaxed text-slate-300">{summary}</p>
              )}
            </div>

            <div className="border-t border-[#334155]" />

            <h3 className="text-lg font-semibold text-white">Recommendations</h3>
            {findings.length > 0 ? (
              <div className="space-y-3">
                {findings.map((finding) => {
                  const priority = getSeverityLabel(finding);

                  return (
                    <div
                      key={`${finding.tool}-${finding.currentPlan}-${finding.recommendedPlan}`}
                      className="rounded-xl border border-[#334155] bg-[#1e293b] p-5"
                    >
                      <div className="mb-2 flex items-start justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <span className="font-semibold text-white">{finding.tool}</span>
                          <span className={`rounded px-2 py-0.5 text-xs font-bold ${
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
                          {finding.currentPlan} → {finding.recommendedPlan}
                        </span>
                        <button
                          type="button"
                          className="rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-xs text-cyan-400 transition-colors hover:bg-cyan-500/20"
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

          <div className="space-y-4">
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
                    className="whitespace-nowrap rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-3 py-2 text-sm text-cyan-400 transition-colors hover:bg-cyan-500/20"
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
                className="w-full rounded-lg border border-[#334155] py-2 text-sm text-slate-400 transition-colors hover:border-slate-500 hover:text-slate-300"
              >
                ← Start New Audit
              </button>
            </div>

            <div
              ref={emailCaptureRef}
              className="rounded-xl border border-[#334155] bg-[#1e293b] p-5"
            >
              <h3 className="mb-1 font-semibold text-white">Save your report</h3>
              <p className="mb-4 text-sm text-slate-400">
                Get the shareable link by email.
              </p>

              <form onSubmit={handleEmailSubmit} className="space-y-3">
                <input
                  type="text"
                  name="website"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  className="absolute -left-[9999px]"
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
                  className="w-full rounded-lg border border-[#334155] bg-[#0f172a] px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:border-cyan-500/50 focus:outline-none"
                />
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Company (optional)"
                  className="w-full rounded-lg border border-[#334155] bg-[#0f172a] px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:border-cyan-500/50 focus:outline-none"
                />
                <input
                  type="text"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  placeholder="Role (optional)"
                  className="w-full rounded-lg border border-[#334155] bg-[#0f172a] px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:border-cyan-500/50 focus:outline-none"
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
    </main>
  );
}
