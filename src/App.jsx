import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Satellite, Radar, ShieldAlert, Activity, MapPin, Clock, Play,
  ChevronRight, Layers, GitCompareArrows, Grid3x3, ScanLine, CheckCircle2,
  AlertTriangle, TerminalSquare, Crosshair
} from "lucide-react";

/* ============================================================================
   MOCK API LAYER
   -----------------------------------------------------------------------
   Every network call the UI needs goes through this object. Response shapes
   here are the CONTRACT your real backend should match. When a module is
   ready, replace the body of the matching function with a real fetch() —
   nothing in the components below needs to change.
   ============================================================================ */

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

// deterministic pseudo-random generator so the same date pair always
// produces the same mock result (feels less "random-refresh-y")
function seededRand(seed) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0;
  return () => {
    h = (Math.imul(h ^ (h >>> 15), 1 | h) + 0x2545f4914f6cdd1d) | 0;
    return ((h >>> 0) / 4294967296);
  };
}

const GRID_N = 21; // matches the 21 x 21 patch spec

function makeMockDistMatrix(dateA, dateB) {
  const rand = seededRand(dateA + dateB);
  const cells = [];
  // a couple of "hot" clusters to simulate real structural change
  const hotspots = [
    { r: 6, c: 14, spread: 2.4 },
    { r: 15, c: 5, spread: 1.6 },
  ];
  for (let r = 0; r < GRID_N; r++) {
    for (let c = 0; c < GRID_N; c++) {
      let base = rand() * 0.35;
      for (const h of hotspots) {
        const d = Math.hypot(r - h.r, c - h.c);
        base += Math.max(0, 1 - d / h.spread) * 0.9;
      }
      cells.push(Math.min(1, base));
    }
  }
  return cells;
}

const AOI_LIST = [
  { id: "sector-b12", name: "Sector B-12", region: "Northern Ridge Corridor" },
  { id: "sector-a04", name: "Sector A-04", region: "Wagah Approach" },
  { id: "sector-c19", name: "Sector C-19", region: "Eastern Riverine Belt" },
];

const api = {
  async getAois() {
    // TODO: fetch('/api/aois')
    await delay(200);
    return AOI_LIST;
  },
  async runPipeline(aoiId, dateA, dateB) {
    // TODO: fetch(`/api/pipeline?aoi=${aoiId}&d1=${dateA}&d2=${dateB}`)
    await delay(700);
    const distMatrix = makeMockDistMatrix(dateA + aoiId, dateB);
    return { distMatrix };
  },
  async getAlertLog() {
    // TODO: fetch('/api/alerts')
    await delay(200);
    return [
      { id: "AL-2291", sector: "Sector B-12", date: "2026-08-29", risk: 94, driver: "Spatial · new structure", status: "Open" },
      { id: "AL-2287", sector: "Sector A-04", date: "2026-08-27", risk: 61, driver: "Temporal · logistics spike", status: "Reviewing" },
      { id: "AL-2280", sector: "Sector C-19", date: "2026-08-24", risk: 38, driver: "Temporal · news frequency", status: "Logged" },
      { id: "AL-2276", sector: "Sector B-12", date: "2026-08-21", risk: 77, driver: "Fused · spatial + temporal", status: "Reviewing" },
    ];
  },
};

/* ============================================================================
   SHARED UI PRIMITIVES
   ============================================================================ */

