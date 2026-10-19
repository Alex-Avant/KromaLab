"use client";

import * as React from "react";
import { useInView, useReducedMotion } from "motion/react";

import { CmykBars } from "@/components/site/cmyk-bars";

/* ------------------------------------------------------------------ */
/* RasterHero — muestra de semitono sintetizada en vivo                */
/* Una prenda procedural se rasteriza en puntos que se decodifican     */
/* al entrar en viewport. 2D canvas, sin assets externos.              */
/* ------------------------------------------------------------------ */

const W = 480;
const H = 600;
const PITCH = 6;
const COLS = W / PITCH;
const ROWS = H / PITCH;
const DECODE_MS = 1700;
const WAVE = 0.5;

function drawShirtPath(ctx: CanvasRenderingContext2D) {
  ctx.beginPath();
  ctx.moveTo(150, 128);
  ctx.quadraticCurveTo(196, 92, 240, 92);
  ctx.quadraticCurveTo(284, 92, 330, 128);
  ctx.lineTo(412, 232);
  ctx.quadraticCurveTo(398, 262, 366, 262);
  ctx.lineTo(360, 520);
  ctx.quadraticCurveTo(240, 556, 120, 520);
  ctx.lineTo(114, 262);
  ctx.quadraticCurveTo(82, 262, 68, 232);
  ctx.closePath();
}

function buildSource(): HTMLCanvasElement {
  const src = document.createElement("canvas");
  src.width = W;
  src.height = H;
  const ctx = src.getContext("2d", { willReadFrequently: true });
  if (!ctx) return src;

  const g = ctx.createLinearGradient(0, 100, 0, 560);
  g.addColorStop(0, "#303646");
  g.addColorStop(0.55, "#20242E");
  g.addColorStop(1, "#151922");

  drawShirtPath(ctx);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = "rgba(15,18,24,0.9)";
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(176, 118);
  ctx.quadraticCurveTo(240, 158, 304, 118);
  ctx.strokeStyle = "#0F1218";
  ctx.lineWidth = 9;
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(366, 262);
  ctx.lineTo(330, 320);
  ctx.moveTo(114, 262);
  ctx.lineTo(150, 320);
  ctx.strokeStyle = "rgba(15,18,24,0.55)";
  ctx.lineWidth = 2.5;
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(200, 330);
  ctx.quadraticCurveTo(230, 420, 205, 505);
  ctx.moveTo(290, 340);
  ctx.quadraticCurveTo(265, 430, 285, 500);
  ctx.strokeStyle = "rgba(10,12,17,0.35)";
  ctx.lineWidth = 5;
  ctx.stroke();

  const sw = 26;
  const gap = 6;
  const y = 196;
  const startX = 240 - (4 * sw + 3 * gap) / 2;
  ["#22D3EE", "#F43FA0", "#FACC15", "#F2F4F8"].forEach((c, i) => {
    ctx.fillStyle = c;
    ctx.fillRect(startX + i * (sw + gap), y, sw, sw);
  });
  ctx.fillStyle = "#F2F4F8";
  ctx.font = "600 13px 'JetBrains Mono', monospace";
  ctx.textAlign = "center";
  ctx.fillText("LAB·01 — SEMITONO DTF", 240, y + sw + 18);

  ctx.save();
  drawShirtPath(ctx);
  ctx.clip();
  for (let i = 0; i < 5200; i++) {
    const v = Math.random() * 255;
    ctx.fillStyle = `rgba(${v},${v},${v},0.04)`;
    ctx.fillRect(Math.random() * W, Math.random() * H, 1.5, 1.5);
  }
  ctx.restore();

  return src;
}

function sampleCells(src: HTMLCanvasElement): Float32Array {
  const ctx = src.getContext("2d", { willReadFrequently: true });
  const cells = new Float32Array(COLS * ROWS);
  if (!ctx) return cells;
  const data = ctx.getImageData(0, 0, W, H).data;
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      let sum = 0;
      let n = 0;
      for (let y = row * PITCH; y < (row + 1) * PITCH; y++) {
        for (let x = col * PITCH; x < (col + 1) * PITCH; x++) {
          const i = (y * W + x) * 4;
          if (data[i + 3] < 40) continue;
          sum += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
          n++;
        }
      }
      const idx = row * COLS + col;
      cells[idx] = n > 0 ? sum / n / 255 : -1; // -1 = vacío
    }
  }
  return cells;
}

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

