/* ============================================================================
   SHARED UI PRIMITIVES
   ============================================================================ */

export function CornerFrame({ children, className = "", tone = "cyan" }) {
  return (
    <div className={`panel tone-${tone} ${className}`}>
      <span className="corner tl" />
      <span className="corner tr" />
      <span className="corner bl" />
      <span className="corner br" />
      {children}
    </div>
  );
}

export function PanelHeader({ icon: Icon, title, sub }) {
  return (
    <div className="flex items-center gap-2 px-4 pt-3 pb-2 border-b" style={{ borderColor: "var(--panel-border)" }}>
      {Icon && <Icon size={14} style={{ color: "var(--accent-cyan)" }} />}
      <div>
        <div className="text-xs tracking-wide" style={{ color: "var(--text-primary)", fontFamily: "var(--font-sans)" }}>{title}</div>
        {sub && <div className="text-[10px]" style={{ color: "var(--text-dim)", fontFamily: "var(--font-mono)" }}>{sub}</div>}
      </div>
    </div>
  );
}

export function RiskBadge({ value }) {
  const tone = value >= 80 ? "red" : value >= 50 ? "amber" : "cyan";
  const label = value >= 80 ? "CRITICAL" : value >= 50 ? "WATCH" : "NOMINAL";
  return (
    <span className={`risk-badge tone-${tone}`}>
      <span className="mono">{value}</span>
      <span className="risk-label">{label}</span>
    </span>
  );
}

export function Field({ label, children }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[10px] tracking-wide" style={{ color: "var(--text-dim)" }}>{label.toUpperCase()}</span>
      {children}
    </label>
  );
}
