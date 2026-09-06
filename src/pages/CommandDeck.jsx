// import {
//   ShieldAlert, Activity, MapPin, Radar, Globe2
// } from "lucide-react";
// import { CornerFrame, PanelHeader, RiskBadge } from "../components/ui.jsx";
// import { Globe } from "../components/Globe.jsx";

// export function CommandDeck({ alerts, aois, onSelectSector }) {
//   const stats = [
//     { label: "Sectors monitored", value: aois.length, icon: MapPin },
//     { label: "Open alerts", value: alerts.filter(a => a.status !== "Logged").length, icon: ShieldAlert },
//     { label: "Avg. risk score", value: Math.round(alerts.reduce((s, a) => s + a.risk, 0) / (alerts.length || 1)), icon: Activity },
//     { label: "Pipeline uptime", value: "99.2%", icon: Radar },
//   ];

//   return (
//     <div className="flex flex-col gap-4">
//       <CornerFrame>
//         <PanelHeader icon={Globe2} title="ORBITAL TRACK" sub="Tanot AOI · 27.83°N 70.17°E" />
//         <Globe lat={27.83} lon={70.17} label="TANOT SECTOR" onSelectSector={onSelectSector} />
//       </CornerFrame>

//       <div className="grid grid-cols-4 gap-4">
//         {stats.map((s) => (
//           <CornerFrame key={s.label}>
//             <div className="p-4">
//               <div className="flex items-center justify-between">
//                 <span className="text-[10px] tracking-wide" style={{ color: "var(--text-dim)" }}>{s.label.toUpperCase()}</span>
//                 <s.icon size={13} style={{ color: "var(--text-dim)" }} />
//               </div>
//               <div className="mono text-2xl mt-1" style={{ color: "var(--text-primary)" }}>{s.value}</div>
//             </div>
//           </CornerFrame>
//         ))}
//       </div>

//       <div className="grid grid-cols-5 gap-4">
//         <CornerFrame className="col-span-3">
//           <PanelHeader icon={MapPin} title="SECTOR SCHEMATIC" sub="Abstracted — not to geographic scale" />
//           <SectorSchematic aois={aois} alerts={alerts} onSelectSector={onSelectSector} />
//         </CornerFrame>

//         <CornerFrame className="col-span-2">
//           <PanelHeader icon={ShieldAlert} title="RECENT ALERTS" sub={`${alerts.length} entries`} />
//           <div className="p-2 flex flex-col gap-1.5">
//             {alerts.slice(0, 4).map((a) => (
//               <div key={a.id} className="alert-row">
//                 <div>
//                   <div className="text-xs" style={{ color: "var(--text-primary)" }}>{a.sector}</div>
//                   <div className="mono text-[10px]" style={{ color: "var(--text-dim)" }}>{a.date} · {a.driver}</div>
//                 </div>
//                 <RiskBadge value={a.risk} />
//               </div>
//             ))}
//           </div>
//         </CornerFrame>
//       </div>
//     </div>
//   );
// }

