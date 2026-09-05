import { useEffect, useRef } from "react";
import * as THREE from "three";

const TANOT = { lat: 27.83, lon: 70.17 };
const RADIUS = 1;
const FOV = 32;
const FIT_RADIUS = RADIUS * 1.08;
const FIT_MARGIN = 1.55;

function latLonToVector3(lat, lon, radius) {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  );
}

function makeLatLonGrid(radius) {
  const positions = [];
  const pushCircle = (lat, segments) => {
    for (let i = 1; i <= segments; i++) {
      const a = latLonToVector3(lat, ((i - 1) / segments) * 360 - 180, radius);
      const b = latLonToVector3(lat, (i / segments) * 360 - 180, radius);
      positions.push(a.x, a.y, a.z, b.x, b.y, b.z);
    }
  };
  const pushMeridian = (lon, segments) => {
    for (let i = 1; i <= segments; i++) {
      const a = latLonToVector3(90 - ((i - 1) / segments) * 180, lon, radius);
      const b = latLonToVector3(90 - (i / segments) * 180, lon, radius);
      positions.push(a.x, a.y, a.z, b.x, b.y, b.z);
    }
  };
  for (let lat = -60; lat <= 60; lat += 30) pushCircle(lat, 64);
  for (let lon = -180; lon < 180; lon += 30) pushMeridian(lon, 32);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  return geo;
}

function distanceToFit(radius, fovDeg, aspect, margin) {
  const vFov = THREE.MathUtils.degToRad(fovDeg);
  const distV = radius / Math.tan(vFov / 2);
  const hFov = 2 * Math.atan(Math.tan(vFov / 2) * aspect);
  const distH = radius / Math.tan(hFov / 2);
  return Math.max(distV, distH) * margin;
}

