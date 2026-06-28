// ═══════════════════════════════════════════════════════════════════════════
//  src/App.jsx
//  Root application — manages global state, orchestrates analysis pipeline,
//  and renders the split-pane layout.
//
//  ANALYSIS PIPELINE:
//    1. runRuleBasedAnalysis(emailText)  — local, instant, zero API calls
//       Extracts headers, parses URLs with RTL dissection, runs visual
//       illusion checks. Produces ruleData with flags and ruleScore (0–65).
//
//    2. analyzeWithGemini(email, ruleData, apiKey)  — async, calls Gemini API
//       Sends email + ruleData as structured context. Returns threatScore,
//       verdict, attackType, cognitiveTriggers, IOCs, and employeeChecklist.
//
//  The two-stage pipeline means the UI shows rule-based flags immediately
//  while Gemini performs the deeper cognitive analysis.
// ═══════════════════════════════════════════════════════════════════════════

import { useState } from 'react';
import EmailInputPane from './components/EmailInputPane.jsx';
import Dashboard      from './components/Dashboard.jsx';
import { runRuleBasedAnalysis }  from './utils/analyzer.js';
import { analyzeWithGemini }     from './utils/geminiApi.js';

// ── Export triage report ───────────────────────────────────────────────────
function exportTriageReport(emailText, ruleData, geminiResult) {
  const report = {
    metadata: {
      tool:       'PhishTriage SOC Toolkit v1.0',
      timestamp:  new Date().toISOString(),
      analyst:    'Automated Analysis (Rule Engine + Gemini 1.5 Flash)',
    },
    summary: {
      verdict:           geminiResult?.verdict      ?? 'Rule-based only',
      threatScore:       geminiResult?.threatScore  ?? ruleData?.ruleScore ?? 0,
      attackType:        geminiResult?.attackType   ?? 'N/A',
      cognitiveTriggers: geminiResult?.cognitiveTriggers ?? [],
    },
    analysis: {
      reasoning:          geminiResult?.reasoning          ?? '',
      indicators:         geminiResult?.indicators         ?? [],
      recommendedActions: geminiResult?.recommendedActions ?? [],
    },
    technicalFindings: {
      headerAnalysis:      ruleData?.headers ?? {},
      urlDissections:      ruleData?.urls    ?? [],
      ruleFlagsTriggered:  ruleData?.flags   ?? [],
      ruleBasedScoreContribution: ruleData?.ruleScore ?? 0,
    },
    rawEmail: emailText,
  };

  const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `phishtriage-report-${Date.now()}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ── App ────────────────────────────────────────────────────────────────────
export default function App() {
  const [email,        setEmail]        = useState('');
  const [apiKey,       setApiKey]       = useState('');
  const [showKey,      setShowKey]      = useState(false);
  const [isLoading,    setIsLoading]    = useState(false);
  const [loadingStage, setLoadingStage] = useState('');
  const [ruleData,     setRuleData]     = useState(null);
  const [geminiResult, setGeminiResult] = useState(null);
  const [error,        setError]        = useState(null);

  const hasResult = ruleData || geminiResult;

  // ── Main analysis pipeline ───────────────────────────────────────────────
  const handleAnalyze = async () => {
    if (!email.trim())    { setError('Paste email content first.');           return; }
    if (!apiKey.trim())   { setError('Enter your Gemini API key.');           return; }

    setIsLoading(true);
    setError(null);
    setGeminiResult(null);
    setRuleData(null);

    try {
      // STAGE 1: Local rule engine (synchronous — shows results immediately)
      setLoadingStage('⚡ Running rule engine…');
      await new Promise((r) => setTimeout(r, 100)); // allow React to re-render
      const rules = runRuleBasedAnalysis(email);
      setRuleData(rules);

      // STAGE 2: Gemini API call (async — rule results visible during wait)
      setLoadingStage('🧠 Contacting Gemini API…');
      const result = await analyzeWithGemini(email, rules, apiKey);
      setGeminiResult(result);

    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
      setLoadingStage('');
    }
  };

  const handleClear = () => {
    setEmail('');
    setRuleData(null);
    setGeminiResult(null);
    setError(null);
  };

  return (
    <div
      className="flex flex-col"
      style={{ height: '100vh', background: '#06091a', fontFamily: "'Inter', system-ui, sans-serif" }}
    >
      {/* ── App header ── */}
      <header
        className="flex items-center justify-between px-5 py-2.5 flex-shrink-0 sticky top-0 z-10"
        style={{ background: '#0a0e1f', borderBottom: '1px solid #1e2d4a' }}
      >
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div
            className="px-3 py-1.5 rounded-lg text-[14px] font-extrabold tracking-wide text-white"
            style={{ background: 'linear-gradient(135deg, #2563eb, #7c3aed)' }}
          >
            ⚡ PHISHTRIAGE
          </div>
          <span className="text-[11px] tracking-[2px]" style={{ color: '#1e3a5f' }}>
            SOC ANALYST TOOLKIT
          </span>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-3">
          {/* API key input */}
          <span className="text-[11px] tracking-widest" style={{ color: '#475569' }}>
            GEMINI KEY
          </span>
          <div className="relative flex items-center">
            <input
              type={showKey ? 'text' : 'password'}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="AIzaSy…"
              className="rounded-md text-xs pr-8"
              style={{ width: 190 }}
            />
            <button
              onClick={() => setShowKey((v) => !v)}
              className="absolute right-2 text-xs"
              style={{
                background: 'none', border: 'none',
                color: '#64748b', cursor: 'pointer',
              }}
              title={showKey ? 'Hide API key' : 'Show API key'}
            >
              {showKey ? '🙈' : '👁'}
            </button>
          </div>

          {/* Export button — only shown when there are results */}
          {hasResult && (
            <button
              onClick={() => exportTriageReport(email, ruleData, geminiResult)}
              className="text-xs px-3 py-1.5 rounded-md font-semibold transition-colors"
              style={{
                background: '#0d1626',
                border: '1px solid #2563eb',
                color: '#60a5fa',
                cursor: 'pointer',
              }}
            >
              ⬇ EXPORT REPORT
            </button>
          )}
        </div>
      </header>

      {/* ── Split pane ── */}
      <div
        className="flex-1 min-h-0"
        style={{ display: 'grid', gridTemplateColumns: '40% 60%' }}
      >
        {/* LEFT: Email input */}
        <EmailInputPane
          email={email}
          onEmailChange={setEmail}
          onAnalyze={handleAnalyze}
          onClear={handleClear}
          isLoading={isLoading}
          loadingStage={loadingStage}
          error={error}
        />

        {/* RIGHT: Analysis dashboard */}
        <div className="overflow-auto" style={{ background: '#08101f' }}>
          <Dashboard
            ruleData={ruleData}
            geminiResult={geminiResult}
            isAnalyzing={isLoading}
          />
        </div>
      </div>
    </div>
  );
}
