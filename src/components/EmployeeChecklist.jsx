// ═══════════════════════════════════════════════════════════════════════════
//  src/components/EmployeeChecklist.jsx
//  Translates the technical SOC verdict into a plain-language red-flag
//  checklist intended for non-technical end-users.
//
//  The checklist items map directly to the employeeChecklist fields in the
//  Gemini response. Items are flagged red when the model determines the
//  characteristic is present in the email.
// ═══════════════════════════════════════════════════════════════════════════

const CHECKLIST_ITEMS = [
  {
    key: 'suspicious_sender',
    icon: '👤',
    label: 'Suspicious sender address',
    desc: "The sender's email address looks fake, unusual, or is misspelled.",
  },
  {
    key: 'mismatched_domains',
    icon: '🔀',
    label: 'Display name doesn\'t match the domain',
    desc: 'The name shown (e.g. "PayPal") doesn\'t match where the email actually came from.',
  },
  {
    key: 'urgent_language',
    icon: '⏰',
    label: 'Creates urgency or threatens consequences',
    desc: 'Uses time pressure ("24 hours"), threats of account closure, or emergency framing.',
  },
  {
    key: 'requests_credentials',
    icon: '🔑',
    label: 'Asks you to log in or verify credentials',
    desc: 'Requests your password, username, OTP, or asks you to "verify" your account.',
  },
  {
    key: 'suspicious_links',
    icon: '🔗',
    label: 'Contains suspicious or obfuscated links',
    desc: 'Links that look odd, use URL shorteners, or lead to unexpected domains.',
  },
  {
    key: 'unusual_attachments',
    icon: '📎',
    label: 'Unexpected files, QR codes, or attachments',
    desc: 'Contains files or QR codes you were not expecting or asked for.',
  },
  {
    key: 'too_good_to_be_true',
    icon: '🎁',
    label: 'Offer seems too good to be true',
    desc: 'Promises prizes, unexpected refunds, money, or deals that feel unrealistic.',
  },
  {
    key: 'generic_greeting',
    icon: '✉️',
    label: 'Uses a generic greeting',
    desc: 'Says "Dear Customer" or "Dear User" rather than your actual name.',
  },
];

function ChecklistItem({ item, flagged }) {
  return (
    <div
      className="flex gap-2.5 rounded-lg p-2.5"
      style={{
        background: flagged ? '#1a0f0f' : '#080d1a',
        border: `1px solid ${flagged ? '#7f1d1d' : '#1e2d4a'}`,
        borderLeft: `3px solid ${flagged ? '#ef4444' : '#1e3a5f'}`,
      }}
    >
      <span className="text-base mt-0.5 flex-shrink-0">{item.icon}</span>
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-start mb-1">
          <span
            className="text-[12px] font-semibold"
            style={{ color: flagged ? '#f87171' : '#94a3b8' }}
          >
            {item.label}
          </span>
          <span className="text-sm ml-2 flex-shrink-0">{flagged ? '🔴' : '🟢'}</span>
        </div>
        <p className="text-[11px] leading-relaxed" style={{ color: '#475569' }}>
          {item.desc}
        </p>
      </div>
    </div>
  );
}

export default function EmployeeChecklist({ geminiResult, ruleData }) {
  const checklist = geminiResult?.employeeChecklist || {};
  const flaggedCount = CHECKLIST_ITEMS.filter((item) => checklist[item.key]).length;

  const verdict = geminiResult?.verdict;
  const accentColor = !verdict                    ? '#64748b'
    : verdict.includes('Malicious')               ? '#ef4444'
    : verdict.includes('Suspicious')              ? '#f59e0b'
    :                                               '#10b981';

  const summaryMessage = flaggedCount === 0
    ? '✅ This email appears clean'
    : flaggedCount <= 2
    ? '⚠️ This email has some warning signs'
    : '🚨 HIGH RISK — Do NOT interact with this email';

  const actionMessage = !verdict || verdict.includes('Safe')
    ? 'This email appears legitimate. No action is needed beyond normal caution.'
    : verdict.includes('Suspicious')
    ? 'Do NOT click any links or open attachments. Forward to your IT/Security team and do not reply.'
    : 'DELETE this email immediately. Do NOT click anything or open attachments. Report to your IT Security team URGENTLY.';

  return (
    <div className="fadein flex flex-col gap-3">
      {/* Summary banner */}
      <div
        className="rounded-[10px] p-4"
        style={{
          background: '#0d1626',
          border: `1px solid ${accentColor}40`,
          borderLeft: `4px solid ${accentColor}`,
        }}
      >
        <p className="text-[11px] tracking-widest mb-1" style={{ color: '#94a3b8' }}>
          📋 EMPLOYEE QUICK ASSESSMENT
        </p>
        <p className="text-[17px] font-bold mb-1 text-white">{summaryMessage}</p>
        <p className="text-xs mb-3" style={{ color: '#64748b' }}>
          {flaggedCount} of {CHECKLIST_ITEMS.length} red flags detected
          {geminiResult?.attackType && ` · Identified as: ${geminiResult.attackType}`}
        </p>
        <div
          className="rounded-md px-3 py-2.5 text-xs leading-relaxed"
          style={{ background: '#0a101f', color: '#94a3b8' }}
        >
          <strong style={{ color: '#60a5fa' }}>What to do: </strong>
          {actionMessage}
        </div>
      </div>

      {/* Checklist grid */}
      <div className="grid grid-cols-2 gap-2">
        {CHECKLIST_ITEMS.map((item) => (
          <ChecklistItem
            key={item.key}
            item={item}
            flagged={!!checklist[item.key]}
          />
        ))}
      </div>

      {/* Cognitive triggers — plain language */}
      {geminiResult?.cognitiveTriggers?.length > 0 && (
        <div
          className="rounded-[10px] p-3.5"
          style={{ background: '#0d1626', border: '1px solid #1e2d4a' }}
        >
          <p className="text-[10px] font-bold tracking-[2px] text-sky-400 mb-2.5">
            🧠 PSYCHOLOGICAL MANIPULATION TACTICS DETECTED
          </p>
          <div className="flex flex-wrap gap-2 mb-3">
            {geminiResult.cognitiveTriggers.map((trigger, i) => (
              <span
                key={i}
                className="rounded-full px-3 py-1 text-xs font-semibold"
                style={{
                  background: '#1c1228',
                  border: '1px solid #6d28d9',
                  color: '#c4b5fd',
                }}
              >
                🎯 {trigger}
              </span>
            ))}
          </div>
          <p className="text-[11px] leading-relaxed" style={{ color: '#475569' }}>
            Phishing emails deliberately exploit psychological pressure points to
            bypass rational thinking and force quick, unconsidered action.
            If you notice these tactics, treat the email as suspicious.
          </p>
        </div>
      )}
    </div>
  );
}
