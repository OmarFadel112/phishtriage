// ═══════════════════════════════════════════════════════════════════════════
//  src/components/ThreatGauge.jsx
//  Semicircular SVG gauge displaying the 0–100 threat score.
//
//  Uses the SVG `pathLength` trick for clean, normalized animation:
//    pathLength="100" tells the browser the logical path length is 100 units.
//    strokeDasharray="100" sets one full dash covering the entire path.
//    strokeDashoffset=(100 - score) shifts the dash start: 0 = full fill,
//    100 = empty. Animating dashoffset with CSS transition gives a smooth
//    sweep without trigonometry.
// ═══════════════════════════════════════════════════════════════════════════

export default function ThreatGauge({ score = 0 }) {
  const clamped = Math.min(100, Math.max(0, score));

  const color = clamped >= 70 ? '#ef4444'    // red   — critical
    : clamped >= 40            ? '#f59e0b'    // amber — moderate
    :                            '#10b981';   // green — safe

  const label = clamped >= 70 ? 'CRITICAL'
    : clamped >= 40            ? 'MODERATE'
    :                            'LOW RISK';

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={180} height={112} viewBox="0 0 180 112" aria-label={`Threat score: ${clamped} — ${label}`}>
        {/* Track arc */}
        <path
          d="M20 97 A70 70 0 0 1 160 97"
          fill="none"
          stroke="#1e293b"
          strokeWidth={14}
          strokeLinecap="round"
        />
        {/* Value arc — pathLength trick keeps math trivial */}
        <path
          d="M20 97 A70 70 0 0 1 160 97"
          fill="none"
          stroke={color}
          strokeWidth={14}
          strokeLinecap="round"
          pathLength="100"
          strokeDasharray="100"
          strokeDashoffset={100 - clamped}
          style={{ transition: 'stroke-dashoffset 1s cubic-bezier(.4,0,.2,1), stroke .4s ease' }}
        />

        {/* Tick marks at 0%, 25%, 50%, 75%, 100% */}
        {[0, 25, 50, 75, 100].map((tick) => {
          const angleDeg = -180 + (tick / 100) * 180;
          const rad = (angleDeg * Math.PI) / 180;
          return (
            <line
              key={tick}
              x1={90 + 58 * Math.cos(rad)} y1={97 + 58 * Math.sin(rad)}
              x2={90 + 66 * Math.cos(rad)} y2={97 + 66 * Math.sin(rad)}
              stroke="#334155" strokeWidth={2}
            />
          );
        })}

        {/* Score value */}
        <text
          x={90} y={87}
          textAnchor="middle"
          fill="white"
          fontSize={32}
          fontWeight={800}
          fontFamily="ui-monospace, monospace"
        >
          {clamped}
        </text>

        {/* Risk label */}
        <text
          x={90} y={103}
          textAnchor="middle"
          fill={color}
          fontSize={8}
          fontWeight={700}
          letterSpacing={2}
        >
          {label}
        </text>
      </svg>

      {/* Legend */}
      <div className="flex gap-3 text-[10px] mt-1">
        <span className="text-emerald-400">● Safe 0–39</span>
        <span className="text-amber-400">● Mod 40–69</span>
        <span className="text-red-400">● Critical 70+</span>
      </div>
    </div>
  );
}
