// ═══════════════════════════════════════════════════════════════════════════
//  src/components/HeaderForensics.jsx
//  Displays parsed email headers with domain mismatch highlighting.
//  Red border on any header field whose domain differs from the From domain.
// ═══════════════════════════════════════════════════════════════════════════

export default function HeaderForensics({ headers }) {
  if (!headers) return null;

  const headerFields = [
    {
      label: 'FROM',
      value: headers.from,
      flagged: headers.domainMismatch,
    },
    {
      label: 'RETURN-PATH',
      value: headers.returnPath,
      flagged: headers.returnPathDomain && headers.returnPathDomain !== headers.fromDomain,
    },
    {
      label: 'REPLY-TO',
      value: headers.replyTo,
      flagged: headers.replyToDomain && headers.replyToDomain !== headers.fromDomain,
    },
    {
      label: 'SUBJECT',
      value: headers.subject,
      flagged: false,
    },
  ].filter((h) => h.value);

  return (
    <div
      className="rounded-[10px] p-3.5"
      style={{
        background: '#0d1626',
        border: `1px solid ${headers.domainMismatch ? '#7f1d1d' : '#1e2d4a'}`,
      }}
    >
      <p className="text-[10px] font-bold tracking-[2px] text-sky-400 mb-3">
        📬 HEADER FORENSICS
      </p>

      <div className="grid grid-cols-2 gap-2 mb-3">
        {headerFields.map((field) => (
          <div
            key={field.label}
            className="rounded p-2"
            style={{
              background: '#080c1a',
              border: `1px solid ${field.flagged ? '#7f1d1d' : '#1e2d4a'}`,
            }}
          >
            <p className="text-[9px] tracking-widest text-slate-500 mb-1.5">{field.label}</p>
            <p
              className="text-[11px] font-mono break-all leading-relaxed"
              style={{ color: field.flagged ? '#f87171' : '#94a3b8' }}
            >
              {field.value}
            </p>
            {field.flagged && (
              <p className="text-[10px] text-red-400 font-semibold mt-1">⚠ DOMAIN MISMATCH</p>
            )}
          </div>
        ))}
      </div>

      {/* Mismatch detail block */}
      {headers.mismatches?.length > 0 && (
        <div
          className="rounded p-3"
          style={{ background: '#2d1b1b', border: '1px solid #7f1d1d' }}
        >
          <p className="text-red-400 text-[11px] font-bold mb-2">⚠ ROUTING MISMATCH DETAILS</p>
          {headers.mismatches.map((m, i) => (
            <p key={i} className="font-mono text-[11px] text-red-300">
              {m}
            </p>
          ))}
          <p className="text-[10px] text-slate-500 mt-2 leading-relaxed">
            Legitimate transactional email routes consistently across all header fields.
            Divergence indicates spoofing or a malicious third-party relay.
          </p>
        </div>
      )}
    </div>
  );
}
