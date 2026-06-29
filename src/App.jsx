import { useState, useRef, useCallback } from 'react';
import EmailInputPane from './components/EmailInputPane.jsx';
import Dashboard      from './components/Dashboard.jsx';
import { runRuleBasedAnalysis }               from './utils/analyzer.js';
import { analyzeWithGemini, DEFAULT_MODEL }   from './utils/geminiApi.js';

const MODELS = [
  { value: 'gemini-2.0-flash',      label: 'Gemini 2.0 Flash (default)' },
  { value: 'gemini-2.5-flash',      label: 'Gemini 2.5 Flash (newest)'  },
  { value: 'gemini-2.0-flash-lite', label: 'Gemini 2.0 Flash-Lite (higher RPM)' },
];

function exportTriageReport(emailText, ruleData, geminiResult) {
  const report = {
    metadata:  { tool: 'PhishTriage SOC Toolkit v1.0', timestamp: new Date().toISOString() },
    summary:   { verdict: geminiResult?.verdict ?? 'Rule-based only', threatScore: geminiResult?.threatScore ?? ruleData?.ruleScore ?? 0, attackType: geminiResult?.attackType ?? 'N/A', cognitiveTriggers: geminiResult?.cognitiveTriggers ?? [] },
    analysis:  { reasoning: geminiResult?.reasoning ?? '', indicators: geminiResult?.indicators ?? [], recommendedActions: geminiResult?.recommendedActions ?? [] },
    technicalFindings: { headerAnalysis: ruleData?.headers ?? {}, urlDissections: ruleData?.urls ?? [], ruleFlagsTriggered: ruleData?.flags ?? [], ruleBasedScoreContribution: ruleData?.ruleScore ?? 0 },
    rawEmail: emailText,
  };
  const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = `phishtriage-report-${Date.now()}.json`;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
}

