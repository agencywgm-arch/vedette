"use client";

import { useEffect, useRef } from "react";

/**
 * A mini 90s arcade cabinet standing at the foot of the wall. Everything on it
 * that glows is live: the screen runs a tiny attract-mode game, the four
 * buttons pulse in turn and the marquee breathes. The cabinet photo itself is
 * a flat cut-out; the light on top of it is drawn here so it never stops.
 */

// Design space = the cut-out's own pixels (480 wide), scaled to the box.
const DW = 480;
const RATIO = 0.5718; // width / height of the cut-out
const DH = Math.round(DW / RATIO);

// Corner points and centres, as fractions of the cut-out.
const SCREEN = [
  [0.2429, 0.2342],
  [0.8441, 0.2299],
  [0.8219, 0.51],
  [0.2206, 0.4888],
] as const;
const BUTTONS = [
  [0.3988, 0.5805, "#ff3b3b"],
  [0.4879, 0.5847, "#ffd23a"],
  [0.5769, 0.589, "#3b8bff"],
  [0.6645, 0.5924, "#3bff6a"],
] as const;
const MARQUEE = { x: 0.1271, y: 0.0076, w: 0.7274, h: 0.12 };

const CW = 64;
const CH = 48;

/** CSS matrix3d that maps the canvas rectangle onto the screen quadrilateral. */
function quadMatrix(w: number, h: number, dst: readonly (readonly [number, number])[]) {
  const [[x0, y0], [x1, y1], [x2, y2], [x3, y3]] = dst.map(([x, y]) => [x * DW, y * DH]);
  const dx1 = x1 - x2, dx2 = x3 - x2, dx3 = x0 - x1 + x2 - x3;
  const dy1 = y1 - y2, dy2 = y3 - y2, dy3 = y0 - y1 + y2 - y3;
  const den = dx1 * dy2 - dx2 * dy1;
  const g = (dx3 * dy2 - dx2 * dy3) / den;
  const hh = (dx1 * dy3 - dx3 * dy1) / den;
  const a = x1 - x0 + g * x1, b = x3 - x0 + hh * x3, c = x0;
  const d = y1 - y0 + g * y1, e = y3 - y0 + hh * y3, f = y0;
  // unit square → quad is [a b c; d e f; g h 1]; pre-scale by 1/w, 1/h
  return `matrix3d(${a / w},${d / w},0,${g / w},${b / h},${e / h},0,${hh / h},0,0,1,0,${c},${f},0,1)`;
}

function drawGame(ctx: CanvasRenderingContext2D, t: number) {
  ctx.fillStyle = "#04050c";
  ctx.fillRect(0, 0, CW, CH);
  // slow starfield
  ctx.fillStyle = "#3a4a86";
  for (let i = 0; i < 18; i++) {
    const x = (i * 37) % CW;
    const y = (i * 53 + Math.floor(t / 90)) % CH;
    ctx.fillRect(x, y, 1, 1);
  }
  // invaders march side to side and step down
  const step = Math.floor(t / 420);
  const sway = Math.round(Math.sin(step / 3) * 5);
  const drop = Math.floor((step % 24) / 6);
  const frame = step % 2;
  const colours = ["#ff4d6d", "#ffd23a", "#4dd2ff", "#7dff6a"];
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 8; c++) {
      const x = 7 + c * 6 + sway;
      const y = 4 + r * 5 + drop;
      ctx.fillStyle = colours[r];
      ctx.fillRect(x, y, 4, 3);
      ctx.fillRect(x + (frame ? 0 : 1), y + 3, 1, 1);
      ctx.fillRect(x + (frame ? 3 : 2), y + 3, 1, 1);
    }
  }
  // the ship slides and fires
  const shipX = 28 + Math.round(Math.sin(t / 900) * 22);
  ctx.fillStyle = "#e8f0ff";
  ctx.fillRect(shipX, CH - 6, 5, 2);
  ctx.fillRect(shipX + 2, CH - 8, 1, 2);
  const shot = (t / 55) % 40;
  ctx.fillStyle = "#fff56b";
  ctx.fillRect(shipX + 2, CH - 9 - shot, 1, 3);
  // score bar
  ctx.fillStyle = "#ffd23a";
  ctx.fillRect(2, 1, 10, 1);
  ctx.fillStyle = "#4dd2ff";
  ctx.fillRect(CW - 14, 1, 3, 1);
  ctx.fillRect(CW - 9, 1, 3, 1);
  ctx.fillRect(CW - 4, 1, 3, 1);
}

export default function ArcadeCabinet({
  left,
  top,
  width,
  dimmed,
}: {
  /** Box on the wall, in % of the wall picture. */
  left: number;
  top: number;
  width: number;
  dimmed: boolean;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Keep the fixed-size design stage fitted to whatever size the wall has now.
  useEffect(() => {
    const box = boxRef.current;
    const stage = stageRef.current;
    if (!box || !stage) return;
    const fit = () => {
      stage.style.transform = `scale(${box.clientWidth / DW})`;
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(box);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.style.transform = quadMatrix(CW, CH, SCREEN);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let raf = 0;
    let last = 0;
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      if (now - last < 66) return; // ~15 fps is plenty for pixel art
      last = now;
      drawGame(ctx, now);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div
      ref={boxRef}
      className={`arcade ${dimmed ? "is-dimmed" : ""}`}
      style={{ left: `${left}%`, top: `${top}%`, width: `${width}%`, aspectRatio: `${RATIO}` }}
      aria-hidden="true"
    >
      <div className="arcade-shadow" />
      <div ref={stageRef} className="arcade-stage" style={{ width: DW, height: DH }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/collection/arcade.webp?v=3" alt="" width={DW} height={DH} draggable={false} />
        <div
          className="arcade-marquee"
          style={{
            left: MARQUEE.x * DW,
            top: MARQUEE.y * DH,
            width: MARQUEE.w * DW,
            height: MARQUEE.h * DH,
          }}
        />
        <canvas ref={canvasRef} width={CW} height={CH} className="arcade-screen" />
        <div
          className="arcade-screen-glow"
          style={{ left: SCREEN[0][0] * DW - 30, top: SCREEN[0][1] * DH - 30, width: (SCREEN[1][0] - SCREEN[0][0]) * DW + 60, height: (SCREEN[3][1] - SCREEN[0][1]) * DH + 60 }}
        />
        {BUTTONS.map(([x, y, c], i) => (
          <span
            key={i}
            className="arcade-btn"
            style={{ left: x * DW - 26, top: y * DH - 26, ["--c" as string]: c, animationDelay: `${i * 0.45}s` }}
          />
        ))}
      </div>
    </div>
  );
}
