// ═══════════════════════════════════════════════════════════════════════════
//  src/components/Dashboard.jsx
//  Right-hand SOC analysis dashboard.
//  Composes all analysis widgets and handles the technical/employee toggle.
// ═══════════════════════════════════════════════════════════════════════════

import { useState } from 'react';
import ThreatGauge from './ThreatGauge.jsx';
import UrlDissectionTable from './UrlDissectionTable.jsx';
import HeaderForensics from './HeaderForensics.jsx';
import EmployeeChecklist from './EmployeeChecklist.jsx';

// ── Shared primitives ──────────────────────────────────────────────────────
function Card({ children, style = {}, dangerBorder = false }) {
  return (
    <div
      className="rounded-[10px] p-3.5"
      style={{
        background: '#0d1626',
        border: `1px solid ${dangerBorder ? '#7f1d1d' : '#1e2d4a'}`,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function SectionLabel({ icon, text }) {
  return (
    <p className="text-[10px] font-bold tracking-[2px] text-sky-400 mb-2.5">
      {icon} {text}
    </p>
  );
}

function SeverityBadge({ severity }) {
  const config = {
    critical: { bg: '#2d1b1b', border: '#991b1b', text: '#f87171' },
    high:     { bg: '#2d1f0e', border: '#92400e', text: '#fbbf24' },
    medium:   { bg: '#0d1f18', border: '#065f46', text: '#34d399' },
    low:      { bg: '#0d1626', border: '#1e3a5f', text: '#60a5fa' },
  };
  const c = config[severity] || config.low;
  return (
    <span
      className="rounded px-1.5 py-0.5 text-[9px] font-bold tracking-widest flex-shrink-0 self-start mt-0.5"
      style={{ background: c.bg, border: `1px solid ${c.border}`, color: c.text }}
    >
      {severity.toUpperCase()}
    </span>
  );
}

// ── Verdict banner configs ─────────────────────────────────────────────────
const VERDICT_CONFIG = {
  'Safe (Close)': {
    bg: '#052e16', border: '#065f46', icon: '✅', color: '#34d399',
  },
  'Suspicious (Warn User)': {
    bg: '#2d1b0e', border: '#92400e', icon: '⚠️', color: '#f59e0b',
  },
  'Malicious (Block Domain & Escalate)': {
    bg: '#2d1010', border: '#991b1b', icon: '🚨', color: '#ef4444',
  },
};

// ── Technical Dashboard view ───────────────────────────────────────────────
function TechnicalView({ ruleData, geminiResult, isAnalyzing }) {
  const verdict = geminiResult?.verdict;
  const score   = geminiResult?.threatScore ?? ruleData?.ruleScore ?? 0;
  const vc      = verdict ? (VERDICT_CONFIG[verdict] || VERDICT_CONFIG['Suspicious (Warn User)']) : null;

  return (
    <div className="fadein flex flex-col gap-3">

      {/* ── Row 1: Gauge + Verdict ── */}
      <div className="grid gap-3" style={{ gridTemplateColumns: '210px 1fr' }}>

        {/* Threat score gauge */}
        <Card style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', paddingBottom: 20 }}>
          <ThreatGauge score={score} />
        </Card>

        {/* Verdict panel */}
        <Card>
          <SectionLabel icon="⚖️" text="FINAL VERDICT" />

          {/* Loading state */}
          {isAnalyzing && !geminiResult && (
            <div className="flex items-center gap-2 text-sky-400">
              <span className="spinner" />
              <span className="text-xs">Cognitive engine analyzing…</span>
            </div>
          )}

          {/* Gemini result */}
          {geminiResult && vc && (
            <>
              {/* Verdict banner */}
              <div
                className="rounded-lg px-3.5 py-2.5 mb-2.5"
                style={{ background: vc.bg, border: `1px solid ${vc.border}` }}
              >
                <p className="text-xl mb-1">{vc.icon}</p>
                <p className="font-extrabold text-[14px] tracking-wide text-white">{verdict}</p>
              </div>

              {/* Attack type + cognitive trigger chips */}
              <div className="flex flex-wrap gap-1.5 mb-2.5">
                <span
                  className="rounded px-2.5 py-0.5 text-[11px] font-bold"
                  style={{ background: '#0d1a2e', border: '1px solid #2563eb40', color: '#60a5fa' }}
                >
                  🎯 {geminiResult.attackType}
                </span>
                {geminiResult.cognitiveTriggers?.map((t, i) => (
                  <span
                    key={i}
                    className="rounded px-2.5 py-0.5 text-[11px]"
                    style={{ background: '#1c1228', border: '1px solid #6d28d9', color: '#c4b5fd' }}
                  >
                    🧠 {t}
                  </span>
                ))}
              </div>

              {/* Forensic reasoning */}
              {geminiResult.reasoning && (
                <p
                  className="text-xs leading-relaxed italic pl-2.5"
                  style={{ color: '#94a3b8', borderLeft: '3px solid #1e2d4a' }}
                >
                  {geminiResult.reasoning}
                </p>
              )}
            </>
          )}

          {/* Rule-only state (Gemini pending) */}
          {!geminiResult && ruleData && (
            <p className="text-slate-600 text-xs">
              Rule analysis complete — {ruleData.flags.length} flag(s) detected.
              {isAnalyzing ? ' Awaiting Gemini response…' : ' Submit to run Gemini analysis.'}
            </p>
          )}
        </Card>
      </div>

      {/* ── Rule Engine Flags ── */}
      {ruleData?.flags?.length > 0 && (
        <Card>
          <SectionLabel icon="⚡" text="RULE ENGINE FLAGS" />
          <div className="flex flex-col gap-1.5">
            {ruleData.flags.map((flag, i) => (
              <div
                key={i}
                className="flex items-start gap-2 rounded px-2.5 py-2"
                style={{ background: '#080c1a', border: '1px solid #1e2d4a' }}
              >
                <SeverityBadge severity={flag.severity} />
                <div>
                  <p className="text-[12px] font-semibold text-slate-200 mb-0.5">{flag.label}</p>
                  <p className="text-[11px]" style={{ color: '#64748b' }}>{flag.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* ── Header Forensics ── */}
      {ruleData?.headers && <HeaderForensics headers={ruleData.headers} />}

      {/* ── URL Dissection ── */}
      {ruleData?.urls !== undefined && <UrlDissectionTable urls={ruleData.urls} />}

      {/* ── IOCs + Recommended Actions ── */}
      {geminiResult && (
        <div className="grid grid-cols-2 gap-3">
          {/* Indicators of Compromise */}
          <Card>
            <SectionLabel icon="🔍" text="INDICATORS OF COMPROMISE" />
            <div className="flex flex-col">
              {geminiResult.indicators?.map((ioc, i) => (
                <div
                  key={i}
                  className="flex gap-1.5 items-start py-1.5"
                  style={{ borderBottom: '1px solid #1e2d4a' }}
                >
                  <span className="text-red-500 text-[10px] mt-0.5 flex-shrink-0">◆</span>
                  <span className="text-[11px] leading-relaxed" style={{ color: '#94a3b8' }}>{ioc}</span>
                </div>
              ))}
            </div>
          </Card>

          {/* Recommended Actions */}
          <Card>
            <SectionLabel icon="🛡️" text="RECOMMENDED ACTIONS" />
            <div className="flex flex-col">
              {geminiResult.recommendedActions?.map((action, i) => (
                <div
                  key={i}
                  className="flex gap-1.5 items-start py-1.5"
                  style={{ borderBottom: '1px solid #1e2d4a' }}
                >
                  <span
                    className="text-[10px] mt-0.5 flex-shrink-0 font-bold"
                    style={{ color: '#0ea5e9', minWidth: 14 }}
                  >
                    {i + 1}.
                  </span>
                  <span className="text-[11px] leading-relaxed" style={{ color: '#94a3b8' }}>{action}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

// ── Main Dashboard ─────────────────────────────────────────────────────────
export default function Dashboard({ ruleData, geminiResult, isAnalyzing }) {
  const [view, setView] = useState('tech');

  if (!ruleData && !geminiResult) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <div className="text-[60px] opacity-[0.07]">🛡️</div>
        <p className="text-[12px] tracking-[3px]" style={{ color: '#1e3a5f' }}>
          AWAITING EMAIL INPUT
        </p>
        <p className="text-[11px] text-center max-w-xs leading-relaxed" style={{ color: '#0f1a2e' }}>
          Paste a suspicious email on the left and run the triage analysis.
        </p>
      </div>
    );
  }

  return (
    <div className="p-4">
      {/* View toggle */}
      <div
        className="flex gap-1 mb-4 w-fit rounded-lg p-1"
        style={{ background: '#0a0e1f', border: '1px solid #1e2d4a' }}
      >
        {[
          { id: 'tech', label: '⚙ SOC TECHNICAL VIEW' },
          { id: 'emp',  label: '👤 EMPLOYEE CHECKLIST' },
        ].map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setView(id)}
            className="px-3.5 py-1.5 rounded-md text-[10px] font-bold tracking-widest transition-colors"
            style={{
              background: view === id ? '#1e40af' : 'transparent',
              color:      view === id ? '#93c5fd' : '#475569',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {view === 'tech' ? (
        <TechnicalView ruleData={ruleData} geminiResult={geminiResult} isAnalyzing={isAnalyzing} />
      ) : (
        <EmployeeChecklist geminiResult={geminiResult} ruleData={ruleData} />
      )}
    </div>
  );
}
