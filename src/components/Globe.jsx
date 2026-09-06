// import { useCallback, useEffect, useMemo, useRef, useState } from "react";
// import GlobeGL from "react-globe.gl";
// import { OrbitalHUD } from "./OrbitalHUD.jsx";

// const ACCENT_CYAN = "#3fc7d8";
// const TANOT = { lat: 27.83, lng: 70.17 };
// const TANOT_SECTOR = "Tanot Sector";
// const FLY_MS = 1800;

// export function Globe({
//   lat = TANOT.lat,
//   lon = TANOT.lng,
//   label = "TANOT SECTOR",
//   onSelectSector,
// }) {
//   const hostRef = useRef(null);
//   const globeRef = useRef(null);
//   const flyingRef = useRef(false);
//   const [size, setSize] = useState({ w: 0, h: 0 });

//   const marker = useMemo(
//     () => [{ lat, lng: lon, name: label, sector: TANOT_SECTOR }],
//     [lat, lon, label]
//   );

//   useEffect(() => {
//     const host = hostRef.current;
//     if (!host) return undefined;
//     const measure = () => {
//       const w = Math.max(1, Math.floor(host.clientWidth));
//       const h = Math.max(1, Math.floor(host.clientHeight));
//       setSize((prev) => (prev.w === w && prev.h === h ? prev : { w, h }));
//     };
//     measure();
//     const ro = new ResizeObserver(measure);
//     ro.observe(host);
//     return () => ro.disconnect();
//   }, []);

//   const applyIdleControls = useCallback(() => {
//     const globe = globeRef.current;
//     if (!globe) return;
//     globe.pointOfView({ lat, lng: lon, altitude: 1.8 }, 0);
//     const controls = globe.controls();
//     controls.autoRotate = true;
//     controls.autoRotateSpeed = 0.35;
//     controls.enableDamping = true;
//   }, [lat, lon]);

//   const flyToTanot = useCallback(() => {
//     const globe = globeRef.current;
//     if (!globe || flyingRef.current) return;
//     flyingRef.current = true;
//     globe.controls().autoRotate = false;
//     globe.pointOfView({ lat, lng: lon, altitude: 0.3 }, FLY_MS);
//     window.setTimeout(() => {
//       onSelectSector?.(TANOT_SECTOR);
//     }, FLY_MS);
//   }, [lat, lon, onSelectSector]);

//   const htmlElement = useCallback((d) => {
//     const el = document.createElement("div");
//     el.style.cssText = [
//       "width:40px",
//       "height:40px",
//       "border-radius:50%",
//       "cursor:pointer",
//       "transform:translate(-50%,-50%)",
//       "pointer-events:auto",
//     ].join(";");
//     el.title = d.name;
//     el.addEventListener("click", (e) => {
//       e.stopPropagation();
//       flyToTanot();
//     });
//     return el;
//   }, [flyToTanot]);

//   const onNearTanot = useCallback(
//     ({ lat: clickLat, lng: clickLng }) => {
//       const dLat = clickLat - lat;
//       const dLng = ((clickLng - lon + 540) % 360) - 180;
//       if (Math.hypot(dLat, dLng) < 8) flyToTanot();
//     },
//     [flyToTanot, lat, lon]
//   );

//   return (
//     <div className="relative overflow-hidden" style={{ height: 300 }}>
//       <div
//         ref={hostRef}
//         className="absolute overflow-hidden"
//         style={{ inset: 12 }}
//       >
//         {size.w > 0 && size.h > 0 && (
//           <GlobeGL
//             ref={globeRef}
//             width={size.w}
//             height={size.h}
//             backgroundColor="rgba(0,0,0,0)"
//             globeImageUrl="//unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
//             bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
//             showAtmosphere
//             atmosphereColor={ACCENT_CYAN}
//             atmosphereAltitude={0.18}
//             enablePointerInteraction
//             onGlobeReady={applyIdleControls}
//             pointsData={marker}
//             pointLat="lat"
//             pointLng="lng"
//             pointColor={() => ACCENT_CYAN}
//             pointAltitude={0.012}
//             pointRadius={0.6}
//             pointLabel={() => label}
//             ringsData={marker}
//             ringLat="lat"
//             ringLng="lng"
//             ringColor={() => `rgba(63,199,216,0.75)`}
//             ringMaxRadius={4}
//             ringPropagationSpeed={2.2}
//             ringRepeatPeriod={1100}
//             htmlElementsData={marker}
//             htmlLat="lat"
//             htmlLng="lng"
//             htmlAltitude={0.02}
//             htmlElement={htmlElement}
//             onPointClick={flyToTanot}
//             onGlobeClick={onNearTanot}
//           />
//         )}