// function SectorSchematic({ aois, alerts, onSelectSector }) {
//   // Abstract schematic — a stylized border line with sector nodes, not a real map.
//   const riskFor = (name) => {
//     const found = alerts.find((a) => a.sector === name);
//     return found ? found.risk : 12;
//   };
//   const points = "20,140 70,100 120,110 170,60 220,75 270,30 320,45";
//   const nodes = (aois.length ? aois : []).map((a, i) => ({
//     x: 70 + (i * 200) / Math.max(aois.length - 1, 1),
//     y: 100 - i * 28,
//     name: a.name,
//   }));
//   return (
//     <div className="p-4">
//       <svg viewBox="0 0 340 170" className="w-full h-40">
//         <defs>
//           <pattern id="gridpat" width="14" height="14" patternUnits="userSpaceOnUse">
//             <path d="M14 0H0V14" fill="none" stroke="rgba(63,199,216,0.08)" strokeWidth="1" />
//           </pattern>
//         </defs>
//         <rect width="340" height="170" fill="url(#gridpat)" />
//         <polyline points={points} fill="none" stroke="var(--accent-cyan)" strokeOpacity="0.5" strokeWidth="1.5" />
//         {nodes.map((n) => {
//           const risk = riskFor(n.name);
//           const tone = risk >= 80 ? "var(--accent-red)" : risk >= 50 ? "var(--accent-amber)" : "var(--accent-cyan)";
//           return (
//             <g
//               key={n.name}
//               onClick={() => onSelectSector?.(n.name)}
//               style={{ cursor: "pointer" }}
//             >
//               <circle cx={n.x} cy={n.y} r="9" fill="none" stroke={tone} strokeWidth="1" opacity="0.5" />
//               <circle cx={n.x} cy={n.y} r="3.5" fill={tone} />
//               <text x={n.x + 12} y={n.y + 3} className="mono" fontSize="8" fill="var(--text-dim)">{n.name}</text>
//             </g>
//           );
//         })}
//       </svg>
//     </div>
//   );
// }

import { ArrowUpRight, Crosshair, Eye, MapPin, Satellite, ShieldAlert } from "lucide-react";
import { Globe } from "../components/Globe.jsx";
import { RiskBadge } from "../components/ui.jsx";

export function CommandDeck({ alerts, aois, onSelectSector }) {
  const openAlerts = alerts.filter((alert) => alert.status !== "Logged");
  const critical = openAlerts.find((alert) => alert.risk >= 80) || openAlerts[0];

  return (
    <section className="command-deck">
      <Globe lat={27.83} lon={70.17} label="TANOT SECTOR" onSelectSector={onSelectSector} />
      <div className="deck-gradient" />
      <div className="deck-copy">
        <p className="eyebrow"><span /> ORBITAL OBSERVATION NETWORK</p>
        <h1>THE BORDER,<br /><em>IN CONTEXT.</em></h1>
        <p className="deck-intro">Persistent satellite observation for meaningful change across monitored sectors.</p>
        <div className="deck-actions">
          <button className="primary-action" onClick={() => onSelectSector?.("Tanot Sector")}>OPEN ANALYSIS <ArrowUpRight size={15} /></button>
          <span className="pass-readout"><Satellite size={14} /> NEXT PASS <b>07:42 UTC</b></span>
        </div>
      </div>

      <aside className="tracking-card">
        <div className="tracking-card-top"><span className="live-dot" /> ACTIVE TRACK <span>01 / 04</span></div>
        <div className="tracking-name">SENTINEL-2A</div>
        <div className="tracking-meta"><span>MSI / OPTICAL</span><span>786 KM</span></div>
        <div className="tracking-line"><i /></div>
        <div className="tracking-location"><Crosshair size={13} /> 27.83°N · 70.17°E</div>
      </aside>

      <div className="deck-bottom">
        <div className="fleet-stat"><small>ACTIVE ASSETS</small><strong>04</strong><span>IN ORBIT</span></div>
        <div className="fleet-stat"><small>MONITORED SECTORS</small><strong>{String(aois.length || 3).padStart(2, "0")}</strong><span>PRIORITY AOI</span></div>
        <div className="fleet-stat"><small>NETWORK UPTIME</small><strong>99.2<sup>%</sup></strong><span>LAST 30 DAYS</span></div>
      </div>

      <aside className="alert-rail">
        <div className="rail-title"><ShieldAlert size={15} /> PRIORITY QUEUE <span>{String(openAlerts.length).padStart(2, "0")}</span></div>
        {critical ? <button className="priority-alert" onClick={() => onSelectSector?.(critical.sector)}>
          <div><p>PRIORITY OBSERVATION</p><h2>{critical.sector}</h2><span>{critical.driver}</span></div>
          <RiskBadge value={critical.risk} />
          <ArrowUpRight size={16} />
        </button> : <div className="priority-alert empty-alert"><Eye size={16} /> No open observations</div>}
      </aside>
    </section>
  );
}
