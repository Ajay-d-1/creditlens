'use client';

import { useState, useEffect, useRef, type FormEvent } from 'react';
import { Plus, Trash2, ChevronDown, Calculator } from 'lucide-react';
import { ShareAuditButton } from '@/components/ShareAuditButton';
import { runAudit, AuditResult } from '@/lib/audit-engine';

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
    setEntries(entries.map(entry => 
      entry.id === id ? { ...entry, [field]: value } : entry
    ));
  }

  function removeEntry(id: string) {
    setEntries(entries.filter(entry => entry.id !== id));
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
          website,
          tools: entries,
          totalSpend: auditResult.totalMonthlySpend,
          totalSavings: auditResult.totalMonthlySavings,
          findings: auditResult.findings,
          teamSize,
          useCase,
        }),
      });

      const saveData = await saveRes.json();

      if (!saveRes.ok || !saveData.shareId) {
        throw new Error(saveData.error || 'Could not save audit');
      }

      setShareId(saveData.shareId);
      setEmailCaptured(true);

      try {
        await fetch('/api/send-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email,
            totalSavings: auditResult.totalMonthlySavings,
            toolsList: formatToolsList(entries),
            shareId: saveData.shareId,
          }),
        });
      } catch (error) {
        console.warn('Confirmation email failed silently:', error);
      }
    } catch (error) {
      console.error('Lead capture failed:', error);
      setCaptureError('We could not save your audit yet. Please try again.');
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
  const shareUrl = shareId ? `https://creditlens-navy.vercel.app/audit/${shareId}` : '';

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
            CreditLens
          </h1>
          <p className="text-slate-400 text-lg">
            Audit your AI tool spend. Find savings instantly.
          </p>
        </div>

        {!showResults ? (
          // FORM VIEW
          <>
            {/* Team Info */}
            <div className="bg-slate-800/50 rounded-xl p-6 mb-6 border border-slate-700">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Calculator className="w-5 h-5 text-cyan-400" />
                Team Information
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Team Size</label>
                  <input
                    type="number"
                    min={1}
                    placeholder="e.g. 5"
                    value={teamSize}
                    onChange={(e) => setTeamSize(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full bg-slate-700 rounded-lg px-4 py-2 text-white border border-slate-600 focus:border-cyan-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Primary Use Case</label>
                  <div className="relative">
                    <select
                      value={useCase}
                      onChange={(e) => setUseCase(e.target.value)}
                      className="w-full bg-slate-700 rounded-lg px-4 py-2 text-white border border-slate-600 focus:border-cyan-400 focus:outline-none appearance-none"
                    >
                      {USE_CASES.map(uc => (
                        <option key={uc} value={uc}>{uc.charAt(0).toUpperCase() + uc.slice(1)}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-3 w-4 h-4 text-slate-400 pointer-events-none" />
                  </div>
                </div>
              </div>
            </div>

            {/* Tool Entries */}
            <div className="bg-slate-800/50 rounded-xl p-6 mb-6 border border-slate-700">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">AI Tools</h2>
                <button
                  onClick={addEntry}
                  className="flex items-center gap-2 bg-cyan-500 hover:bg-cyan-600 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Add Tool
                </button>
              </div>

              {entries.length === 0 ? (
                <p className="text-slate-500 text-center py-8">
                  Add the AI tools your team pays for. We&apos;ll find where you&apos;re overspending.
                </p>
              ) : (
                <div className="space-y-4">
                  {entries.map((entry) => (
                    <div key={entry.id} className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end bg-slate-700/50 rounded-lg p-4">
                      <div>
                        <label className="block text-xs text-slate-400 mb-1">Tool</label>
                        <select
                          value={entry.tool}
                          onChange={(e) => updateEntry(entry.id, 'tool', e.target.value)}
                          className="w-full bg-slate-600 rounded-lg px-3 py-2 text-white border border-slate-500 focus:border-cyan-400 focus:outline-none"
                        >
                          {Object.entries(TOOLS).map(([key, tool]) => (
                            <option key={key} value={key}>{tool.name}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs text-slate-400 mb-1">Plan</label>
                        <select
                          value={entry.plan}
                          onChange={(e) => updateEntry(entry.id, 'plan', e.target.value)}
                          className="w-full bg-slate-600 rounded-lg px-3 py-2 text-white border border-slate-500 focus:border-cyan-400 focus:outline-none"
                        >
                          {TOOLS[entry.tool as keyof typeof TOOLS].plans.map(plan => (
                            <option key={plan} value={plan}>{plan}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs text-slate-400 mb-1">Monthly Spend ($)</label>
                        <input
                          type="number"
                          min={0}
                          value={entry.monthlySpend}
                          onChange={(e) => updateEntry(entry.id, 'monthlySpend', Math.max(0, parseFloat(e.target.value) || 0))}
                          className="w-full bg-slate-600 rounded-lg px-3 py-2 text-white border border-slate-500 focus:border-cyan-400 focus:outline-none"
                          placeholder="0"
                        />
                        <p className="mt-1 text-xs text-slate-500">Enter your total monthly bill for this tool</p>
                      </div>

                      <div>
                        <label className="block text-xs text-slate-400 mb-1">Seats</label>
                        <input
                          type="number"
                          min={1}
                          value={entry.seats}
                          onChange={(e) => updateEntry(entry.id, 'seats', Math.max(1, parseInt(e.target.value) || 1))}
                          className="w-full bg-slate-600 rounded-lg px-3 py-2 text-white border border-slate-500 focus:border-cyan-400 focus:outline-none"
                        />
                      </div>

                      <div>
                        <button
                          onClick={() => removeEntry(entry.id)}
                          className="w-full flex items-center justify-center gap-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 px-3 py-2 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {entries.length > 0 && (
                <div className="mt-4 pt-4 border-t border-slate-600 flex justify-between items-center">
                  <span className="text-slate-400">Total Monthly Spend</span>
                  <span className="text-2xl font-bold text-cyan-400">${totalSpend.toLocaleString()}</span>
                </div>
              )}
            </div>

            {/* Run Audit Button */}
            <button
              disabled={entries.length === 0}
              onClick={async () => {
                if (entries.length === 0) return;

                const result = runAudit(entries, teamSize, useCase);
                setAuditResult(result);
                setShowResults(true);

                setEmailCaptured(false);
                setShareId('');
                setCaptureError('');

                // Fetch AI summary
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
                  setAiSummary(summaryData.summary);
                } catch (err) {
                  console.error('AI summary failed:', err);
                } finally {
                  setAiLoading(false);
                }
              }}
              className="w-full transform rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 py-4 text-lg font-semibold text-white transition-all hover:scale-[1.02] hover:from-cyan-600 hover:to-blue-600 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
            >
              {entries.length === 0 ? 'Add at least one tool to run audit' : 'Run Audit →'}
            </button>
          </>
        ) : (
          // RESULTS VIEW
          <div className="space-y-6">
            {/* Hero Savings */}
            <div className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-xl p-8 text-center border border-green-500/30">
              <p className="text-green-400 text-sm uppercase tracking-wide mb-2">Potential Monthly Savings</p>
              <p className="text-5xl font-bold text-white mb-2">
                ${totalSavings.toLocaleString()}
              </p>
              <p className="text-slate-400">
                ${Math.round((auditResult?.totalAnnualSavings || 0)).toLocaleString()} / year
              </p>
            </div>

            {totalSavings > 500 && (
              <div className="rounded-xl border border-amber-400/40 bg-amber-500/15 p-5">
                <p className="mb-4 text-amber-100">
                  Your team could save ${totalSavings.toLocaleString()}/mo — Credex offers discounted AI credits that capture these savings directly.
                </p>
                <a
                  href={`mailto:hello@credex.rocks?subject=${encodeURIComponent(`CreditLens Audit — $${totalSavings}/mo savings opportunity`)}`}
                  className="inline-block rounded-lg bg-amber-300 px-5 py-3 font-semibold text-slate-950 transition-colors hover:bg-amber-200"
                >
                  Book a Credex Consultation →
                </a>
              </div>
            )}

            {/* AI Summary */}
            {aiLoading && (
              <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700 mb-6">
                <p className="text-slate-400 italic">Generating AI summary...</p>
              </div>
            )}

            {aiSummary && !aiLoading && (
              <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-xl p-6 border border-purple-500/30 mb-6">
                <h3 className="text-lg font-semibold mb-2 text-purple-400">AI Summary</h3>
                <p className="text-slate-300">{aiSummary}</p>
              </div>
            )}

            {/* Findings */}
            {auditResult && auditResult.findings.length > 0 ? (
              <div className="space-y-4">
                <h3 className="text-xl font-semibold text-white">Recommendations</h3>
                {auditResult.findings.map((finding: { tool: string; severity: string; reason: string; currentPlan: string; recommendedPlan: string; savings: number }, index: number) => (
                  <div 
                    key={index} 
                    className={`rounded-lg p-4 border ${
                      finding.severity === 'high' 
                        ? 'bg-red-500/10 border-red-500/30' 
                        : finding.severity === 'medium'
                        ? 'bg-yellow-500/10 border-yellow-500/30'
                        : 'bg-blue-500/10 border-blue-500/30'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-semibold text-white">{finding.tool}</h4>
                      <span className={`text-xs px-2 py-1 rounded ${
                        finding.severity === 'high' 
                          ? 'bg-red-500/20 text-red-400' 
                          : finding.severity === 'medium'
                          ? 'bg-yellow-500/20 text-yellow-400'
                          : 'bg-blue-500/20 text-blue-400'
                      }`}>
                        {finding.severity.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-slate-300 text-sm mb-2">{finding.reason}</p>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">
                        {finding.currentPlan} → {finding.recommendedPlan}
                      </span>
                      <span className="text-green-400 font-semibold">
                        Save ${Math.round(finding.savings)}/mo
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-green-500/10 rounded-xl p-6 text-center border border-green-500/30">
                <p className="text-green-400 text-lg font-semibold mb-2">You&apos;re all set!</p>
                <p className="text-slate-400">{auditResult?.summary}</p>
              </div>
            )}

            <p className="text-center text-sm text-slate-500">
              Audited by CreditLens · creditlens-navy.vercel.app
            </p>

            {totalSavings < 100 && (
              <div className="rounded-xl border border-slate-700 bg-slate-800/40 p-5 text-center">
                <p className="mb-4 text-sm text-slate-300">
                  You&apos;re spending efficiently. We&apos;ll notify you when better options appear for your stack.
                </p>
                <button
                  type="button"
                  onClick={focusEmailCapture}
                  className="rounded-lg border border-slate-500 px-4 py-2 text-sm font-semibold text-slate-200 transition-colors hover:border-cyan-400 hover:text-cyan-300"
                >
                  Notify me
                </button>
              </div>
            )}

            {/* Email Capture */}
            <div ref={emailCaptureRef} className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
              {emailCaptured ? (
                <div>
                  <h3 className="text-lg font-semibold text-white mb-2">Audit saved</h3>
                  <p className="text-slate-300 mb-4">
                    Your confirmation email is on its way.
                  </p>
                  {shareUrl && (
                    <div className="space-y-4">
                      <p className="break-all rounded-lg border border-slate-700 bg-slate-900/70 px-4 py-3 text-sm text-slate-300">
                        {shareUrl}
                      </p>
                      <div className="flex flex-col gap-3 sm:flex-row">
                        <a
                          href={`/audit/${shareId}`}
                          className="inline-block rounded-lg bg-cyan-500 px-5 py-3 text-center font-semibold text-white transition-colors hover:bg-cyan-600"
                        >
                          View Shareable Report
                        </a>
                        <ShareAuditButton url={shareUrl} />
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <form onSubmit={handleEmailSubmit} className="space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-1">Get your audit report</h3>
                    <p className="text-sm text-slate-400">
                      Save this audit and receive the shareable report link by email.
                    </p>
                  </div>

                  <input
                    type="text"
                    name="website"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    className="honeypot-field"
                    tabIndex={-1}
                    autoComplete="off"
                    aria-hidden="true"
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-slate-400 mb-1">Email</label>
                      <input
                        ref={emailInputRef}
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="w-full bg-slate-700 rounded-lg px-4 py-2 text-white border border-slate-600 focus:border-cyan-400 focus:outline-none"
                        placeholder="founder@company.com"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-slate-400 mb-1">Company name</label>
                      <input
                        type="text"
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        className="w-full bg-slate-700 rounded-lg px-4 py-2 text-white border border-slate-600 focus:border-cyan-400 focus:outline-none"
                        placeholder="Optional"
                      />
                    </div>
                  </div>

                  {captureError && (
                    <p className="text-sm text-red-400">{captureError}</p>
                  )}

                  <button
                    type="submit"
                    disabled={savingAudit}
                    className="w-full bg-cyan-500 hover:bg-cyan-600 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg transition-colors"
                  >
                    {savingAudit ? 'Saving...' : 'Email My Report'}
                  </button>
                </form>
              )}
            </div>

            {/* Back Button */}
            <button
              onClick={() => setShowResults(false)}
              className="w-full bg-slate-700 hover:bg-slate-600 text-white py-3 rounded-lg transition-colors"
            >
              ← Start New Audit
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