//         <OrbitalHUD
//           globeRef={globeRef}
//           hostRef={hostRef}
//           lat={lat}
//           lon={lon}
//           label={label}
//           sectorName={TANOT_SECTOR}
//           onActivate={flyToTanot}
//         />
//       </div>
//     </div>
//   );
// }

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import GlobeGL from "react-globe.gl";
import { OrbitalHUD } from "./OrbitalHUD.jsx";

const EARTH_TEXTURE = "//unpkg.com/three-globe/example/img/earth-blue-marble.jpg";
const EARTH_TOPOLOGY = "//unpkg.com/three-globe/example/img/earth-topology.png";
const FLY_MS = 1450;
const SATELLITES = [
  { id: "s2a", name: "SENTINEL-2A", lat: 37, lng: 80, altitude: 0.22, color: "#79d9ec" },
  { id: "s1a", name: "SENTINEL-1A", lat: 8, lng: 39, altitude: 0.18, color: "#8dc4e8" },
  { id: "landsat", name: "LANDSAT 9", lat: 56, lng: 34, altitude: 0.27, color: "#e4b46b" },
  { id: "noaa", name: "NOAA-21", lat: -10, lng: 104, altitude: 0.16, color: "#6d96bb" },
];

export function Globe({ lat = 27.83, lon = 70.17, label = "TANOT SECTOR", onSelectSector }) {
  const hostRef = useRef(null);
  const globeRef = useRef(null);
  const flyingRef = useRef(false);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const focus = useMemo(() => [{ lat, lng: lon, name: label }], [lat, lon, label]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return undefined;
    const measure = () => setSize({ w: Math.max(1, host.clientWidth), h: Math.max(1, host.clientHeight) });
    measure(); const observer = new ResizeObserver(measure); observer.observe(host);
    return () => observer.disconnect();
  }, []);

  const setIdleView = useCallback(() => {
    const globe = globeRef.current; if (!globe) return;
    globe.pointOfView({ lat: 25, lng: 68, altitude: 1.65 }, 0);
    const controls = globe.controls(); controls.autoRotate = true; controls.autoRotateSpeed = 0.22; controls.enableDamping = true;
  }, []);

  const activateFocus = useCallback(() => {
    const globe = globeRef.current;
    if (!globe || flyingRef.current) return;
    flyingRef.current = true; globe.controls().autoRotate = false;
    globe.pointOfView({ lat, lng: lon, altitude: 0.52 }, FLY_MS);
    window.setTimeout(() => onSelectSector?.("Tanot Sector"), FLY_MS);
  }, [lat, lon, onSelectSector]);

  const satelliteElement = useCallback((satellite) => {
    const el = document.createElement("div");
    el.className = "satellite-marker"; el.style.setProperty("--satellite-color", satellite.color); el.title = satellite.name;
    el.innerHTML = "<span></span>"; return el;
  }, []);

  return <div className="orbital-stage" ref={hostRef}>
    {size.w > 0 && <GlobeGL
      ref={globeRef} width={size.w} height={size.h} backgroundColor="rgba(0,0,0,0)"
      globeImageUrl={EARTH_TEXTURE} bumpImageUrl={EARTH_TOPOLOGY} showAtmosphere atmosphereColor="#68cde7" atmosphereAltitude={0.16}
      onGlobeReady={setIdleView} onPointClick={activateFocus}
      pointsData={focus} pointLat="lat" pointLng="lng" pointColor={() => "#8ee3ee"} pointAltitude={0.013} pointRadius={0.42}
      ringsData={focus} ringLat="lat" ringLng="lng" ringColor={() => "rgba(113, 211, 232, .72)"} ringMaxRadius={3.2} ringPropagationSpeed={1.35} ringRepeatPeriod={1500}
      htmlElementsData={SATELLITES} htmlLat="lat" htmlLng="lng" htmlAltitude="altitude" htmlElement={satelliteElement}
      arcsData={SATELLITES.map((s) => ({ startLat: lat, startLng: lon, endLat: s.lat, endLng: s.lng, color: ["rgba(103, 203, 228, .06)", "rgba(103, 203, 228, .42)"] }))}
      arcColor="color" arcAltitude={0.24} arcStroke={0.3} arcDashLength={0.35} arcDashGap={0.55} arcDashAnimateTime={4300}
    />}
    <OrbitalHUD globeRef={globeRef} hostRef={hostRef} lat={lat} lon={lon} label={label} onActivate={activateFocus} />
  </div>;
}
