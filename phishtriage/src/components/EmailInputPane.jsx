// ═══════════════════════════════════════════════════════════════════════════
//  src/components/EmailInputPane.jsx
//  Left-panel email input area.
//  Features: raw text area, stats bar, load sample, analyze button.
// ═══════════════════════════════════════════════════════════════════════════

// A realistic sample email that triggers all four rule-based detections:
//   1. Sender domain mismatch  (From ≠ Return-Path ≠ Reply-To)
//   2. Subdomain trap URL      (paypal.com.secure-verify.mailservices-hub.xyz)
//   3. URL shortener           (bit.ly/...)
//   4. Typosquatting domain    (paypa1-alerts.ru)
export const SAMPLE_EMAIL = `From: "PayPal Security Team" <security@paypa1-alerts.ru>
Return-Path: <noreply@mailservices-hub.xyz>
Reply-To: support@paypa1-alerts.ru
Subject: ⚠️ URGENT: Your account has been SUSPENDED — Verify Now
Received: from mail.paypa1-alerts.ru ([185.220.101.45])
Date: Mon, 01 Jan 2024 08:23:11 +0000

Dear Valued Customer,

Your PayPal account has been SUSPENDED due to unusual activity detected on your account. You must verify your information within 24 hours or your account will be permanently closed and your funds frozen.

VERIFY YOUR ACCOUNT NOW:
https://paypal.com.secure-verify.mailservices-hub.xyz/confirm?token=a8f3k2j9

If the link above does not work, use our secure alternative:
https://bit.ly/3xK9mPq

IMPORTANT: Failure to verify within 24 hours will result in permanent account closure per our security policy (section 7.3). Your funds may be held for up to 180 days pending investigation.

Act immediately. Do not ignore this message. Our security team is monitoring your account.

PayPal Security Response Team
© 2024 PayPal Holdings, Inc. | 2211 North First Street, San Jose, CA 95131`;


export default function EmailInputPane({
  email,
  onEmailChange,
  onAnalyze,
  onClear,
  isLoading,
  loadingStage,
  error,
}) {
  const lineCount = email.split('\n').length;
  const charCount = email.length;
  const urlCount  = (email.match(/https?:\/\//g) || []).length;

  return (
    <div
      className="flex flex-col h-full"
      style={{ background: '#070b18', borderRight: '1px solid #1e2d4a' }}
    >
      {/* Pane header */}
      <div
        className="flex items-center justify-between px-3.5 py-2.5 flex-shrink-0"
        style={{ borderBottom: '1px solid #1e2d4a' }}
      >
        <span className="text-[10px] font-bold tracking-[2px] text-sky-400">
          📧 RAW EMAIL INPUT
        </span>
        <div className="flex gap-1.5">
          <button
            onClick={() => onEmailChange(SAMPLE_EMAIL)}
            className="text-[10px] px-2 py-0.5 rounded tracking-widest transition-colors"
            style={{
              background: 'none',
              border: '1px solid #1e2d4a',
              color: '#475569',
              cursor: 'pointer',
            }}
            title="Load a pre-built sample email with multiple phishing indicators"
          >
            LOAD SAMPLE
          </button>
          {email && (
            <button
              onClick={onClear}
              className="text-[10px] px-2 py-0.5 rounded"
              style={{
                background: 'none',
                border: '1px solid #1e2d4a',
                color: '#475569',
                cursor: 'pointer',
              }}
            >
              CLEAR
            </button>
          )}
        </div>
      </div>

      {/* Textarea */}
      <textarea
        value={email}
        onChange={(e) => onEmailChange(e.target.value)}
        placeholder={
          'Paste raw email here (headers + body)...\n\n' +
          'Tip: include email headers for maximum detection accuracy:\n' +
          'From: "Company" <sender@domain.com>\n' +
          'Return-Path: <bounce@domain.com>\n' +
          'Reply-To: <reply@domain.com>\n' +
          'Subject: ...\n\n' +
          'Then the email body below the blank line.'
        }
        className="flex-1 outline-none resize-none px-3.5 py-3.5 text-[12px] leading-relaxed"
        style={{
          background: 'transparent',
          border: 'none',
          color: '#94a3b8',
          fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
        }}
        spellCheck={false}
      />

      {/* Analyze button */}
      <div
        className="px-3.5 py-2.5 flex-shrink-0"
        style={{ borderTop: '1px solid #1e2d4a' }}
      >
        <button
          onClick={onAnalyze}
          disabled={isLoading}
          className="w-full rounded-lg py-2.5 text-[13px] font-bold tracking-wide flex items-center justify-center gap-2 transition-opacity"
          style={{
            background: isLoading
              ? '#1e3a5f'
              : 'linear-gradient(135deg, #2563eb, #7c3aed)',
            border: 'none',
            color: 'white',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            opacity: isLoading ? 0.75 : 1,
          }}
        >
          {isLoading && <span className="spinner" />}
          {isLoading ? (loadingStage || 'ANALYZING…') : '⚡ RUN TRIAGE ANALYSIS'}
        </button>
      </div>

      {/* Error display */}
      {error && (
        <div
          className="mx-3.5 mb-3 rounded-md px-3 py-2.5 text-xs leading-relaxed"
          style={{ background: '#2d1010', border: '1px solid #7f1d1d', color: '#fca5a5' }}
        >
          ⚠ {error}
        </div>
      )}

      {/* Stats bar */}
      {email && (
        <div
          className="px-3.5 py-1.5 flex gap-4 text-[10px] flex-shrink-0"
          style={{ borderTop: '1px solid #1e2d4a', color: '#334155' }}
        >
          <span>{lineCount} lines</span>
          <span>{charCount.toLocaleString()} chars</span>
          <span>{urlCount} URL{urlCount !== 1 ? 's' : ''} detected</span>
        </div>
      )}
    </div>
  );
}
