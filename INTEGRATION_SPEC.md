# BorderWatch — Backend/Frontend Integration Spec

## Context (read this first)

Two separate, unconnected folders on disk:

1. **Backend** — `Major_Project/` (Python, on the `shreyash` git branch). Contains
   independent pipeline stages: `data_processing/` (Sentinel-2 download +
   preprocessing), root-level `comparison.py` (embedding comparison),
   `Prithvi/` (embedding model — inspect this folder yourself, its exact
   contents are not fully known to whoever wrote this spec).
2. **Frontend** — `borderwatch/` (React + Vite + Tailwind v4). Has a mock API
   layer at `src/api/client.js` that the entire UI already calls. The shape of
   that mock object is the CONTRACT the real backend must satisfy — do not
   change frontend component code to match backend convenience; make backend
   endpoints match this existing contract instead.

The real Sentinel-2 pipeline has NOT been run yet (it takes a long time and
needs Copernicus credentials). Everything must be testable end-to-end using
generated fake/sample data first. The real pipeline will be run once, at the
very end, as final validation — nothing should be architected in a way that
requires real data to test.

Do not guess at things you can inspect. If a module's real input/output
format is unclear from its code, read the code before writing the endpoint
that wraps it. If two files import config inconsistently (see note below),
fix the inconsistency, don't work around it.

---

## Known issue to fix first: inconsistent imports

`data_processing/*.py` files do `from config import ...` (i.e. expect to be
run with `data_processing/` as the working directory / on the path).

Root-level `comparison.py` does `from data_processing.config import ...`
(i.e. expects to be run from the `Major_Project/` root, treating
`data_processing` as a package).

These two conventions conflict and will break whichever way a single unified
API server is launched. **Pick one convention, make every module consistent
with it, and add any missing `__init__.py` needed to make it a proper
package.** Recommended: treat `Major_Project/` as the project root, run
everything (including the API server) from there, and make all internal
modules import via `from data_processing.config import ...` /
`from data_processing.preprocessing.pipeline import ...` etc.

---

## What already exists and works (do not re-derive these — read the actual
files for exact behavior, this is just an index)

| Stage | File | Output |
|---|---|---|
| Preprocessing | `data_processing/preprocessing/pipeline.py` | `Tanot_Preprocessed/{date}/{B02,B03,B04,B08,B11,B12}_clean.tif`, `NDVI.tif`, `NDWI.tif`, `cloud_mask.tif` |
| Band stacking | `data_processing/stack_band.py` | `Tanot_Stacked/{date}/stacked_6band.tif` (6-band, order: Blue,Green,Red,NIR,SWIR1,SWIR2) |
| Patch tiling | `data_processing/tile_patches.py` | `Tanot_Patches/{date}/{date}_r{row}_c{col}.tif` + `Tanot_Patches/{date}/manifest.json` (patch_id, row, col, lon, lat, cloud_fraction, file) |
| Embeddings | `Prithvi/` folder — **inspect this yourself**, comment in `tile_patches.py` references a script called `extract_patch_embedding.py` that should produce `Tanot_Embeddings/embeddings.parquet` with columns `date, patch_id, embedding, cloud_fraction` (this is what `comparison.py` expects to load — verify the real script matches, and if it doesn't yet exist, you'll need to note that as a gap) |
| Comparison | `comparison.py` (root) | `Tanot_Comparison/{date_a}_vs_{date_b}/status_matrix.npy` (2D array, uint8: 0=no change, 1=change, 2=unknown/cloud), `distance_matrix.npy`, `distance_long.parquet`, `stats.json` |
| Visualization (reference only, not needed as API) | `data_processing/plot_binary_map.py` | matplotlib PNG — this is a CLI/notebook tool, NOT what the API should use; the API should serve raw JSON/PNG per the contract below, not this script's output |
| DSS / Alerts / Risk scoring | **Does not appear to exist yet.** Search the repo to confirm. If genuinely absent, leave `getAlertLog` mocked in the frontend — do not fabricate a fake module for it. |

---

## Required API contract

Build this as a single FastAPI app, e.g. `Major_Project/api/main.py`, run
from the `Major_Project/` root with:
```
uvicorn api.main:app --reload --port 8000
```

Enable CORS for `http://localhost:5173` (the Vite dev server — frontend and
backend run as two separate local processes on two separate ports, since
they live in two separate folders/repos).

### `GET /api/aois`
Returns list of monitored sectors. For now this can be a static list (there's
currently one real AOI: Tanot). Shape:
```json
[{ "id": "tanot", "name": "Tanot Sector", "region": "Rajasthan Border Belt" }]
```

### `GET /api/dates?aoi={aoiId}`
Returns array of date strings that have preprocessed data available, read
from `Tanot_Preprocessed/` folder names. Shape:
```json
["2026-08-01", "2026-08-26"]
```

### `GET /api/preview/{date}`
Returns a PNG image (`media_type="image/png"`), built from
`Tanot_Preprocessed/{date}/{B04,B03,B02}_clean.tif` as an RGB composite
(Red=B04, Green=B03, Blue=B02), normalized to 0-255, NaN→0 for cloud-masked
pixels.

### `GET /api/patches/{date}/manifest`
Returns the contents of `Tanot_Patches/{date}/manifest.json` directly (pass
through as-is — frontend needs row/col/lon/lat/cloud_fraction per patch to
render the patch grid accurately, using the REAL grid dimensions rather than
an assumed 21×21).

