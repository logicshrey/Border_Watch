import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import GlobeGL from "react-globe.gl";

const ACCENT_CYAN = "#3fc7d8";
const TANOT = { lat: 27.83, lng: 70.17 };
const TANOT_SECTOR = "Tanot Sector";
const FLY_MS = 1800;

export function Globe({
  lat = TANOT.lat,
  lon = TANOT.lng,
  label = "TANOT SECTOR",
  onSelectSector,
}) {
  const hostRef = useRef(null);
  const globeRef = useRef(null);
  const flyingRef = useRef(false);
  const [size, setSize] = useState({ w: 0, h: 0 });

  const marker = useMemo(
    () => [{ lat, lng: lon, name: label, sector: TANOT_SECTOR }],
    [lat, lon, label]
  );

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return undefined;
    const measure = () => {
      const w = Math.max(1, Math.floor(host.clientWidth));
      const h = Math.max(1, Math.floor(host.clientHeight));
      setSize((prev) => (prev.w === w && prev.h === h ? prev : { w, h }));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(host);
    return () => ro.disconnect();
  }, []);

  const applyIdleControls = useCallback(() => {
    const globe = globeRef.current;
    if (!globe) return;
    globe.pointOfView({ lat, lng: lon, altitude: 1.8 }, 0);
    const controls = globe.controls();
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.35;
    controls.enableDamping = true;
  }, [lat, lon]);

  const flyToTanot = useCallback(() => {
    const globe = globeRef.current;
    if (!globe || flyingRef.current) return;
    flyingRef.current = true;
    globe.controls().autoRotate = false;
    globe.pointOfView({ lat, lng: lon, altitude: 0.3 }, FLY_MS);
    window.setTimeout(() => {
      onSelectSector?.(TANOT_SECTOR);
    }, FLY_MS);
  }, [lat, lon, onSelectSector]);

  const htmlElement = useCallback((d) => {
    const el = document.createElement("div");
    el.style.cssText = [
      "width:40px",
      "height:40px",
      "border-radius:50%",
      "cursor:pointer",
      "transform:translate(-50%,-50%)",
      "pointer-events:auto",
    ].join(";");
    el.title = d.name;
    el.addEventListener("click", (e) => {
      e.stopPropagation();
      flyToTanot();
    });
    return el;
  }, [flyToTanot]);

  const onNearTanot = useCallback(
    ({ lat: clickLat, lng: clickLng }) => {
      const dLat = clickLat - lat;
      const dLng = ((clickLng - lon + 540) % 360) - 180;
      if (Math.hypot(dLat, dLng) < 8) flyToTanot();
    },
    [flyToTanot, lat, lon]
  );

  return (
    <div className="relative overflow-hidden" style={{ height: 300 }}>
      <div
        ref={hostRef}
        className="absolute overflow-hidden"
        style={{ inset: 12 }}
      >
        {size.w > 0 && size.h > 0 && (
          <GlobeGL
            ref={globeRef}
            width={size.w}
            height={size.h}
            backgroundColor="rgba(0,0,0,0)"
            globeImageUrl="//unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
            bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
            showAtmosphere
            atmosphereColor={ACCENT_CYAN}
            atmosphereAltitude={0.18}
            enablePointerInteraction
            onGlobeReady={applyIdleControls}
            pointsData={marker}
            pointLat="lat"
            pointLng="lng"
            pointColor={() => ACCENT_CYAN}
            pointAltitude={0.012}
            pointRadius={0.6}
            pointLabel={() => label}
            ringsData={marker}
            ringLat="lat"
            ringLng="lng"
            ringColor={() => `rgba(63,199,216,0.75)`}
            ringMaxRadius={4}
            ringPropagationSpeed={2.2}
            ringRepeatPeriod={1100}
            labelsData={marker}
            labelLat="lat"
            labelLng="lng"
            labelText="name"
            labelColor={() => ACCENT_CYAN}
            labelSize={1.6}
            labelDotRadius={0.2}
            labelAltitude={0.03}
            labelIncludeDot={false}
            htmlElementsData={marker}
            htmlLat="lat"
            htmlLng="lng"
            htmlAltitude={0.02}
            htmlElement={htmlElement}
            onPointClick={flyToTanot}
            onLabelClick={flyToTanot}
            onGlobeClick={onNearTanot}
          />
        )}
      </div>
    </div>
  );
}