export function Globe({ lat = TANOT.lat, lon = TANOT.lon, label = "TANOT SECTOR" }) {
  const hostRef = useRef(null);
  const labelRef = useRef(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return undefined;

    const disposables = [];
    const track = (obj) => {
      disposables.push(obj);
      return obj;
    };

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 40);
    camera.position.set(0, 0, 4);
    camera.up.set(0, 1, 0);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0x000000, 0);
    renderer.domElement.style.display = "block";
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    host.appendChild(renderer.domElement);

    const earth = new THREE.Group();
    earth.position.set(0, 0, 0);
    scene.add(earth);

    const sphereGeo = track(new THREE.SphereGeometry(RADIUS, 32, 32));
    const globeMat = track(new THREE.MeshBasicMaterial({
      color: 0x0c141c,
      transparent: true,
      opacity: 0.94,
    }));
    earth.add(new THREE.Mesh(sphereGeo, globeMat));

    const wireGeo = track(new THREE.WireframeGeometry(sphereGeo));
    const wireMat = track(new THREE.LineBasicMaterial({
      color: 0x3fc7d8,
      transparent: true,
      opacity: 0.16,
    }));
    earth.add(new THREE.LineSegments(wireGeo, wireMat));

    const gridGeo = track(makeLatLonGrid(RADIUS * 1.002));
    const gridMat = track(new THREE.LineBasicMaterial({
      color: 0x3fc7d8,
      transparent: true,
      opacity: 0.22,
    }));
    earth.add(new THREE.LineSegments(gridGeo, gridMat));

    const atmoGeo = track(new THREE.SphereGeometry(RADIUS * 1.035, 32, 32));
    const atmoMat = track(new THREE.MeshBasicMaterial({
      color: 0x3fc7d8,
      transparent: true,
      opacity: 0.045,
      side: THREE.BackSide,
    }));
    earth.add(new THREE.Mesh(atmoGeo, atmoMat));

    const markerPos = latLonToVector3(lat, lon, RADIUS * 1.02);
    earth.rotation.y = Math.atan2(-markerPos.x, markerPos.z);

    const markerGroup = new THREE.Group();
    markerGroup.position.copy(markerPos);
    markerGroup.lookAt(0, 0, 0);
    earth.add(markerGroup);

    const pinGeo = track(new THREE.SphereGeometry(0.038, 12, 12));
    const pinMat = track(new THREE.MeshBasicMaterial({ color: 0x3fc7d8 }));
    markerGroup.add(new THREE.Mesh(pinGeo, pinMat));

    const ringGeo = track(new THREE.RingGeometry(0.045, 0.055, 32));
    const ringMat = track(new THREE.MeshBasicMaterial({
      color: 0x3fc7d8,
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide,
    }));
    const ringA = new THREE.Mesh(ringGeo, ringMat);
    const ringB = new THREE.Mesh(ringGeo, ringMat.clone());
    track(ringB.material);
    ringA.rotation.y = Math.PI / 2;
    ringB.rotation.y = Math.PI / 2;
    markerGroup.add(ringA);
    markerGroup.add(ringB);

    const tmp = new THREE.Vector3();
    const size = { w: 0, h: 0 };
    let lastW = 0;
    let lastH = 0;

    const fit = () => {
      const w = Math.max(1, Math.floor(host.clientWidth));
      const h = Math.max(1, Math.floor(host.clientHeight));
      if (w === lastW && h === lastH) return;
      lastW = w;
      lastH = h;
      size.w = w;
      size.h = h;
      const aspect = w / h;
      camera.aspect = aspect;
      const dist = distanceToFit(FIT_RADIUS, FOV, aspect, FIT_MARGIN);
      camera.position.set(0, 0, dist);
      camera.lookAt(0, 0, 0);
      camera.updateProjectionMatrix();
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setSize(w, h, true);
      renderer.domElement.style.width = "100%";
      renderer.domElement.style.height = "100%";
    };
    fit();
    let resizeRaf = 0;
    const ro = new ResizeObserver(() => {
      if (resizeRaf) return;
      resizeRaf = requestAnimationFrame(() => {
        resizeRaf = 0;
        fit();
      });
    });
    ro.observe(host);

    let raf = 0;
    const tick = (t) => {
      earth.rotation.y += 0.0022;
      const pulse = (Math.sin(t * 0.003) + 1) / 2;
      ringA.scale.setScalar(1 + pulse * 0.9);
      ringA.material.opacity = 0.7 - pulse * 0.45;
      ringB.scale.setScalar(1.25 + pulse * 1.1);
      ringB.material.opacity = 0.4 - pulse * 0.3;

      renderer.render(scene, camera);

      const labelEl = labelRef.current;
      if (labelEl) {
        markerGroup.getWorldPosition(tmp);
        const facing = tmp.clone().normalize().dot(camera.position.clone().normalize());
        tmp.project(camera);
        const x = (tmp.x * 0.5 + 0.5) * size.w;
        const y = (-tmp.y * 0.5 + 0.5) * size.h;
        labelEl.style.transform = `translate(${x + 10}px, ${y - 8}px)`;
        labelEl.style.opacity = facing > 0.12 ? "1" : "0";
      }

      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      if (resizeRaf) cancelAnimationFrame(resizeRaf);
      ro.disconnect();
      disposables.forEach((d) => d.dispose?.());
      renderer.dispose();
      renderer.forceContextLoss();
      if (renderer.domElement.parentNode === host) host.removeChild(renderer.domElement);
    };
  }, [lat, lon]);

  return (
    <div className="relative overflow-hidden" style={{ height: 300 }}>
      <div
        ref={hostRef}
        className="absolute overflow-hidden"
        style={{ inset: 12 }}
      />
      <div
        ref={labelRef}
        className="pointer-events-none absolute left-0 top-0 mono text-[10px] tracking-wide"
        style={{
          color: "var(--accent-cyan)",
          textShadow: "0 0 8px rgba(63,199,216,0.45)",
          whiteSpace: "nowrap",
          opacity: 0,
          willChange: "transform, opacity",
        }}
      >
        {label}
      </div>
    </div>
  );
}
