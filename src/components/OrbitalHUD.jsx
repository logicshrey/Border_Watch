import { useEffect, useRef, useState } from "react";
import * as THREE from "three";

const ACCENT_CYAN = "#3fc7d8";

/**
 * Draws a live-tracked "mission control" callout on top of the Globe:
 * - a reticle that follows the Tanot marker's real screen position as the
 *   globe rotates (computed via the globe's own camera projection, so it
 *   stays pixel-accurate rather than an approximation)
 * - a connector line from that reticle out to a fixed telemetry card
 * - the whole callout fades out when the marker rotates to the far side
 *   of the globe (so the line never points at nothing)
 * - a static coordinate/status readout box, always visible, top-left
 *
 * This is purely visual — it does not affect click-to-fly or navigation,
 * which stay in Globe.jsx untouched. Pointer events pass through everywhere
 * except the telemetry card itself, so it never blocks interacting with
 * the globe underneath.
 */
export function OrbitalHUD({ globeRef, hostRef, lat, lon, label, sectorName, onActivate }) {
  const [track, setTrack] = useState(null); // { x, y, visible }
  const rafRef = useRef(null);

  useEffect(() => {
    function tick() {
      const globe = globeRef.current;
      const host = hostRef.current;

      if (
        globe && host &&
        typeof globe.getCoords === "function" &&
        typeof globe.camera === "function"
      ) {
        const camera = globe.camera();
        const world = globe.getCoords(lat, lon, 0.02);

        if (camera && world) {
          const vec = new THREE.Vector3(world.x, world.y, world.z);
          const facing = vec.clone().normalize().dot(camera.position.clone().normalize());

          vec.project(camera);
          const w = host.clientWidth;
          const h = host.clientHeight;
          const x = (vec.x * 0.5 + 0.5) * w;
          const y = (-vec.y * 0.5 + 0.5) * h;
          const onScreen = x > -20 && x < w + 20 && y > -20 && y < h + 20;

          setTrack({ x, y, visible: facing > 0.12 && vec.z < 1 && onScreen });
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [globeRef, hostRef, lat, lon]);

  // Fixed anchor for the telemetry card — top-right of the panel.
  const cardX = "78%";
  const cardY = 34;

  return (
    <div className="absolute inset-0" style={{ pointerEvents: "none" }}>
      {/* Static readout, always visible regardless of rotation */}
      <div
        className="absolute mono"
        style={{
          left: 10, top: 8, fontSize: 9.5, lineHeight: 1.5,
          color: "var(--text-dim)", letterSpacing: "0.02em",
        }}
      >
        <div>LAT&nbsp;&nbsp;{lat.toFixed(4)}°N</div>
        <div>LON&nbsp;&nbsp;{lon.toFixed(4)}°E</div>
        <div style={{ color: ACCENT_CYAN }}>SIG&nbsp;&nbsp;NOMINAL</div>
      </div>

      {/* Live-tracked connector + reticle + telemetry card */}
      {track && (
        <svg
          className="absolute inset-0 w-full h-full"
          style={{ opacity: track.visible ? 1 : 0, transition: "opacity 0.4s ease" }}
        >
          <line
            x1={track.x}
            y1={track.y}
            x2={cardX}
            y2={cardY}
            stroke={ACCENT_CYAN}
            strokeOpacity="0.45"
            strokeWidth="1"
            strokeDasharray="2,3"
          />
          {/* reticle brackets around the tracked point */}
          {[
            [-7, -7, -3, -7], [-7, -7, -7, -3],
            [7, -7, 3, -7], [7, -7, 7, -3],
            [-7, 7, -3, 7], [-7, 7, -7, 3],
            [7, 7, 3, 7], [7, 7, 7, 3],
          ].map(([dx1, dy1, dx2, dy2], i) => (
            <line
              key={i}
              x1={track.x + dx1} y1={track.y + dy1}
              x2={track.x + dx2} y2={track.y + dy2}
              stroke={ACCENT_CYAN} strokeWidth="1.2"
            />
          ))}
        </svg>
      )}

      <div
        className="absolute"
        style={{
          left: cardX, top: cardY, transform: "translate(-4px, -50%)",
          opacity: track?.visible ? 1 : 0.25, transition: "opacity 0.4s ease",
          pointerEvents: track?.visible ? "auto" : "none",
          cursor: track?.visible ? "pointer" : "default",
        }}
        onClick={() => track?.visible && onActivate?.()}
      >
        <div
          className="mono"
          style={{
            fontSize: 9.5, padding: "6px 9px", background: "rgba(12,20,28,0.85)",
            border: `1px solid ${ACCENT_CYAN}`, color: "var(--text-primary)",
            whiteSpace: "nowrap", boxShadow: `0 0 10px rgba(63,199,216,0.25)`,
          }}
        >
          <div style={{ color: ACCENT_CYAN, letterSpacing: "0.05em" }}>{label}</div>
          <div style={{ color: "var(--text-dim)", marginTop: 2 }}>{sectorName} · TRACKING</div>
        </div>
      </div>
    </div>
  );
}