function CornerFrame({ children, className = "", tone = "cyan" }) {
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

function PanelHeader({ icon: Icon, title, sub }) {
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

function RiskBadge({ value }) {
  const tone = value >= 80 ? "red" : value >= 50 ? "amber" : "cyan";
  const label = value >= 80 ? "CRITICAL" : value >= 50 ? "WATCH" : "NOMINAL";
  return (
    <span className={`risk-badge tone-${tone}`}>
      <span className="mono">{value}</span>
      <span className="risk-label">{label}</span>
    </span>
  );
}

/* ============================================================================
   COMMAND DECK
   ============================================================================ */

function CommandDeck({ alerts, aois }) {
  const stats = [
    { label: "Sectors monitored", value: aois.length, icon: MapPin },
    { label: "Open alerts", value: alerts.filter(a => a.status !== "Logged").length, icon: ShieldAlert },
    { label: "Avg. risk score", value: Math.round(alerts.reduce((s, a) => s + a.risk, 0) / (alerts.length || 1)), icon: Activity },
    { label: "Pipeline uptime", value: "99.2%", icon: Radar },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-4 gap-4">
        {stats.map((s) => (
          <CornerFrame key={s.label}>
            <div className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] tracking-wide" style={{ color: "var(--text-dim)" }}>{s.label.toUpperCase()}</span>
                <s.icon size={13} style={{ color: "var(--text-dim)" }} />
              </div>
              <div className="mono text-2xl mt-1" style={{ color: "var(--text-primary)" }}>{s.value}</div>
            </div>
          </CornerFrame>
        ))}
      </div>

      <div className="grid grid-cols-5 gap-4">
        <CornerFrame className="col-span-3">
          <PanelHeader icon={MapPin} title="SECTOR SCHEMATIC" sub="Abstracted — not to geographic scale" />
          <SectorSchematic aois={aois} alerts={alerts} />
        </CornerFrame>

        <CornerFrame className="col-span-2">
          <PanelHeader icon={ShieldAlert} title="RECENT ALERTS" sub={`${alerts.length} entries`} />
          <div className="p-2 flex flex-col gap-1.5">
            {alerts.slice(0, 4).map((a) => (
              <div key={a.id} className="alert-row">
                <div>
                  <div className="text-xs" style={{ color: "var(--text-primary)" }}>{a.sector}</div>
                  <div className="mono text-[10px]" style={{ color: "var(--text-dim)" }}>{a.date} · {a.driver}</div>
                </div>
                <RiskBadge value={a.risk} />
              </div>
            ))}
          </div>
        </CornerFrame>
      </div>
    </div>
  );
}

function SectorSchematic({ aois, alerts }) {
  // Abstract schematic — a stylized border line with sector nodes, not a real map.
  const riskFor = (name) => {
    const found = alerts.find((a) => a.sector === name);
    return found ? found.risk : 12;
  };
  const points = "20,140 70,100 120,110 170,60 220,75 270,30 320,45";
  const nodes = [
    { x: 70, y: 100, name: "Sector A-04" },
    { x: 170, y: 60, name: "Sector B-12" },
    { x: 270, y: 30, name: "Sector C-19" },
  ];
  return (
    <div className="p-4">
      <svg viewBox="0 0 340 170" className="w-full h-40">
        <defs>
          <pattern id="gridpat" width="14" height="14" patternUnits="userSpaceOnUse">
            <path d="M14 0H0V14" fill="none" stroke="rgba(63,199,216,0.08)" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width="340" height="170" fill="url(#gridpat)" />
        <polyline points={points} fill="none" stroke="var(--accent-cyan)" strokeOpacity="0.5" strokeWidth="1.5" />
        {nodes.map((n) => {
          const risk = riskFor(n.name);
          const tone = risk >= 80 ? "var(--accent-red)" : risk >= 50 ? "var(--accent-amber)" : "var(--accent-cyan)";
          return (
            <g key={n.name}>
              <circle cx={n.x} cy={n.y} r="9" fill="none" stroke={tone} strokeWidth="1" opacity="0.5" />
              <circle cx={n.x} cy={n.y} r="3.5" fill={tone} />
              <text x={n.x + 12} y={n.y + 3} className="mono" fontSize="8" fill="var(--text-dim)">{n.name}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/* ============================================================================
   ANALYSIS WORKBENCH
   ============================================================================ */

const STEPS = [
  { key: "preprocess", label: "Preprocess", icon: Layers },
  { key: "embed", label: "Embeddings", icon: Grid3x3 },
  { key: "compare", label: "Compare", icon: GitCompareArrows },
  { key: "mask", label: "Binary Mask", icon: ScanLine },
  { key: "overlay", label: "Overlay", icon: Crosshair },
];

function Workbench({ aois }) {
  const [aoiId, setAoiId] = useState(aois[0]?.id ?? "");
  const [dateA, setDateA] = useState("2026-08-01");
  const [dateB, setDateB] = useState("2026-08-26");
  const [threshold, setThreshold] = useState(0.55);
  const [activeStep, setActiveStep] = useState(0);
  const [status, setStatus] = useState("idle"); // idle | running | done
  const [distMatrix, setDistMatrix] = useState(null);

  const run = useCallback(async () => {
    setStatus("running");
    setActiveStep(0);
    for (let i = 0; i < STEPS.length; i++) {
      await delay(320);
      setActiveStep(i);
    }
    const res = await api.runPipeline(aoiId, dateA, dateB);
    setDistMatrix(res.distMatrix);
    setStatus("done");
  }, [aoiId, dateA, dateB]);

  const maxDist = useMemo(() => (distMatrix ? Math.max(...distMatrix) : 1), [distMatrix]);

  return (
    <div className="grid grid-cols-5 gap-4">
      <CornerFrame className="col-span-1 self-start">
        <PanelHeader icon={TerminalSquare} title="RUN PARAMETERS" />
        <div className="p-4 flex flex-col gap-3">
          <Field label="AOI / Sector">
            <select className="input" value={aoiId} onChange={(e) => setAoiId(e.target.value)}>
              {aois.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </Field>
          <Field label="Date A">
            <input className="input" type="date" value={dateA} onChange={(e) => setDateA(e.target.value)} />
          </Field>
          <Field label="Date B">
            <input className="input" type="date" value={dateB} onChange={(e) => setDateB(e.target.value)} />
          </Field>
          <Field label={`Change threshold — ${threshold.toFixed(2)}`}>
            <input className="w-full" type="range" min="0.1" max="0.9" step="0.01" value={threshold}
              onChange={(e) => setThreshold(parseFloat(e.target.value))} />
          </Field>
          <button className="btn-primary mt-1" onClick={run} disabled={status === "running"}>
            <Play size={12} /> {status === "running" ? "Running…" : "Run analysis"}
          </button>
          <div className="text-[10px] mono" style={{ color: "var(--text-dim)" }}>
            DATA MODE: SIMULATED
          </div>
        </div>
      </CornerFrame>

      <div className="col-span-4 flex flex-col gap-4">
        <CornerFrame>
          <div className="p-3 flex items-center gap-1 overflow-x-auto">
            {STEPS.map((s, i) => {
              const reached = status !== "idle" && i <= activeStep;
              const isCurrent = status === "running" && i === activeStep;
              return (
                <React.Fragment key={s.key}>
                  <div className={`step-pill ${reached ? "reached" : ""} ${isCurrent ? "current" : ""}`}>
                    <s.icon size={12} />
                    <span>{s.label}</span>
                    {reached && !isCurrent && <CheckCircle2 size={11} />}
                  </div>
                  {i < STEPS.length - 1 && <ChevronRight size={12} style={{ color: "var(--panel-border)" }} />}
                </React.Fragment>
              );
            })}
          </div>
        </CornerFrame>

        <div className="grid grid-cols-2 gap-4">
          <CornerFrame>
            <PanelHeader icon={Layers} title="PATCH EMBEDDING GRID" sub={`${GRID_N} × ${GRID_N} patches`} />
            <div className="p-4 flex justify-center"><PatchGrid seed={aoiId + dateA} /></div>
          </CornerFrame>

          <CornerFrame>
            <PanelHeader icon={GitCompareArrows} title="DISTANCE HEATMAP" sub="Euclidean distance, patch-wise" />
            <div className="p-4 flex justify-center">
              {distMatrix
                ? <DistanceGrid values={distMatrix} max={maxDist} />
                : <EmptyGridHint text="Run analysis to compute" />}
            </div>
          </CornerFrame>

          <CornerFrame>
            <PanelHeader icon={ScanLine} title="BINARY CHANGE MASK" sub={`threshold = ${threshold.toFixed(2)}`} />
            <div className="p-4 flex justify-center">
              {distMatrix
                ? <MaskGrid values={distMatrix} threshold={threshold} />
                : <EmptyGridHint text="Awaiting distance matrix" />}
            </div>
          </CornerFrame>

          <CornerFrame>
            <PanelHeader icon={Crosshair} title="OVERLAY RESULT" sub="RGB composite + flagged patches" />
            <div className="p-4 flex justify-center">
              {distMatrix
                ? <OverlayView values={distMatrix} threshold={threshold} seed={aoiId + dateA} />
                : <EmptyGridHint text="Awaiting mask" />}
            </div>
          </CornerFrame>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[10px] tracking-wide" style={{ color: "var(--text-dim)" }}>{label.toUpperCase()}</span>
      {children}
    </label>
  );
}

function EmptyGridHint({ text }) {
  return (
    <div className="flex items-center justify-center" style={{ width: 252, height: 252, border: "1px dashed var(--panel-border)" }}>
      <span className="text-[10px] mono" style={{ color: "var(--text-dim)" }}>{text}</span>
    </div>
  );
}

// Simulated raw imagery texture — a stand-in for the real RGB composite,
// so it's obvious this is placeholder terrain, not a fabricated real image.
function TerrainTexture({ seed }) {
  const rand = seededRand(seed);
  const blobs = Array.from({ length: 5 }, () => ({
    x: rand() * 100, y: rand() * 100, r: 20 + rand() * 40,
  }));
  return (
    <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
      <rect width="100" height="100" fill="#0e2e26" />
      {blobs.map((b, i) => (
        <circle key={i} cx={b.x} cy={b.y} r={b.r} fill="#163d33" opacity="0.6" />
      ))}
    </svg>
  );
}

function PatchGrid({ seed }) {
  return (
    <div className="relative" style={{ width: 252, height: 252 }}>
      <TerrainTexture seed={seed} />
      <div className="grid absolute inset-0" style={{ gridTemplateColumns: `repeat(${GRID_N}, 1fr)` }}>
        {Array.from({ length: GRID_N * GRID_N }).map((_, i) => (
          <div key={i} style={{ border: "1px solid rgba(63,199,216,0.18)" }} />
        ))}
      </div>
    </div>
  );
}

function DistanceGrid({ values, max }) {
  return (
    <div className="grid" style={{ width: 252, height: 252, gridTemplateColumns: `repeat(${GRID_N}, 1fr)` }}>
      {values.map((v, i) => {
        const t = v / max;
        const c = `rgba(63,199,216,${0.06 + t * 0.85})`;
        return <div key={i} style={{ background: c }} />;
      })}
    </div>
  );
}

function MaskGrid({ values, threshold }) {
  return (
    <div className="grid" style={{ width: 252, height: 252, gridTemplateColumns: `repeat(${GRID_N}, 1fr)` }}>
      {values.map((v, i) => (
        <div key={i} style={{ background: v >= threshold ? "var(--accent-red)" : "#0c141c", border: "1px solid #0a1016" }} />
      ))}
    </div>
  );
}

function OverlayView({ values, threshold, seed }) {
  return (
    <div className="relative" style={{ width: 252, height: 252 }}>
      <TerrainTexture seed={seed} />
      <div className="grid absolute inset-0" style={{ gridTemplateColumns: `repeat(${GRID_N}, 1fr)` }}>
        {values.map((v, i) => (
          <div key={i} style={{
            border: "1px solid rgba(63,199,216,0.1)",
            background: v >= threshold ? "rgba(225,74,63,0.55)" : "transparent",
            outline: v >= threshold ? "1px solid var(--accent-red)" : "none",
          }} />
        ))}
      </div>
    </div>
  );
}

/* ============================================================================
   ALERT LOG
   ============================================================================ */

function AlertLog({ alerts }) {
  return (
    <CornerFrame>
      <PanelHeader icon={ShieldAlert} title="ALERT LOG" sub={`${alerts.length} records`} />
      <table className="w-full text-xs">
        <thead>
          <tr className="text-[10px]" style={{ color: "var(--text-dim)" }}>
            {["ID", "Sector", "Date", "Driver", "Risk", "Status"].map((h) => (
              <th key={h} className="text-left font-normal px-4 py-2 border-b" style={{ borderColor: "var(--panel-border)" }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {alerts.map((a) => (
            <tr key={a.id} className="alert-log-row">
              <td className="px-4 py-2 mono" style={{ color: "var(--text-dim)" }}>{a.id}</td>
              <td className="px-4 py-2" style={{ color: "var(--text-primary)" }}>{a.sector}</td>
              <td className="px-4 py-2 mono" style={{ color: "var(--text-dim)" }}>{a.date}</td>
              <td className="px-4 py-2" style={{ color: "var(--text-dim)" }}>{a.driver}</td>
              <td className="px-4 py-2"><RiskBadge value={a.risk} /></td>
              <td className="px-4 py-2" style={{ color: "var(--text-dim)" }}>{a.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </CornerFrame>
  );
}

/* ============================================================================
   SHELL
   ============================================================================ */

const NAV = [
  { key: "deck", label: "Command Deck", icon: Satellite },
  { key: "workbench", label: "Analysis Workbench", icon: Radar },
  { key: "alerts", label: "Alert Log", icon: ShieldAlert },
];

export default function App() {
  const [page, setPage] = useState("deck");
  const [now, setNow] = useState(new Date());
  const [aois, setAois] = useState([]);
  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    api.getAois().then(setAois);
    api.getAlertLog().then(setAlerts);
  }, []);

  return (
    <div className="shell">
      <style>{`
        .shell {
          --bg-void: #060a0f;
          --panel: #0c141c;
          --panel-border: #1c2a38;
          --text-primary: #d8e4ec;
          --text-dim: #5c7185;
          --accent-cyan: #3fc7d8;
          --accent-amber: #e8a33d;
          --accent-red: #e14a3f;
          --font-sans: "Segoe UI", ui-sans-serif, system-ui, sans-serif;
          --font-mono: "JetBrains Mono", ui-monospace, "SF Mono", Consolas, monospace;
          background: var(--bg-void);
          color: var(--text-primary);
          font-family: var(--font-sans);
          min-height: 100vh;
          background-image: linear-gradient(rgba(63,199,216,0.03) 1px, transparent 1px),
                             linear-gradient(90deg, rgba(63,199,216,0.03) 1px, transparent 1px);
          background-size: 26px 26px;
        }
        .mono { font-family: var(--font-mono); }
        .panel { position: relative; background: var(--panel); border: 1px solid var(--panel-border); }
        .corner { position: absolute; width: 8px; height: 8px; border-color: var(--accent-cyan); opacity: 0.6; }
        .corner.tl { top: -1px; left: -1px; border-top: 1px solid; border-left: 1px solid; }
        .corner.tr { top: -1px; right: -1px; border-top: 1px solid; border-right: 1px solid; }
        .corner.bl { bottom: -1px; left: -1px; border-bottom: 1px solid; border-left: 1px solid; }
        .corner.br { bottom: -1px; right: -1px; border-bottom: 1px solid; border-right: 1px solid; }
        .input {
          background: #0a1016; border: 1px solid var(--panel-border); color: var(--text-primary);
          font-family: var(--font-mono); font-size: 11px; padding: 6px 8px;
        }
        .btn-primary {
          display: flex; align-items: center; justify-content: center; gap: 6px;
          background: var(--accent-cyan); color: #04222a; font-size: 11px; font-weight: 600;
          padding: 8px 10px; border: none; letter-spacing: 0.03em; cursor: pointer;
        }
        .btn-primary:disabled { opacity: 0.5; cursor: default; }
        .step-pill {
          display: flex; align-items: center; gap: 5px; padding: 5px 9px;
          font-size: 10px; color: var(--text-dim); border: 1px solid var(--panel-border);
          white-space: nowrap;
        }
        .step-pill.reached { color: var(--text-primary); border-color: var(--accent-cyan); }
        .step-pill.current { color: var(--accent-cyan); }
        .risk-badge {
          display: inline-flex; align-items: center; gap: 6px; padding: 3px 8px;
          border: 1px solid; font-size: 10px;
        }
        .risk-badge .risk-label { letter-spacing: 0.04em; }
        .risk-badge.tone-red { border-color: var(--accent-red); color: var(--accent-red); }
        .risk-badge.tone-amber { border-color: var(--accent-amber); color: var(--accent-amber); }
        .risk-badge.tone-cyan { border-color: var(--accent-cyan); color: var(--accent-cyan); }
        .alert-row { display: flex; align-items: center; justify-content: space-between; padding: 6px 8px; border: 1px solid var(--panel-border); }
        .alert-log-row:hover { background: rgba(63,199,216,0.04); }
        nav .nav-item {
          display: flex; align-items: center; gap: 10px; padding: 9px 12px; font-size: 12px;
          color: var(--text-dim); cursor: pointer; border-left: 2px solid transparent;
        }
        nav .nav-item.active { color: var(--text-primary); border-left-color: var(--accent-cyan); background: rgba(63,199,216,0.05); }
      `}</style>

      {/* top bar */}
      <div className="flex items-center justify-between px-5 py-3 border-b" style={{ borderColor: "var(--panel-border)" }}>
        <div className="flex items-center gap-2">
          <Satellite size={16} style={{ color: "var(--accent-cyan)" }} />
          <span className="text-sm tracking-wide">BORDERWATCH</span>
          <span className="mono text-[10px] px-2 py-0.5 border" style={{ color: "var(--text-dim)", borderColor: "var(--panel-border)" }}>
            EMD-2-ALERT
          </span>
        </div>
        <div className="flex items-center gap-4 mono text-[11px]" style={{ color: "var(--text-dim)" }}>
          <span className="flex items-center gap-1"><Clock size={11} /> {now.toLocaleTimeString()}</span>
          <span className="flex items-center gap-1"><Activity size={11} style={{ color: "var(--accent-cyan)" }} /> SYSTEMS NOMINAL</span>
        </div>
      </div>

      <div className="flex">
        <nav className="w-52 shrink-0 py-3 border-r" style={{ borderColor: "var(--panel-border)" }}>
          {NAV.map((n) => (
            <div key={n.key} className={`nav-item ${page === n.key ? "active" : ""}`} onClick={() => setPage(n.key)}>
              <n.icon size={14} /> {n.label}
            </div>
          ))}
        </nav>

        <main className="flex-1 p-5">
          {page === "deck" && <CommandDeck alerts={alerts} aois={aois} />}
          {page === "workbench" && aois.length > 0 && <Workbench aois={aois} />}
          {page === "alerts" && <AlertLog alerts={alerts} />}
        </main>
      </div>
    </div>
  );
}
