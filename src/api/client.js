/* ============================================================================
   MOCK API LAYER
   -----------------------------------------------------------------------
   Every network call the UI needs goes through this object. Response shapes
   here are the CONTRACT your real backend should match. When a module is
   ready, replace the body of the matching function with a real fetch() —
   nothing in the components below needs to change.
   ============================================================================ */

export const delay = (ms) => new Promise((r) => setTimeout(r, ms));

// deterministic pseudo-random generator so the same date pair always
// produces the same mock result (feels less "random-refresh-y")
export function seededRand(seed) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0;
  return () => {
    h = (Math.imul(h ^ (h >>> 15), 1 | h) + 0x2545f4914f6cdd1d) | 0;
    return ((h >>> 0) / 4294967296);
  };
}

export const GRID_N = 21; // matches the 21 x 21 patch spec

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

export const api = {
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