export function RasterHero() {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const wrapRef = React.useRef<HTMLDivElement>(null);
  const inView = useInView(wrapRef, { once: true, margin: "-10% 0px" });
  const reduced = useReducedMotion();
  const [synthesized, setSynthesized] = React.useState(false);
  const hoverRef = React.useRef<{ x: number; y: number } | null>(null);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const src = buildSource();
    const cells = sampleCells(src);

    let raf = 0;
    let elapsed = 0;
    let last = performance.now();
    let done = false;

    const draw = (t: number) => {
      const eased = easeOutCubic(Math.min(t, 1));
      ctx.clearRect(0, 0, W, H);

      for (let row = 0; row < ROWS; row++) {
        for (let col = 0; col < COLS; col++) {
          const idx = row * COLS + col;
          const lum = cells[idx];
          const cx = col * PITCH + PITCH / 2;
          const cy = row * PITCH + PITCH / 2;
          const p = Math.max(
            0,
            Math.min(1, eased * (1 + WAVE) - (col / COLS) * WAVE)
          );

          if (lum < 0) {
            ctx.fillStyle = "rgba(242,244,248,0.05)";
            ctx.beginPath();
            ctx.arc(cx, cy, 0.8, 0, Math.PI * 2);
            ctx.fill();
            continue;
          }

          const inv = 1 - lum;
          let r = PITCH * 0.46 * (0.15 + 0.85 * inv) * p;
          if (r < 0.3) continue;

          const hover = hoverRef.current;
          if (hover) {
            const d = Math.hypot(cx - hover.x, cy - hover.y);
            if (d < 44) r *= 1 + 0.16 * (1 - d / 44);
          }

          ctx.fillStyle = "rgba(242,244,248,0.96)";
          ctx.beginPath();
          ctx.arc(cx, cy, r, 0, Math.PI * 2);
          ctx.fill();

          if ((col * 7 + row * 13) % 17 === 0 && inv > 0.45) {
            ctx.fillStyle = `rgba(34,211,238,${0.22 * p})`;
            ctx.beginPath();
            ctx.arc(cx + 2.5, cy - 1.5, r * 0.55, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = `rgba(244,63,160,${0.14 * p})`;
            ctx.beginPath();
            ctx.arc(cx - 2.5, cy + 1.5, r * 0.5, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }

      if (!done && t >= 1) {
        done = true;
        setSynthesized(true);
      }
    };

    const loop = (now: number) => {
      const dt = now - last;
      last = now;
      if (!done) elapsed += dt;
      const t = elapsed / DECODE_MS;
      const hover = hoverRef.current;
      if (!done || hover) draw(t);
      if (!done || hover) raf = requestAnimationFrame(loop);
    };

    const reducedDraw = () => {
      done = true;
      setSynthesized(true);
      draw(1);
    };

    if (reduced) {
      reducedDraw();
    } else if (inView) {
      raf = requestAnimationFrame(loop);
    }

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !done && !reduced && !raf) {
          raf = requestAnimationFrame(loop);
        } else if (!entry.isIntersecting) {
          cancelAnimationFrame(raf);
          raf = 0;
        }
      },
      { threshold: 0.05 }
    );
    io.observe(canvas);

    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
    };
  }, [inView, reduced]);

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    hoverRef.current = {
      x: ((e.clientX - rect.left) / rect.width) * W,
      y: ((e.clientY - rect.top) / rect.height) * H,
    };
  };
  const onPointerLeave = () => {
    hoverRef.current = null;
  };

  return (
    <div ref={wrapRef}>
      <div className="relative rounded-md border border-border bg-surface">
        <span className="absolute top-3 left-3 z-10 tech-value text-[10px] tracking-[0.2em] text-muted-foreground">
          VISTA DE MUESTRA — TRAMA
        </span>
        <span className="absolute top-3 right-3 z-10 tech-value text-[10px] tracking-[0.2em] text-muted-foreground">
          ⌖
        </span>
        <canvas
          ref={canvasRef}
          role="img"
          aria-label="Muestra de trama de semitono DTF sobre prenda, sintetizada en vivo"
          onPointerMove={onPointerMove}
          onPointerLeave={onPointerLeave}
          className="block aspect-[4/5] w-full touch-none"
        />
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 border-t border-border px-4 py-3 sm:grid-cols-4">
          <div>
            <p className="tech-value text-[9px] tracking-[0.18em] text-muted-foreground">
              RESOLUCIÓN
            </p>
            <p className="tech-value text-xs text-foreground">480 × 600 · MUESTRA</p>
          </div>
          <div>
            <p className="tech-value text-[9px] tracking-[0.18em] text-muted-foreground">
              TRAMA
            </p>
            <p className="tech-value text-xs text-foreground">{COLS} × {ROWS} CELLS</p>
          </div>
          <div>
            <p className="tech-value text-[9px] tracking-[0.18em] text-muted-foreground">
              LPI SIMULADO
            </p>
            <p className="tech-value text-xs text-foreground">34 LPI · 45°</p>
          </div>
          <div>
            <p className="tech-value text-[9px] tracking-[0.18em] text-muted-foreground">
              SÍNTESIS
            </p>
            <p
              className={
                "tech-value text-xs " +
                (synthesized ? "text-primary" : "text-warning")
              }
            >
              {synthesized ? "COMPLETA" : "DECODIFICANDO…"}
            </p>
          </div>
        </div>
        <div className="border-t border-border px-4 py-3">
          <CmykBars labels values={["100", "100", "100", "0"]} />
        </div>
      </div>
    </div>
  );
}
