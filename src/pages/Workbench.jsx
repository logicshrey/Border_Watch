import React, { useState, useMemo, useCallback, useEffect } from "react";
import {
  Play, ChevronRight, Layers, GitCompareArrows, Grid3x3, ScanLine,
  CheckCircle2, TerminalSquare, Crosshair
} from "lucide-react";
import { api, delay, GRID_N, seededRand } from "../api/client.js";
import { CornerFrame, PanelHeader, Field } from "../components/ui.jsx";

const STEPS = [
  { key: "preprocess", label: "Preprocess", icon: Layers },
  { key: "embed", label: "Embeddings", icon: Grid3x3 },
  { key: "compare", label: "Compare", icon: GitCompareArrows },
  { key: "mask", label: "Binary Mask", icon: ScanLine },
  { key: "overlay", label: "Overlay", icon: Crosshair },
];

function normalizeDates(raw) {
  const list = Array.isArray(raw) ? raw : (raw?.dates ?? []);
  return list.map((d) => (typeof d === "string" ? d : d?.date)).filter(Boolean);
}

function usePreprocessedImage(aoiId, date) {
  const [imageUrl, setImageUrl] = useState(null);

  useEffect(() => {
    let cancelled = false;
    let createdUrl = null;
    setImageUrl(null);
    if (!aoiId || !date) return undefined;

    (async () => {
      try {
        const res = await api.getPreprocessedImage(aoiId, date);
        const url = res?.imageUrl ?? null;
        if (cancelled) {
          if (url) URL.revokeObjectURL(url);
          return;
        }
        createdUrl = url;
        setImageUrl(url);
      } catch {
        if (!cancelled) setImageUrl(null);
      }
    })();

    return () => {
      cancelled = true;
      if (createdUrl) URL.revokeObjectURL(createdUrl);
    };
  }, [aoiId, date]);

  return imageUrl;
}

export function Workbench({ aois, selectedAoiId }) {
  const [aoiId, setAoiId] = useState(selectedAoiId || aois[0]?.id || "");
  const [availableDates, setAvailableDates] = useState([]);
  const [dateA, setDateA] = useState("");
  const [dateB, setDateB] = useState("");
  const [threshold, setThreshold] = useState(0.55);
  const [activeStep, setActiveStep] = useState(0);
  const [status, setStatus] = useState("idle"); // idle | running | done
  const [distMatrix, setDistMatrix] = useState(null);

  useEffect(() => {
    let cancelled = false;
    if (!aoiId) return undefined;

    (async () => {
      try {
        const raw = await api.getAvailableDates(aoiId);
        const dates = normalizeDates(raw);
        if (cancelled) return;
        setAvailableDates(dates);
        setDateA(dates[0] ?? "");
        setDateB(dates[1] ?? dates[0] ?? "");
      } catch {
        if (!cancelled) {
          setAvailableDates([]);
          setDateA("");
          setDateB("");
        }
      }
    })();

    return () => { cancelled = true; };
  }, [aoiId]);

  const imageUrlA = usePreprocessedImage(aoiId, dateA);
  const imageUrlB = usePreprocessedImage(aoiId, dateB);

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
            <select className="input" value={dateA} onChange={(e) => setDateA(e.target.value)} disabled={!availableDates.length}>
              {availableDates.map((d) => <option key={`a-${d}`} value={d}>{d}</option>)}
            </select>
          </Field>
          <Field label="Date B">
            <select className="input" value={dateB} onChange={(e) => setDateB(e.target.value)} disabled={!availableDates.length}>
              {availableDates.map((d) => <option key={`b-${d}`} value={d}>{d}</option>)}
            </select>
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
            <div className="p-4 flex justify-center"><PatchGrid seed={aoiId + dateA} imageUrl={imageUrlA} /></div>
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
                ? <OverlayView values={distMatrix} threshold={threshold} seed={aoiId + dateB} imageUrl={imageUrlB} />
                : <EmptyGridHint text="Awaiting mask" />}
            </div>
          </CornerFrame>
        </div>
      </div>
    </div>
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

function ImageryLayer({ imageUrl, seed }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => { setFailed(false); }, [imageUrl]);

  if (!imageUrl || failed) return <TerrainTexture seed={seed} />;
  return (
    <img
      src={imageUrl}
      alt=""
      className="absolute inset-0 w-full h-full object-cover"
      onError={() => setFailed(true)}
    />
  );
}

function PatchGrid({ seed, imageUrl }) {
  return (
    <div className="relative" style={{ width: 252, height: 252 }}>
      <ImageryLayer imageUrl={imageUrl} seed={seed} />
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

function OverlayView({ values, threshold, seed, imageUrl }) {
  return (
    <div className="relative" style={{ width: 252, height: 252 }}>
      <ImageryLayer imageUrl={imageUrl} seed={seed} />
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
