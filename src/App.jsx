import { useState, useEffect } from "react";
import {
  Satellite, Radar, ShieldAlert, Activity, Clock
} from "lucide-react";
import { api } from "./api/client.js";
import { CommandDeck } from "./pages/CommandDeck.jsx";
import { Workbench } from "./pages/Workbench.jsx";
import { AlertLog } from "./pages/AlertLog.jsx";

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
  const [selectedAoiId, setSelectedAoiId] = useState("");

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
          {page === "deck" && (
            <CommandDeck
              alerts={alerts}
              aois={aois}
              onSelectSector={(sectorName) => {
                const match = aois.find((a) => a.name === sectorName);
                if (match) setSelectedAoiId(match.id);
                setPage("workbench");
              }}
            />
          )}
          {page === "workbench" && aois.length > 0 && (
            <Workbench aois={aois} selectedAoiId={selectedAoiId} />
          )}
          {page === "alerts" && <AlertLog alerts={alerts} />}
        </main>
      </div>
    </div>
  );
}
