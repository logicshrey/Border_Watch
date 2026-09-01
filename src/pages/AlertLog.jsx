import { ShieldAlert } from "lucide-react";
import { CornerFrame, PanelHeader, RiskBadge } from "../components/ui.jsx";

export function AlertLog({ alerts }) {
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
