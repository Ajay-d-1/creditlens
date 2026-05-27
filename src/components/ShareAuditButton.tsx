'use client';

import { useEffect, useState } from 'react';

interface ShareAuditButtonProps {
  url: string;
  idleLabel?: string;
  copiedLabel?: string;
  className?: string;
}

export function ShareAuditButton({
  url,
  idleLabel = 'Share this audit',
  copiedLabel = 'Copied!',
  className = 'rounded-lg border border-cyan-400/60 px-5 py-3 font-semibold text-cyan-300 transition-colors hover:border-cyan-300 hover:bg-cyan-400/10',
}: ShareAuditButtonProps) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;

    const timeoutId = window.setTimeout(() => {
      setCopied(false);
    }, 2000);

    return () => window.clearTimeout(timeoutId);
  }, [copied]);

  async function copyShareUrl() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch (error) {
      console.error('Could not copy share URL:', error);
    }
  }

  return (
    <button
      type="button"
      onClick={copyShareUrl}
      className={className}
    >
      {copied ? copiedLabel : idleLabel}
    </button>
  );
}