### `GET /api/comparison/{date_a}/{date_b}`
Returns JSON built from `Tanot_Comparison/{date_a}_vs_{date_b}/status_matrix.npy`
and `stats.json`:
```json
{
  "statusMatrix": [[0,0,1,2,...], ...],
  "stats": { "date_a": "...", "date_b": "...", "changed_patches": 12,
             "unchanged_patches": 300, "unknown_patches": 5,
             "change_percentage_among_valid": 3.8,
             "change_threshold": 0.695, "grid_shape": [21, 21], ... }
}
```
If the comparison folder doesn't exist for that date pair, return HTTP 404
with a clear detail message — the frontend should show "not yet computed"
rather than crash.

### `GET /api/alerts` — ONLY if a real DSS/scoring module is found
If no such module exists in the repo, do not build this endpoint. Leave it
mocked in the frontend (`client.js` already has a working mock — do not
touch it).

---

## Fake/sample data generator (needed since the real pipeline hasn't run)

Create `Major_Project/generate_sample_data.py`, runnable standalone, that
produces a fully internally-consistent fake dataset spanning every stage
listed above for **two dates** (`2026-08-01`, `2026-08-26`), an **Tanot**
AOI, using real `BBOX`/CRS from `config.py`, so that every endpoint above
returns real-shaped data without needing the actual Sentinel-2 download:

- `Tanot_Preprocessed/{date}/*.tif` — as already scripted (ask Cursor to
  reuse/extend `make_fake_data.py` and `make_fake_comparison.py` already
  present in `data_processing/` if found — check first).
- `Tanot_Patches/{date}/manifest.json` — fake manifest with a realistic grid
  (check the real patch size math: 300×300 fake image ÷ 224 patch size
  rounds down to a 1×1 grid, which is too small to be useful for testing —
  **generate the fake preprocessed images large enough that tiling produces
  a multi-patch grid, e.g. at least 1500×1500 pixels**, so the frontend has
  something meaningful to render).
- `Tanot_Comparison/2026-08-01_vs_2026-08-26/status_matrix.npy` + `stats.json`
  — matching the grid shape actually produced by the fake tiling step above
  (not a hardcoded 21×21 — derive it from the same math tile_patches.py uses).

This generator is a testing tool only — clearly comment it as such, and
make sure it's easy to delete/ignore once real data exists.

---

## Frontend changes (`borderwatch/src/api/client.js`)

This file already has a documented MOCK/REAL split (see comments in the
file). For each function below, replace the mock body with a real fetch to
the contract above. Do not change any component files unless a real response
shape genuinely cannot match what the mock returned — if that happens, note
the discrepancy and update the calling component minimally, not the whole
architecture.

- `getAois()` → `GET /api/aois`
- `getAvailableDates(aoiId)` → `GET /api/dates?aoi={aoiId}` (already wired to
  a similar real endpoint — just add the `aoi` query param if missing)
- `getPreprocessedImage(aoiId, date)` → `GET /api/preview/{date}` (already
  wired — no change needed unless the response format changed)
- `runPipeline(aoiId, dateA, dateB)` → `GET /api/comparison/{dateA}/{dateB}`,
  returning `{ statusMatrix, stats }` instead of the old mocked continuous
  `distMatrix`. **This requires updating `Workbench.jsx`'s grid components
  (`DistanceGrid`, `MaskGrid`, `OverlayView`) to consume a 3-class
  `statusMatrix` (0/1/2) directly instead of thresholding a continuous
  distance value — remove the threshold slider, it's no longer meaningful
  since the backend now does the thresholding.**
- Add a new `getPatchManifest(date)` → `GET /api/patches/{date}/manifest`,
  and use its real row/col grid dimensions (from `manifest.json`) instead of
  the hardcoded `GRID_N = 21` constant, wherever grids are rendered.
- `getAlertLog()` → leave mocked unless a real DSS endpoint was confirmed to
  exist above.

Add a `.env` file to `borderwatch/` with `VITE_API_URL=http://localhost:8000`
and use `import.meta.env.VITE_API_URL` in `client.js` instead of a hardcoded
`http://localhost:8000` string, so the API base is configurable.

---

## Testing checklist (do this after building, before declaring it done)

1. `Major_Project/`: run `python generate_sample_data.py`, confirm it prints
   success for every stage without errors.
2. Start backend: `uvicorn api.main:app --reload --port 8000` from
   `Major_Project/` root, confirm no import errors.
3. Hit every endpoint directly in browser/curl and confirm valid JSON/PNG:
   `/api/aois`, `/api/dates?aoi=tanot`, `/api/preview/2026-08-01`,
   `/api/patches/2026-08-01/manifest`, `/api/comparison/2026-08-01/2026-08-26`.
4. Start frontend: `npm run dev` in `borderwatch/`, confirm Command Deck,
   Workbench, and Alert Log all load without console errors.
5. In Workbench: select the two fake dates, run analysis, confirm the patch
   grid, comparison result, and overlay all render using REAL data from the
   endpoints above (not the old TerrainTexture/mock fallback — check this
   explicitly, since a silent fetch failure falling back to mock data would
   look fine but be wrong).
6. Only after all of the above passes: run the real Sentinel-2 pipeline once
   (`python run_pipeline.py --step all` etc.) and re-verify steps 3–5 against
   real dates instead of the fake ones.
