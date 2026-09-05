/* ============================================================================
   API LAYER
   -----------------------------------------------------------------------
   Every network call the UI needs goes through this object. Functions
   marked "REAL" call the FastAPI backend (Major_Project/api/main.py).
   Functions marked "MOCK" are placeholders — replace their body with a
   real fetch() once that teammate's module is ready. Nothing in the
   components should need to change when a mock is swapped for real.
   ============================================================================ */

export const delay = (ms) => new Promise((r) => setTimeout(r, ms));

// deterministic pseudo-random generator used only for the TerrainTexture
// fallback when a preview image is missing
export function seededRand(seed) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0;
  return () => {
    h = (Math.imul(h ^ (h >>> 15), 1 | h) + 0x2545f4914f6cdd1d) | 0;
    return ((h >>> 0) / 4294967296);
  };
}

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

export class NotComputedError extends Error {
  constructor(detail) {
    super(detail || "not yet computed");
    this.name = "NotComputedError";
    this.notComputed = true;
  }
}

async function readErrorDetail(res, fallback) {
  try {
    const body = await res.json();
    return body?.detail || fallback;
  } catch {
    return fallback;
  }
}

export function gridFromManifest(manifest) {
  const patches = manifest?.patches ?? [];
  if (!patches.length) return { rows: 0, cols: 0 };
  return {
    rows: Math.max(...patches.map((p) => p.row)) + 1,
    cols: Math.max(...patches.map((p) => p.col)) + 1,
  };
}

export function gridFromComparison(statusMatrix, stats) {
  if (Array.isArray(stats?.grid_shape) && stats.grid_shape.length === 2) {
    return { rows: stats.grid_shape[0], cols: stats.grid_shape[1] };
  }
  const rows = statusMatrix?.length ?? 0;
  const cols = statusMatrix?.[0]?.length ?? 0;
  return { rows, cols };
}

export const api = {
  // REAL
  async getAois() {
    const res = await fetch(`${API_BASE}/api/aois`);
    if (!res.ok) throw new Error(await readErrorDetail(res, "Failed to fetch AOIs"));
    return await res.json();
  },

  // REAL
  async getAvailableDates(aoiId) {
    const res = await fetch(`${API_BASE}/api/dates?aoi=${encodeURIComponent(aoiId)}`);
    if (!res.ok) throw new Error(await readErrorDetail(res, "Failed to fetch available dates"));
    return await res.json();
  },

  // REAL
  async getPreprocessedImage(aoiId, date) {
    const res = await fetch(`${API_BASE}/api/preview/${encodeURIComponent(date)}`);
    if (!res.ok) throw new Error(await readErrorDetail(res, `Failed to fetch preview for ${date}`));
    const blob = await res.blob();
    return { imageUrl: URL.createObjectURL(blob) };
  },

  // REAL — patch tiling manifest; grid size is derived from max row/col
  async getPatchManifest(date) {
    const res = await fetch(`${API_BASE}/api/patches/${encodeURIComponent(date)}/manifest`);
    if (!res.ok) throw new Error(await readErrorDetail(res, `Failed to fetch patch manifest for ${date}`));
    return await res.json();
  },

  // REAL — 3-class status matrix (0=no change, 1=change, 2=unknown/cloud)
  async runPipeline(aoiId, dateA, dateB) {
    const res = await fetch(
      `${API_BASE}/api/comparison/${encodeURIComponent(dateA)}/${encodeURIComponent(dateB)}`
    );
    if (res.status === 404) {
      throw new NotComputedError(await readErrorDetail(res, "not yet computed"));
    }
    if (!res.ok) throw new Error(await readErrorDetail(res, "Failed to fetch comparison"));
    return await res.json();
  },

  // MOCK — no DSS / alerting module on the backend yet
  async getAlertLog() {
    await delay(200);
    return [
      { id: "AL-2291", sector: "Sector B-12", date: "2026-08-29", risk: 94, driver: "Spatial · new structure", status: "Open" },
      { id: "AL-2287", sector: "Sector A-04", date: "2026-08-27", risk: 61, driver: "Temporal · logistics spike", status: "Reviewing" },
      { id: "AL-2280", sector: "Sector C-19", date: "2026-08-24", risk: 38, driver: "Temporal · news frequency", status: "Logged" },
      { id: "AL-2276", sector: "Sector B-12", date: "2026-08-21", risk: 77, driver: "Fused · spatial + temporal", status: "Reviewing" },
    ];
  },
};
