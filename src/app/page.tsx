'use client';

import { useEffect, useRef, useState, useCallback, type FormEvent } from 'react';
import {
  Upload,
  Loader2,
  LayoutGrid,
  X,
  Zap,
  Minus,
  Plus,
} from 'lucide-react';
import { ShareAuditButton } from '@/components/ShareAuditButton';
import { runAudit, type AuditFinding, type AuditResult } from '@/lib/audit-engine';

/* ─────────────────────────────────────────────
 *  TYPES & CONSTANTS
 * ───────────────────────────────────────────── */

interface ToolEntry {
  id: string;
  tool: string;
  plan: string;
  monthlySpend: number;
  seats: number;
}

const TOOLS: Record<string, { name: string; plans: string[]; hasSeats: boolean; category: string }> = {
  cursor: { name: 'Cursor', plans: ['Hobby', 'Pro', 'Business', 'Enterprise'], hasSeats: true, category: 'Code Editor' },
  copilot: { name: 'GitHub Copilot', plans: ['Individual', 'Business', 'Enterprise'], hasSeats: true, category: 'Code Assistant' },
  claude: { name: 'Claude', plans: ['Free', 'Pro', 'Max', 'Team', 'Enterprise', 'API direct'], hasSeats: true, category: 'AI Chat' },
  chatgpt: { name: 'ChatGPT', plans: ['Plus', 'Team', 'Enterprise', 'API direct'], hasSeats: true, category: 'AI Chat' },
  anthropic_api: { name: 'Anthropic API', plans: ['Pay-as-you-go'], hasSeats: false, category: 'API' },
  openai_api: { name: 'OpenAI API', plans: ['Pay-as-you-go'], hasSeats: false, category: 'API' },
  gemini: { name: 'Gemini', plans: ['Pro', 'Ultra', 'API'], hasSeats: true, category: 'AI Chat' },
  windsurf: { name: 'Windsurf', plans: ['Free', 'Pro', 'Teams', 'Enterprise'], hasSeats: true, category: 'Code Editor' },
};

const USE_CASES = ['coding', 'writing', 'data', 'research', 'mixed'];

const TOOL_LINKS: Record<string, string> = {
  'Cursor': 'https://cursor.sh/pricing',
  'GitHub Copilot': 'https://github.com/features/copilot',
  'Claude': 'https://claude.ai/upgrade',
  'ChatGPT': 'https://openai.com/chatgpt/pricing',
  'Anthropic API': 'https://www.anthropic.com/pricing',
  'OpenAI API': 'https://openai.com/pricing',
  'Gemini': 'https://one.google.com/about/plans',
  'Windsurf': 'https://windsurf.com/pricing',
};

function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

function getToolName(toolKey: string): string {
  return TOOLS[toolKey]?.name || toolKey;
}

function formatToolsList(tools: ToolEntry[]): string {
  return tools.map((entry) => `${getToolName(entry.tool)} ${entry.plan}`).join(', ');
}

function getSeverityLabel(finding: AuditFinding): 'HIGH' | 'MEDIUM' | 'LOW' {
  if (finding.severity === 'high') return 'HIGH';
  if (finding.severity === 'medium') return 'MEDIUM';
  return 'LOW';
}

/* ─────────────────────────────────────────────
 *  APPLY FIX BUTTON
 * ───────────────────────────────────────────── */

function ApplyFixButton({ toolName }: { toolName: string }) {
  const [opening, setOpening] = useState(false);

  const handleClick = () => {
    setOpening(true);
    const link = TOOL_LINKS[toolName] || 'https://google.com/search?q=' + encodeURIComponent(toolName + ' pricing');
    window.open(link, '_blank');
    setTimeout(() => setOpening(false), 1000);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className="text-[10px] text-[#6D28D9] bg-[#EDE9FE] border border-[#C4B5FD] rounded px-2 py-1 transition-colors hover:bg-[#DDD6FE]"
    >
      {opening ? 'Opening...' : 'Apply Fix ↗'}
    </button>
  );
}

/* ─────────────────────────────────────────────
 *  COUNT-UP HOOK
 * ───────────────────────────────────────────── */

