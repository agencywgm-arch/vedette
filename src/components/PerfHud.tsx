"use client";

import { useEffect, useRef } from "react";

/**
 * Opt-in frame-rate readout: open the site with `?perf` and a small box shows
 * the frames per second, the worst frame of the last two seconds, the long
 * main-thread stalls and the device's own figures, so lag can be reported with
 * numbers from the real device. Without the flag it does nothing at all.
 */
export default function PerfHud() {
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!new URLSearchParams(window.location.search).has("perf")) return;
    const el = box.current;
    if (!el) return;
    el.style.display = "block";
    let raf = 0;
    let last = performance.now();
    let frames = 0;
    let worst = 0;
    let stalls = 0;
    let since = last;
    let observer: PerformanceObserver | null = null;
    try {
      observer = new PerformanceObserver((list) => {
        stalls += list.getEntries().length;
      });
      observer.observe({ entryTypes: ["longtask"] });
    } catch {
      /* long-task timing is not available everywhere */
    }
    const nav = navigator as Navigator & { deviceMemory?: number };
    const device = `${window.innerWidth}x${window.innerHeight} @${window.devicePixelRatio}x · ${nav.deviceMemory ?? "?"} Go · ${navigator.hardwareConcurrency ?? "?"} coeurs`;
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      frames++;
      worst = Math.max(worst, now - last);
      last = now;
      if (now - since >= 2000) {
        const fps = Math.round((frames * 1000) / (now - since));
        const mem = (performance as Performance & { memory?: { usedJSHeapSize: number } }).memory;
        el.textContent = `${fps} i/s · pire image ${Math.round(worst)} ms · blocages ${stalls}${
          mem ? ` · JS ${Math.round(mem.usedJSHeapSize / 1048576)} Mo` : ""
        }\n${device}`;
        frames = 0;
        worst = 0;
        stalls = 0;
        since = now;
      }
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      observer?.disconnect();
    };
  }, []);

  return (
    <div
      ref={box}
      aria-hidden="true"
      style={{
        display: "none",
        position: "fixed",
        left: 8,
        bottom: 8,
        zIndex: 99999,
        padding: "6px 8px",
        borderRadius: 6,
        background: "rgba(0,0,0,0.78)",
        color: "#7dff9a",
        font: "11px/1.35 ui-monospace, monospace",
        whiteSpace: "pre",
        pointerEvents: "none",
      }}
    />
  );
}
