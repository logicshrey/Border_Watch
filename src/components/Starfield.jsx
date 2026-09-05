import { useEffect, useRef } from "react";

const STAR_COUNT = 320;

export function Starfield() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext("2d");
    if (!ctx) return undefined;

    const stars = Array.from({ length: STAR_COUNT }, () => ({
      x: Math.random(),
      y: Math.random(),
      size: Math.random() * 1.15 + 0.25,
      alpha: Math.random() * 0.28 + 0.06,
      drift: (Math.random() - 0.5) * 0.00012,
    }));

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(window.innerWidth * dpr);
      canvas.height = Math.floor(window.innerHeight * dpr);
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    let raf = 0;
    const draw = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      ctx.fillStyle = "#060a0f";
      ctx.fillRect(0, 0, w, h);
      for (const star of stars) {
        star.x += star.drift;
        if (star.x < 0) star.x += 1;
        if (star.x > 1) star.x -= 1;
        ctx.fillStyle = `rgba(216, 228, 236, ${star.alpha})`;
        ctx.fillRect(star.x * w, star.y * h, star.size, star.size);
      }
      raf = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="starfield"
      aria-hidden="true"
    />
  );
}