export default function App() {
  const [email,        setEmail]        = useState('');
  const [apiKey,       setApiKey]       = useState('');
  const [showKey,      setShowKey]      = useState(false);
  const [model,        setModel]        = useState(DEFAULT_MODEL);
  const [isLoading,    setIsLoading]    = useState(false);
  const [loadingStage, setLoadingStage] = useState('');
  const [ruleData,     setRuleData]     = useState(null);
  const [geminiResult, setGeminiResult] = useState(null);
  const [error,        setError]        = useState(null);

  // ─────────────────────────────────────────────────────────────────────────
  // useRef guard — prevents duplicate API calls.
  //
  // WHY useRef AND NOT just disabled={isLoading}:
  //   React setState is ASYNCHRONOUS. When the user clicks the button,
  //   setIsLoading(true) is called but the component has not re-rendered yet.
  //   The button's disabled prop still reads the OLD state (false) for the
  //   duration of that render cycle — long enough for a fast double-click or
  //   a re-render loop to fire a second request before the first one locks
  //   the button.
  //
  //   useRef updates are SYNCHRONOUS and INSTANT — the ref is set to true
  //   the moment handleAnalyze runs, so every subsequent call within that
  //   same tick is blocked immediately, before React even schedules a render.
  // ─────────────────────────────────────────────────────────────────────────
  const requestInFlight = useRef(false);

  const handleAnalyze = useCallback(async () => {
    // Synchronous gate — blocks every duplicate call before React re-renders
    if (requestInFlight.current) return;
    requestInFlight.current = true;

    // Validate inputs before touching any state
    if (!email.trim()) {
      setError('Paste email content first.');
      requestInFlight.current = false;
      return;
    }
    if (!apiKey.trim()) {
      setError('Enter your Gemini API key.');
      requestInFlight.current = false;
      return;
    }

    setIsLoading(true);
    setError(null);
    setGeminiResult(null);
    setRuleData(null);

    try {
      // Stage 1 — local rule engine (synchronous, no API calls)
      setLoadingStage('⚡ Running rule engine…');
      await new Promise(r => setTimeout(r, 80)); // yield to let React render the stage label
      const rules = runRuleBasedAnalysis(email);
      setRuleData(rules);

      // Stage 2 — Gemini (single request, guarded by requestInFlight above)
      setLoadingStage(`🧠 Calling ${model}…`);
      const result = await analyzeWithGemini(email, rules, apiKey, model);
      setGeminiResult(result);

    } catch (err) {
      setError(err.message);
    } finally {
      // Always release the lock and reset UI — even on error
      requestInFlight.current = false;
      setIsLoading(false);
      setLoadingStage('');
    }
  }, [email, apiKey, model]); // only recreated when these values change

  const handleClear = useCallback(() => {
    if (requestInFlight.current) return; // don't clear mid-request
    setEmail(''); setRuleData(null); setGeminiResult(null); setError(null);
  }, []);

  const hasResult = ruleData || geminiResult;

  return (
    <div className="flex flex-col"
      style={{ height: '100vh', background: '#06091a', fontFamily: "'Inter', system-ui, sans-serif" }}>

      {/* ── Header ── */}
      <header className="flex items-center justify-between px-5 py-2.5 flex-shrink-0 sticky top-0 z-10"
        style={{ background: '#0a0e1f', borderBottom: '1px solid #1e2d4a' }}>

        <div className="flex items-center gap-3">
          <div className="px-3 py-1.5 rounded-lg text-sm font-extrabold tracking-wide text-white"
            style={{ background: 'linear-gradient(135deg,#2563eb,#7c3aed)' }}>
            ⚡ PHISHTRIAGE
          </div>
          <span className="text-xs tracking-widest" style={{ color: '#1e3a5f' }}>
            SOC ANALYST TOOLKIT
          </span>
        </div>

        <div className="flex items-center gap-3 flex-wrap justify-end">

          {/* Model selector — switch without editing code */}
          <div className="flex items-center gap-2">
            <span className="text-xs tracking-widest" style={{ color: '#475569' }}>MODEL</span>
            <select
              value={model}
              onChange={e => setModel(e.target.value)}
              disabled={isLoading}
              style={{
                background: '#111827', border: '1px solid #1e2d4a',
                color: '#e2e8f0', borderRadius: 6, padding: '5px 8px',
                fontSize: 12, outline: 'none',
                cursor: isLoading ? 'not-allowed' : 'pointer',
              }}>
              {MODELS.map(m => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>

          {/* API key */}
          <div className="flex items-center gap-2">
            <span className="text-xs tracking-widest" style={{ color: '#475569' }}>GEMINI KEY</span>
            <div className="relative flex items-center">
              <input
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={e => setApiKey(e.target.value)}
                placeholder="AIzaSy…"
                style={{
                  background: '#111827', border: '1px solid #1e2d4a',
                  color: '#e2e8f0', borderRadius: 6,
                  padding: '5px 28px 5px 10px', fontSize: 12, width: 190, outline: 'none',
                }}
              />
              <button onClick={() => setShowKey(v => !v)}
                style={{ position: 'absolute', right: 7, background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: 12 }}>
                {showKey ? '🙈' : '👁'}
              </button>
            </div>
          </div>

          {/* Export — only rendered when there are results */}
          {hasResult && (
            <button
              onClick={() => exportTriageReport(email, ruleData, geminiResult)}
              className="text-xs px-3 py-1.5 rounded-md font-semibold"
              style={{ background: '#0d1626', border: '1px solid #2563eb', color: '#60a5fa', cursor: 'pointer' }}>
              ⬇ EXPORT REPORT
            </button>
          )}
        </div>
      </header>

      {/* ── Split pane ── */}
      <div className="flex-1 min-h-0" style={{ display: 'grid', gridTemplateColumns: '40% 60%' }}>
        <EmailInputPane
          email={email}
          onEmailChange={setEmail}
          onAnalyze={handleAnalyze}
          onClear={handleClear}
          isLoading={isLoading}
          loadingStage={loadingStage}
          error={error}
        />
        <div className="overflow-auto" style={{ background: '#08101f' }}>
          <Dashboard ruleData={ruleData} geminiResult={geminiResult} isAnalyzing={isLoading} />
        </div>
      </div>
    </div>
  );
}
