'use client';

import { useState } from 'react';
import { Bell, BarChart2, Mail } from 'lucide-react';

const UPCOMING = [
  { title: 'Scheduled Spend Alerts', desc: 'Get notified when your monthly AI spend crosses a threshold you set.' },
  { title: 'Team Digest Emails', desc: 'Weekly summary of your stack costs and savings — sent to your whole team.' },
  { title: 'Benchmark Reports', desc: 'See how your AI spend compares to teams of similar size in your industry.' },
  { title: 'CSV Export', desc: 'Download a full breakdown of findings and recommendations as a spreadsheet.' },
];

export default function ReportsPage() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    if (!email || !email.includes('@')) return;
    setLoading(true);
    try {
      await fetch('/api/notify-waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      setSubmitted(true);
    } catch {
      setSubmitted(true); // still show success — don't block on API failure
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex items-center px-6 py-3.5 border-b border-[#E5E4DF] bg-white shrink-0">
        <div>
          <h1 className="text-[13px] font-semibold text-[#111110]">Reports</h1>
          <p className="text-[11px] text-[#A19F99] mt-0.5">Advanced reporting — coming soon</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 max-w-2xl">
        <div className="cl-card p-6 mb-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-lg bg-[#EDE9FE] flex items-center justify-center">
              <BarChart2 size={16} className="text-[#6D28D9]" />
            </div>
            <div>
              <p className="text-[13px] font-semibold text-[#111110]">What's coming</p>
              <p className="text-[11px] text-[#A19F99]">We're building these features now</p>
            </div>
          </div>
          <div className="space-y-3">
            {UPCOMING.map((item) => (
              <div key={item.title} className="flex gap-3 py-3 border-b border-[#F0EFEA] last:border-0">
                <Bell size={14} className="text-[#C8C6C0] mt-0.5 shrink-0" />
                <div>
                  <p className="text-[12px] font-medium text-[#111110]">{item.title}</p>
                  <p className="text-[11px] text-[#A19F99] mt-0.5">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="cl-card p-5">
          <div className="flex items-center gap-2 mb-3">
            <Mail size={14} className="text-[#6D28D9]" />
            <p className="text-[13px] font-medium text-[#111110]">Notify me when available</p>
          </div>
          {submitted ? (
            <div className="bg-[#D1FAE5] border border-[#A7F3D0] rounded-lg px-4 py-3">
              <p className="text-[12px] text-[#059669] font-medium">✓ You're on the list. We'll email you when Reports launches.</p>
            </div>
          ) : (
            <div className="flex gap-2">
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="cl-input flex-1"
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              />
              <button
                onClick={handleSubmit}
                disabled={loading || !email.includes('@')}
                className="cl-btn-primary px-4 py-2 text-[12px] rounded-lg whitespace-nowrap"
              >
                {loading ? 'Saving...' : 'Notify Me'}
              </button>
            </div>
          )}
          <p className="text-[10px] text-[#C8C6C0] mt-2">No spam. One email when it launches.</p>
        </div>
      </div>
    </div>
  );
}
