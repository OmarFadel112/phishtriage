// ═══════════════════════════════════════════════════════════════════════════
//  src/components/UrlDissectionTable.jsx
//  Displays the RTL-parsed URL dissections from analyzer.js.
//
//  For each URL shows:
//    - The original URL (monospace, full-width)
//    - TRUE ROOT DOMAIN  — highlighted red if flagged, green if clean
//    - DECEPTIVE SUBDOMAIN — shown amber when a trap brand is found
//    - Flag badges: SUBDOMAIN TRAP / URL SHORTENER / VISUAL ILLUSION
//    - Expand button for shortener URLs (calls async expandUrlShortener)
// ═══════════════════════════════════════════════════════════════════════════

import { useState } from 'react';
import { expandUrlShortener } from '../utils/analyzer.js';

function FlagBadge({ children, variant }) {
  const styles = {
    trap:     'bg-[#2d1b1b] border border-[#991b1b] text-red-400',
    shortener:'bg-[#271c0e] border border-[#92400e] text-amber-400',
    illusion: 'bg-[#1c1228] border border-[#6d28d9] text-violet-300',
    clean:    'text-[#1e3a5f]',
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${styles[variant]}`}>
      {children}
    </span>
  );
}

function UrlCard({ url }) {
  const [expandResult, setExpandResult] = useState(null);
  const [expanding, setExpanding] = useState(false);

  const handleExpand = async () => {
    setExpanding(true);
    const result = await expandUrlShortener(url.original);
    setExpandResult(result);
    setExpanding(false);
  };

  const borderColor = url.isTrap    ? '#7f1d1d'
    : url.isShortener               ? '#78350f'
    : '#1e2d4a';

  return (
    <div
      className="rounded-lg p-2.5"
      style={{ background: '#080d1a', border: `1px solid ${borderColor}` }}
    >
      {/* Original URL */}
      <p className="text-[11px] font-mono text-slate-500 break-all mb-2 leading-relaxed">
        {url.original}
      </p>

      {/* Root domain / Subdomain split */}
      <div className="grid grid-cols-2 gap-1.5 mb-2">
        {/* TRUE ROOT — right-to-left result */}
        <div className="rounded p-1.5" style={{ background: '#0d1626' }}>
          <p className="text-[9px] tracking-widest text-slate-500 mb-1">▶ TRUE ROOT DOMAIN</p>
          <p
            className="font-mono text-[13px] font-bold"
            style={{ color: url.isTrap ? '#f87171' : '#34d399' }}
          >
            {url.rootDomain}
          </p>
        </div>

        {/* DECEPTIVE SUBDOMAIN — only shown when present */}
        {url.subdomainLabel && (
          <div className="rounded p-1.5" style={{ background: '#0d1626' }}>
            <p className="text-[9px] tracking-widest text-slate-500 mb-1">⚠ DECEPTIVE SUBDOMAIN</p>
            <p className="font-mono text-[12px] font-bold text-amber-400">
              {url.subdomainLabel}
            </p>
          </div>
        )}
      </div>

      {/* Flag badges */}
      <div className="flex flex-wrap gap-1.5">
        {url.isTrap && (
          <FlagBadge variant="trap">
            🪤 SUBDOMAIN TRAP — mimics &ldquo;{url.trapBrand}&rdquo;
          </FlagBadge>
        )}
        {url.isShortener && (
          <FlagBadge variant="shortener">🔒 URL SHORTENER</FlagBadge>
        )}
        {url.visualIllusions.map((v, j) => (
          <FlagBadge key={j} variant="illusion">
            🎭 {v.type}: {v.detail}
          </FlagBadge>
        ))}
        {!url.isTrap && !url.isShortener && url.visualIllusions.length === 0 && (
          <FlagBadge variant="clean">✓ No flags detected</FlagBadge>
        )}
      </div>

      {/* Expand button for shorteners */}
      {url.isShortener && (
        <div className="mt-2">
          {!expandResult ? (
            <button
              onClick={handleExpand}
              disabled={expanding}
              className="flex items-center gap-1.5 text-[10px] font-semibold text-sky-400 px-2.5 py-1 rounded"
              style={{ background: '#1e2d4a', border: '1px solid #2563eb' }}
            >
              {expanding && <span className="spinner" style={{ width: 10, height: 10 }} />}
              {expanding ? 'Attempting expansion...' : '🔍 Attempt URL Expansion'}
            </button>
          ) : (
            <div
              className="rounded p-2 text-[10px] leading-relaxed"
              style={{ background: '#1c1a0e', border: '1px solid #78350f' }}
            >
              <span className="text-amber-400 font-bold">Expansion result: </span>
              <span className="text-amber-200">{expandResult.note}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function UrlDissectionTable({ urls }) {
  if (!urls?.length) {
    return (
      <div className="rounded-[10px] p-3.5" style={{ background: '#0d1626', border: '1px solid #1e2d4a' }}>
        <p className="text-[10px] font-bold tracking-[2px] text-sky-400 mb-2">🔗 URL DISSECTION</p>
        <p className="text-slate-600 text-xs">No URLs detected in this email.</p>
      </div>
    );
  }

  return (
    <div className="rounded-[10px] p-3.5" style={{ background: '#0d1626', border: '1px solid #1e2d4a' }}>
      <p className="text-[10px] font-bold tracking-[2px] text-sky-400 mb-3">
        🔗 URL DISSECTION — {urls.length} FOUND
      </p>
      <div className="flex flex-col gap-2">
        {urls.map((url, i) => (
          <UrlCard key={i} url={url} />
        ))}
      </div>
    </div>
  );
}