function useCountUp(target: number, duration: number = 600): number {
  const [value, setValue] = useState(0);
  const prevTarget = useRef(0);

  useEffect(() => {
    if (target === prevTarget.current) return;
    const start = prevTarget.current;
    prevTarget.current = target;
    const startTime = performance.now();

    function tick(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(start + (target - start) * eased));
      if (progress < 1) requestAnimationFrame(tick);
    }

    requestAnimationFrame(tick);
  }, [target, duration]);

  return value;
}

/* ═══════════════════════════════════════════════
 *  MAIN PAGE COMPONENT
 * ═══════════════════════════════════════════════ */

export default function Home() {
  /* ── State ── */
  const [entries, setEntries] = useState<ToolEntry[]>([]);
  const [teamSize, setTeamSize] = useState<number>(1);
  const [useCase, setUseCase] = useState<string>('coding');
  const [auditResult, setAuditResult] = useState<AuditResult | null>(null);
  const [aiSummary, setAiSummary] = useState<string>('');
  const [aiLoading, setAiLoading] = useState(false);
  const [isRunning, setIsRunning] = useState(false);

  // Email capture / share state
  const [email, setEmail] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [role, setRole] = useState('');
  const [b_address, setB_address] = useState('');
  const [emailCaptured, setEmailCaptured] = useState(false);
  const [shareId, setShareId] = useState('');
  const [savingAudit, setSavingAudit] = useState(false);
  const [captureError, setCaptureError] = useState('');
  const emailInputRef = useRef<HTMLInputElement>(null);

  /* ── Persistence ── */
  useEffect(() => {
    const saved = localStorage.getItem('creditlens_form');
    if (saved) {
      const parsed = JSON.parse(saved);
      setEntries(parsed.entries || []);
      setTeamSize(parsed.teamSize || 1);
      setUseCase(parsed.useCase || 'coding');
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('creditlens_form', JSON.stringify({ entries, teamSize, useCase }));
  }, [entries, teamSize, useCase]);

  /* ── Entry CRUD ── */
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
    setEntries((prev) =>
      prev.map((entry) => (entry.id === id ? { ...entry, [field]: value } : entry))
    );
  }

  function removeEntry(id: string) {
    setEntries(entries.filter((entry) => entry.id !== id));
  }

  /* ── CSV Import ── */
  const handleCSVImport = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const text = ev.target?.result as string;
        const lines = text.trim().split('\n').slice(1);
        const parsed: ToolEntry[] = lines
          .map((line) => {
            const [tool, plan, spend, seats] = line.split(',').map((s) => s.trim().replace(/"/g, ''));
            return {
              id: generateId(),
              tool: tool.toLowerCase(),
              plan: plan || 'Pro',
              monthlySpend: parseFloat(spend) || 0,
              seats: parseInt(seats) || 1,
            };
          })
          .filter((e) => TOOLS[e.tool as keyof typeof TOOLS]);
        if (parsed.length > 0) setEntries((prev) => [...prev, ...parsed]);
      };
      reader.readAsText(file);
    };
    input.click();
  }, []);

  /* ── Run Audit ── */
  async function runAuditAndSummarize() {
    if (entries.length === 0) return;

    setIsRunning(true);
    const result = runAudit(entries, teamSize, useCase);
    setAuditResult(result);
    setEmailCaptured(false);
    setShareId('');
    setCaptureError('');

    // Save to audit history in localStorage
    try {
      const history = JSON.parse(localStorage.getItem('creditlens_audit_history') || '[]');
      history.unshift({
        id: generateId(),
        date: new Date().toISOString(),
        toolCount: entries.length,
        totalSpend: result.totalMonthlySpend,
        totalSavings: result.totalMonthlySavings,
      });
      localStorage.setItem('creditlens_audit_history', JSON.stringify(history.slice(0, 20)));
    } catch {}

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
      setIsRunning(false);
    }
  }

  /* ── Email Submit ── */
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

      // Update the most recent history entry with the shareId
      try {
        const history = JSON.parse(localStorage.getItem('creditlens_audit_history') || '[]');
        if (history[0]) { history[0].shareId = saveData.shareId; }
        localStorage.setItem('creditlens_audit_history', JSON.stringify(history));
      } catch {}
    } catch (error) {
      console.error('Lead capture failed:', error);
      setCaptureError(
        'Having trouble saving — your audit results are still shown above. Try again or copy the link manually.'
      );
    } finally {
      setSavingAudit(false);
    }
  }

  /* ── Derived values ── */
  const totalSpend = entries.reduce((sum, entry) => sum + (entry.monthlySpend || 0), 0);
  const totalSavings = Math.round(auditResult?.totalMonthlySavings || 0);
  const totalAnnualSavings = totalSavings * 12;
  const findings = auditResult?.findings || [];
  const summary = aiSummary || auditResult?.summary || '';
  const savingsPercent = totalSpend > 0 ? Math.round((totalSavings / totalSpend) * 100) : 0;
  const shareUrl = shareId ? `https://creditlens-navy.vercel.app/audit/${shareId}` : '';

  const animatedSavings = useCountUp(totalSavings);

  /* ═══════════════════════════════════════════════
   *  RENDER
   * ═══════════════════════════════════════════════ */
  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* ── TOP BAR ── */}
      <div className="flex items-center justify-between px-6 py-3.5 border-b border-[#E5E4DF] bg-white shrink-0">
        <div>
          <h1 className="text-[13px] font-semibold text-[#111110]">New Audit</h1>
          <p className="text-[11px] text-[#A19F99] mt-0.5">Add your AI tools to analyze spend</p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={handleCSVImport} className="cl-btn-ghost">
            <Upload size={12} /> Import CSV
          </button>
          <button
            type="button"
            onClick={runAuditAndSummarize}
            disabled={entries.length === 0 || isRunning}
            className="cl-btn-primary inline-flex items-center gap-2 text-[12px]"
          >
            {isRunning && <Loader2 size={13} className="animate-spin" />}
            Run Audit
          </button>
        </div>
      </div>

      {/* ── MAIN CONTENT — two columns ── */}
      <div className="flex-1 overflow-y-auto">
        <div className="grid grid-cols-[1fr_300px] gap-5 p-6 min-h-full">
          {/* ════════════════════════════════
           *  LEFT PANEL
           * ════════════════════════════════ */}
          <div className="space-y-4">
            {/* ── Team config row ── */}
            <div className="grid grid-cols-2 gap-3">
              {/* Team Size tile */}
              <div className="cl-card p-4">
                <p className="cl-label mb-3">Team Size</p>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[22px] font-semibold text-[#111110]">
                    {teamSize}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setTeamSize(Math.max(1, teamSize - 1))}
                      className="flex h-7 w-7 items-center justify-center rounded-md border border-[#E5E4DF] bg-[#F4F4F1] text-[#605F5B] hover:bg-[#E5E4DF] transition-colors"
                    >
                      <Minus size={12} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setTeamSize(teamSize + 1)}
                      className="flex h-7 w-7 items-center justify-center rounded-md border border-[#E5E4DF] bg-[#F4F4F1] text-[#605F5B] hover:bg-[#E5E4DF] transition-colors"
                    >
                      <Plus size={12} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Use Case tile */}
              <div className="cl-card p-4">
                <p className="cl-label mb-3">Primary Use Case</p>
                <div className="flex flex-wrap gap-1.5">
                  {USE_CASES.map((uc) => (
                    <button
                      key={uc}
                      type="button"
                      onClick={() => setUseCase(uc)}
                      className={`rounded px-2.5 py-[3px] text-[10px] border transition-colors ${
                        useCase === uc
                          ? 'bg-[#6D28D9] text-white border-[#6D28D9]'
                          : 'bg-[#F4F4F1] text-[#605F5B] border-[#E5E4DF] hover:border-[#D4D3CE]'
                      }`}
                    >
                      {uc.charAt(0).toUpperCase() + uc.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* ── Tools table section ── */}
            <div className="cl-card p-4">
              {/* Section header */}
              <div className="flex items-center justify-between mb-3">
                <p className="cl-label">AI Tools Stack</p>
                <button
                  type="button"
                  onClick={addEntry}
                  className="text-[10px] uppercase tracking-wider text-[#6D28D9] font-medium hover:text-[#5B21B6] transition-colors"
                >
                  + Add Tool
                </button>
              </div>

              {entries.length > 0 ? (
                <>
                  {/* Column headers */}
                  <div className="grid grid-cols-[1fr_100px_90px_56px_28px] gap-3 mb-1 pb-2 border-b border-[#F0EFEA]">
                    <span className="cl-label">Tool</span>
                    <span className="cl-label">Plan</span>
                    <span className="cl-label">$/mo</span>
                    <span className="cl-label">Seats</span>
                    <span />
                  </div>

                  {/* Tool rows */}
                  {entries.map((entry) => (
                    <div
                      key={entry.id}
                      className="grid grid-cols-[1fr_100px_90px_56px_28px] gap-3 py-2.5 border-b border-[#F0EFEA] items-center hover:bg-[#FAFAF8] transition-colors"
                    >
                      {/* Tool cell */}
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[#F4F4F1] border border-[#E5E4DF] text-[11px] font-medium text-[#605F5B]">
                          {getToolName(entry.tool).charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <select
                            value={entry.tool}
                            onChange={(e) => {
                              updateEntry(entry.id, 'tool', e.target.value);
                              const newTool = TOOLS[e.target.value as keyof typeof TOOLS];
                              if (newTool) updateEntry(entry.id, 'plan', newTool.plans[0]);
                            }}
                            className="bg-transparent text-[13px] text-[#111110] font-medium border-none outline-none cursor-pointer appearance-none w-full"
                          >
                            {Object.entries(TOOLS).map(([key, tool]) => (
                              <option key={key} value={key}>
                                {tool.name}
                              </option>
                            ))}
                          </select>
                          <p className="text-[10px] text-[#A19F99] -mt-0.5">
                            {TOOLS[entry.tool as keyof typeof TOOLS]?.category || ''}
                          </p>
                        </div>
                      </div>

                      {/* Plan cell */}
                      <select
                        value={entry.plan}
                        onChange={(e) => updateEntry(entry.id, 'plan', e.target.value)}
                        className="cl-input text-[12px] !py-[5px] appearance-none cursor-pointer"
                      >
                        {TOOLS[entry.tool as keyof typeof TOOLS]?.plans.map((plan) => (
                          <option key={plan} value={plan}>
                            {plan}
                          </option>
                        ))}
                      </select>

                      {/* Spend cell */}
                      <div className="relative">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[#A19F99] text-[12px]">$</span>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={entry.monthlySpend === 0 ? '' : entry.monthlySpend}
                          onChange={(e) => {
                            const raw = e.target.value.replace(/[^0-9.]/g, '');
                            updateEntry(entry.id, 'monthlySpend', raw === '' ? 0 : Math.max(0, parseFloat(raw) || 0));
                          }}
                          placeholder="0"
                          className="cl-input text-[12px] !py-[5px] font-mono text-right !pl-5"
                        />
                      </div>

                      {/* Seats cell */}
                      <input
                        type="text"
                        inputMode="numeric"
                        value={entry.seats === 0 ? '' : entry.seats}
                        onChange={(e) => {
                          const raw = e.target.value.replace(/[^0-9]/g, '');
                          updateEntry(entry.id, 'seats', raw === '' ? 0 : parseInt(raw));
                        }}
                        className="cl-input text-[12px] !py-[5px] font-mono text-center"
                      />

                      {/* Delete cell */}
                      <button
                        type="button"
                        onClick={() => removeEntry(entry.id)}
                        className="flex items-center justify-center text-[#C8C6C0] hover:text-[#DC2626] transition-colors"
                        aria-label="Remove tool"
                      >
                        <X size={13} />
                      </button>
                    </div>
                  ))}

                  {/* Total row */}
                  <div className="flex items-center justify-between border-t border-[#E5E4DF] pt-3 mt-1">
                    <span className="cl-label">Total Monthly Spend</span>
                    <span className="font-mono text-[18px] font-semibold text-[#6D28D9]">
                      ${totalSpend.toLocaleString()}
                    </span>
                  </div>

                  {/* Run Audit button */}
                  <button
                    type="button"
                    onClick={runAuditAndSummarize}
                    disabled={entries.length === 0 || isRunning}
                    className="cl-btn-primary w-full mt-3 py-3 text-[13px] inline-flex items-center justify-center gap-2"
                  >
                    {isRunning && <Loader2 size={14} className="animate-spin" />}
                    {entries.length === 0 ? 'Add at least one tool' : 'Run Audit'}
                  </button>
                </>
              ) : (
                /* ── Empty state ── */
                <div className="border border-dashed border-[#E5E4DF] rounded-lg py-10 text-center">
                  <LayoutGrid size={20} className="mx-auto text-[#D4D3CE] mb-3" />
                  <p className="text-[#A19F99] text-[13px]">Add the AI tools your team pays for</p>
                  <button
                    type="button"
                    onClick={addEntry}
                    className="mt-3 text-[11px] font-medium text-[#6D28D9] hover:text-[#5B21B6] transition-colors"
                  >
                    + Add Tool
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* ════════════════════════════════
           *  RIGHT PANEL
           * ════════════════════════════════ */}
          <div className="sticky top-0 self-start space-y-3 overflow-y-auto max-h-[calc(100vh-120px)]">
            {!auditResult ? (
              /* ── Empty state ── */
              <div className="cl-card p-6 text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#EDE9FE]">
                  <Zap size={18} className="text-[#6D28D9]" />
                </div>
                <p className="text-[#605F5B] text-[13px] mb-1">Add your tools and run an audit</p>
                <p className="text-[#A19F99] text-[11px] mb-5">Savings opportunities will appear here</p>
                {/* Shimmer placeholders */}
                <div className="space-y-2">
                  <div className="h-[60px] rounded-lg bg-[#F4F4F1] animate-shimmer" />
                  <div className="h-[48px] rounded-lg bg-[#F4F4F1] animate-shimmer" style={{ animationDelay: '0.2s' }} />
                  <div className="h-[48px] rounded-lg bg-[#F4F4F1] animate-shimmer" style={{ animationDelay: '0.4s' }} />
                </div>
              </div>
            ) : (
              /* ── Results ── */
              <>
                {/* [1] Savings Hero Card */}
                <div
                  className="cl-card p-5 text-center border-t-2 border-t-[#6D28D9] animate-fade-in-up"
                >
                  <p className="cl-label text-center">
                    Potential Savings
                  </p>
                  <p className="font-mono text-[40px] font-semibold text-[#111110] tracking-tight leading-none mt-1">
                    ${animatedSavings.toLocaleString()}
                  </p>
                  <p className="text-[11px] text-[#A19F99] mt-1">
                    ${totalAnnualSavings.toLocaleString()} per year
                  </p>

                  {/* Progress bar */}
                  <div className="h-[3px] bg-[#F4F4F1] rounded my-3 overflow-hidden">
                    <div
                      className="h-full rounded bg-[#6D28D9] transition-all duration-700"
                      style={{ width: `${Math.min(savingsPercent, 100)}%` }}
                    />
                  </div>

                  <div className="flex justify-between text-[10px] text-[#A19F99]">
                    <span>{savingsPercent}% of spend</span>
                    <span>{findings.length} finding{findings.length !== 1 ? 's' : ''}</span>
                  </div>
                </div>

                {/* [2] AI Analysis Card */}
                <div className="cl-card p-4 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
                  <div className="flex items-center gap-2 mb-2.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#6D28D9]" />
                    <span className="text-[#605F5B] text-[11px] font-medium">AI Analysis</span>
                  </div>
                  {aiLoading ? (
                    <div className="space-y-2">
                      <div className="h-2.5 w-full rounded bg-[#F4F4F1] animate-pulse" />
                      <div className="h-2.5 w-5/6 rounded bg-[#F4F4F1] animate-pulse" />
                      <div className="h-2.5 w-4/6 rounded bg-[#F4F4F1] animate-pulse" />
                    </div>
                  ) : (
                    <p className="text-[12px] text-[#605F5B] leading-relaxed">{summary}</p>
                  )}
                </div>

                {/* [3] Findings */}
                {findings.map((finding, idx) => {
                  const severity = getSeverityLabel(finding);
                  const accentColor =
                    severity === 'HIGH'
                      ? 'border-l-[#DC2626]'
                      : severity === 'MEDIUM'
                        ? 'border-l-[#D97706]'
                        : 'border-l-[#059669]';
                  const badgeClasses =
                    severity === 'HIGH'
                      ? 'bg-[#FEE2E2] text-[#DC2626]'
                      : severity === 'MEDIUM'
                        ? 'bg-[#FEF3C7] text-[#D97706]'
                        : 'bg-[#D1FAE5] text-[#059669]';

                  return (
                    <div
                      key={`${finding.tool}-${finding.currentPlan}-${finding.recommendedPlan}`}
                      className={`cl-card overflow-hidden border-l-2 ${accentColor} animate-fade-in-up`}
                      style={{ animationDelay: `${0.15 + idx * 0.05}s` }}
                    >
                      {/* Top row */}
                      <div className="flex items-center justify-between px-3 pt-2.5 pb-2 bg-[#FAFAF8]">
                        <div className="flex items-center gap-2">
                          <span className="text-[#111110] text-[12px] font-medium">{finding.tool}</span>
                          <span
                            className={`text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded-[3px] ${badgeClasses}`}
                          >
                            {severity}
                          </span>
                        </div>
                        <span className="text-[#059669] font-mono text-[11px]">
                          Save ${Math.round(finding.savings)}/mo
                        </span>
                      </div>

                      {/* Body */}
                      <div className="px-3 pb-3">
                        <p className="text-[11px] text-[#605F5B] leading-relaxed mt-1 mb-2">
                          {finding.reason}
                        </p>
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-[10px] text-[#A19F99]">
                            <span className="opacity-60">{finding.currentPlan}</span>
                            {' → '}
                            <span className="text-[#111110]">{finding.recommendedPlan}</span>
                          </span>
                          <ApplyFixButton toolName={finding.tool} />
                        </div>
                      </div>
                    </div>
                  );
                })}

                {findings.length === 0 && (
                  <div className="cl-card p-4 text-center animate-fade-in-up" style={{ animationDelay: '0.15s' }}>
                    <p className="text-[12px] text-[#059669] font-medium">You&apos;re all set!</p>
                    <p className="text-[11px] text-[#A19F99] mt-1">{auditResult?.summary}</p>
                  </div>
                )}

                {/* [4] Save & Share Card */}
                <div className="cl-card p-4 animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
                  <p className="cl-label mb-2">Save & Share</p>

                  {shareUrl && (
                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex-1 truncate rounded-md bg-[#FAFAF8] border border-[#E5E4DF] px-2.5 py-1.5 text-[11px] text-[#A19F99] font-mono">
                        {shareUrl.replace('https://', '')}
                      </div>
                      <ShareAuditButton
                        url={shareUrl}
                        idleLabel="Copy"
                        copiedLabel="✓"
                        className="text-[10px] text-[#6D28D9] bg-[#EDE9FE] border border-[#C4B5FD] rounded px-2 py-1.5 transition-colors hover:bg-[#DDD6FE]"
                      />
                    </div>
                  )}

                  <form onSubmit={handleEmailSubmit} className="space-y-2">
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
                      className="cl-input text-[12px]"
                    />
                    <input
                      type="text"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="Company"
                      className="cl-input text-[12px]"
                    />
                    <input
                      type="text"
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                      placeholder="Role"
                      className="cl-input text-[12px]"
                    />

                    {captureError && (
                      <div className="rounded-md border border-[#DC2626]/30 bg-[#FEE2E2] p-2">
                        <p className="text-[10px] text-[#DC2626]">{captureError}</p>
                      </div>
                    )}

                    {emailCaptured && (
                      <p className="text-[10px] text-[#059669]">✓ Report sent to your email!</p>
                    )}

                    <button
                      type="submit"
                      disabled={savingAudit}
                      className="cl-btn-primary w-full !text-[11px] !py-2"
                    >
                      {savingAudit ? 'Saving...' : captureError ? 'Retry Save' : 'Get My Report'}
                    </button>
                    <p className="text-center text-[9px] text-[#C8C6C0]">
                      No spam. We&apos;ll reach out only for high-savings cases.
                    </p>
                  </form>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
