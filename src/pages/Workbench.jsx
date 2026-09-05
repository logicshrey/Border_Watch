import React, { useState, useCallback, useEffect } from "react";
import {
  Play, ChevronRight, Layers, GitCompareArrows, Grid3x3, ScanLine,
  CheckCircle2, TerminalSquare, Crosshair
} from "lucide-react";
import { api, delay, seededRand, gridFromManifest, gridFromComparison } from "../api/client.js";
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
  const [activeStep, setActiveStep] = useState(0);
  const [status, setStatus] = useState("idle"); // idle | running | done
  const [statusMatrix, setStatusMatrix] = useState(null);
  const [stats, setStats] = useState(null);
  const [pipelineError, setPipelineError] = useState(null);
  const [patchGrid, setPatchGrid] = useState({ rows: 0, cols: 0 });

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

  useEffect(() => {
    let cancelled = false;
    setPatchGrid({ rows: 0, cols: 0 });
    if (!dateA) return undefined;

    (async () => {
      try {
        const manifest = await api.getPatchManifest(dateA);
        if (cancelled) return;
        setPatchGrid(gridFromManifest(manifest));
      } catch {
        if (!cancelled) setPatchGrid({ rows: 0, cols: 0 });
      }
    })();

    return () => { cancelled = true; };
  }, [dateA]);

  const imageUrlA = usePreprocessedImage(aoiId, dateA);
  const imageUrlB = usePreprocessedImage(aoiId, dateB);

  const run = useCallback(async () => {
    setStatus("running");
    setActiveStep(0);
    setPipelineError(null);
    setStatusMatrix(null);
    setStats(null);
    for (let i = 0; i < STEPS.length; i++) {
      await delay(320);
      setActiveStep(i);
    }
    try {
      const res = await api.runPipeline(aoiId, dateA, dateB);
      setStatusMatrix(res.statusMatrix);
      setStats(res.stats ?? null);
      setStatus("done");
    } catch (err) {
      setStatusMatrix(null);
      setStats(null);
      setPipelineError(err?.notComputed ? "not yet computed" : (err?.message || "Analysis failed"));
      setStatus("idle");
    }
  }, [aoiId, dateA, dateB]);

  const cmpGrid = gridFromComparison(statusMatrix, stats);
  const resultHint = pipelineError || (statusMatrix ? null : "Run analysis to compute");

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
          <button className="btn-primary mt-1" onClick={run} disabled={status === "running" || !dateA || !dateB}>
            <Play size={12} /> {status === "running" ? "Running…" : "Run analysis"}
          </button>
          {stats && (
            <div className="text-[10px] mono" style={{ color: "var(--text-dim)" }}>
              {stats.changed_patches ?? "—"} changed · {stats.unchanged_patches ?? "—"} none · {stats.unknown_patches ?? "—"} cloud
            </div>
          )}
          {pipelineError && (
            <div className="text-[10px] mono" style={{ color: "var(--accent-amber)" }}>
              {pipelineError}
            </div>
          )}
          <div className="text-[10px] mono" style={{ color: "var(--text-dim)" }}>
            DATA MODE: LIVE
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
            <PanelHeader
              icon={Layers}
              title="PATCH EMBEDDING GRID"
              sub={patchGrid.rows && patchGrid.cols ? `${patchGrid.rows} × ${patchGrid.cols} patches` : "awaiting manifest"}
            />
            <div className="p-4 flex justify-center">
              <PatchGrid seed={aoiId + dateA} imageUrl={imageUrlA} rows={patchGrid.rows} cols={patchGrid.cols} />
            </div>
          </CornerFrame>

          <CornerFrame>
            <PanelHeader icon={GitCompareArrows} title="CHANGE STATUS" sub="0 none · 1 change · 2 unknown/cloud" />
            <div className="p-4 flex justify-center">
              {statusMatrix
                ? <DistanceGrid statusMatrix={statusMatrix} rows={cmpGrid.rows} cols={cmpGrid.cols} />
                : <EmptyGridHint text={resultHint || "Run analysis to compute"} />}
            </div>
          </CornerFrame>

          <CornerFrame>
            <PanelHeader icon={ScanLine} title="BINARY CHANGE MASK" sub="backend-thresholded 3-class mask" />
            <div className="p-4 flex justify-center">
              {statusMatrix
                ? <MaskGrid statusMatrix={statusMatrix} rows={cmpGrid.rows} cols={cmpGrid.cols} />
                : <EmptyGridHint text={pipelineError || "Awaiting status matrix"} />}
            </div>
          </CornerFrame>

          <CornerFrame>
            <PanelHeader icon={Crosshair} title="OVERLAY RESULT" sub="RGB composite + flagged patches" />
            <div className="p-4 flex justify-center">
              {statusMatrix
                ? <OverlayView statusMatrix={statusMatrix} rows={cmpGrid.rows} cols={cmpGrid.cols} seed={aoiId + dateB} imageUrl={imageUrlB} />
                : <EmptyGridHint text={pipelineError || "Awaiting mask"} />}
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
      data-live-preview="true"
      onError={() => setFailed(true)}
    />
  );
}

function PatchGrid({ seed, imageUrl, rows, cols }) {
  const n = Math.max(0, rows) * Math.max(0, cols);
  return (
    <div className="relative" style={{ width: 252, height: 252 }}>
      <ImageryLayer imageUrl={imageUrl} seed={seed} />
      {n > 0 && (
        <div className="grid absolute inset-0" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
          {Array.from({ length: n }).map((_, i) => (
            <div key={i} style={{ border: "1px solid rgba(63,199,216,0.18)" }} />
          ))}
        </div>
      )}
    </div>
  );
}

function flattenMatrix(statusMatrix, rows, cols) {
  const cells = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      cells.push(statusMatrix?.[r]?.[c] ?? 2);
    }
  }
  return cells;
}

function DistanceGrid({ statusMatrix, rows, cols }) {
  const cells = flattenMatrix(statusMatrix, rows, cols);
  return (
    <div className="grid" style={{ width: 252, height: 252, gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
      {cells.map((v, i) => {
        const c = v === 1 ? "rgba(225,74,63,0.9)" : v === 2 ? "rgba(92,113,133,0.85)" : "rgba(63,199,216,0.18)";
        return <div key={i} style={{ background: c }} />;
      })}
    </div>
  );
}

function MaskGrid({ statusMatrix, rows, cols }) {
  const cells = flattenMatrix(statusMatrix, rows, cols);
  return (
    <div className="grid" style={{ width: 252, height: 252, gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
      {cells.map((v, i) => {
        const background = v === 1 ? "var(--accent-red)" : v === 2 ? "#3a4550" : "#0c141c";
        return <div key={i} style={{ background, border: "1px solid #0a1016" }} />;
      })}
    </div>
  );
}

function OverlayView({ statusMatrix, rows, cols, seed, imageUrl }) {
  const cells = flattenMatrix(statusMatrix, rows, cols);
  return (
    <div className="relative" style={{ width: 252, height: 252 }}>
      <ImageryLayer imageUrl={imageUrl} seed={seed} />
      <div className="grid absolute inset-0" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
        {cells.map((v, i) => (
          <div key={i} style={{
            border: "1px solid rgba(63,199,216,0.1)",
            background: v === 1 ? "rgba(225,74,63,0.55)" : v === 2 ? "rgba(92,113,133,0.45)" : "transparent",
            outline: v === 1 ? "1px solid var(--accent-red)" : "none",
          }} />
        ))}
      </div>
    </div>
  );
}
