/* ============================================================================
   API LAYER
   -----------------------------------------------------------------------
   Every network call the UI needs goes through this object. Functions
   marked "REAL" call the actual FastAPI backend (data_processing/api.py).
   Functions marked "MOCK" are placeholders — replace their body with a
   real fetch() once that teammate's module is ready. Nothing in the
   components should need to change when a mock is swapped for real.
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
   
   // Base URL for the real preprocessing API (data_processing/api.py).
   // Change this if you run it on a different port/host later.
   const PREPROCESS_API = "http://localhost:8000";
   
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
     // MOCK — replace once sectors/AOIs come from a real config or backend list
     async getAois() {
       // TODO: fetch('/api/aois')
       await delay(200);
       return AOI_LIST;
     },
   
     // REAL — backed by data_processing/api.py (Data Preprocessing module)
     async getAvailableDates(aoiId) {
       const res = await fetch(`${PREPROCESS_API}/api/dates`);
       if (!res.ok) throw new Error("Failed to fetch available dates");
       return await res.json();
     },
   
     // REAL — backed by data_processing/api.py (Data Preprocessing module)
     async getPreprocessedImage(aoiId, date) {
       const res = await fetch(`${PREPROCESS_API}/api/preview/${date}`);
       if (!res.ok) throw new Error(`Failed to fetch preview for ${date}`);
       const blob = await res.blob();
       return { imageUrl: URL.createObjectURL(blob) };
     },
   
     // MOCK — replace once Comparison + Binary Mask modules are ready
     async runPipeline(aoiId, dateA, dateB) {
       // TODO: fetch(`/api/pipeline?aoi=${aoiId}&d1=${dateA}&d2=${dateB}`)
       await delay(700);
       const distMatrix = makeMockDistMatrix(dateA + aoiId, dateB);
       return { distMatrix };
     },
   
     // MOCK — replace once the DSS / alerting module is ready
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