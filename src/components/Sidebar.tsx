'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Search,
  FileText,
  Clock,
  Share2,
  Zap,
} from 'lucide-react';

const NAV_SECTIONS = [
  {
    label: 'Workspace',
    items: [
      { href: '/', icon: Search, label: 'Audit' },
      { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    ],
  },
  {
    label: 'History',
    items: [
      { href: '/reports', icon: FileText, label: 'Reports' },
      { href: '/dashboard', icon: Clock, label: 'Past Audits' },
      { href: '#', icon: Share2, label: 'Shared' },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex w-[220px] shrink-0 flex-col border-r border-[#E5E4DF] bg-white h-full">
      {/* Logo */}
      <div className="px-5 pt-5 pb-6">
        <Link href="/" className="block">
          <h1 className="text-[14px] font-semibold text-[#6D28D9] tracking-tight">
            CreditLens
          </h1>
          <p className="text-[9px] uppercase tracking-[0.2em] text-[#A19F99] mt-0.5">
            AI Spend Intelligence
          </p>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 space-y-5 overflow-y-auto">
        {NAV_SECTIONS.map((section) => (
          <div key={section.label}>
            <p className="cl-label px-2 mb-2">{section.label}</p>
            <ul className="space-y-0.5">
              {section.items.map((item) => {
                const isActive =
                  item.href === '/'
                    ? pathname === '/'
                    : pathname.startsWith(item.href) && item.href !== '#';
                const Icon = item.icon;

                return (
                  <li key={item.label}>
                    <Link
                      href={item.href}
                      className={`flex items-center gap-2.5 rounded-md px-2.5 py-[7px] text-[12px] transition-colors ${
                        isActive
                          ? 'bg-[#EDE9FE] text-[#5B21B6] font-medium'
                          : 'text-[#605F5B] hover:bg-[#F4F4F1]'
                      }`}
                    >
                      {isActive && (
                        <span className="w-1 h-1 rounded-full bg-[#6D28D9] shrink-0" />
                      )}
                      <Icon size={14} strokeWidth={1.8} />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Upgrade card */}
      <div className="p-3 mt-auto border-t border-[#E5E4DF]">
        <div className="rounded-lg border border-[#E5E4DF] bg-[#F4F4F1] p-3">
          <div className="flex items-center gap-2 mb-1.5">
            <div className="flex h-5 w-5 items-center justify-center rounded-md bg-[#EDE9FE]">
              <Zap size={10} className="text-[#6D28D9]" />
            </div>
            <span className="text-[11px] font-medium text-[#111110]">
              Upgrade to Pro
            </span>
          </div>
          <p className="text-[10px] text-[#A19F99] leading-relaxed mb-2.5">
            Unlock unlimited audits, team analytics, and AI recommendations.
          </p>
          <button
            type="button"
            className="cl-btn-primary w-full !text-[10px] !py-1.5"
          >
            Upgrade
          </button>
        </div>
      </div>
    </aside>
  );
}
