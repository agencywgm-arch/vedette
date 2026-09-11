"use client";

import { useEffect, useRef } from "react";
import { useSceneStore } from "@/store/useSceneStore";
import { products } from "@/data/products";
import { SCROLL_LENGTH_VH, stageForProgress } from "@/lib/video-timeline";
import VideoHotspot from "./VideoHotspot";

function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v));
}

export default function ScrollVideoHero() {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const durationRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const progressRef = useRef(0);

  const started = useSceneStore((s) => s.started);
  const setScrollOffset = useSceneStore((s) => s.setScrollOffset);
  const setStage = useSceneStore((s) => s.setStage);
  const lastStageRef = useRef("street");

  // Unlock scrubbing on iOS/Safari: a silent play+pause primes the video
  // so setting currentTime afterwards actually seeks instead of no-op'ing.
  useEffect(() => {
    if (!started || !videoRef.current) return;
    const video = videoRef.current;
    const primed = video.play();
    if (primed && typeof primed.then === "function") {
      primed.then(() => video.pause()).catch(() => {});
    }
  }, [started]);

  useEffect(() => {
    const video = videoRef.current;
    const wrapper = wrapperRef.current;
    if (!video || !wrapper) return;

    const onLoadedMetadata = () => {
      durationRef.current = video.duration || 0;
    };
    video.addEventListener("loadedmetadata", onLoadedMetadata);
    // metadata may already be available (cached/fast load) before this listener attaches
    if (video.readyState >= 1) onLoadedMetadata();

    const update = () => {
      rafRef.current = null;
      const rect = wrapper.getBoundingClientRect();
      const total = rect.height - window.innerHeight;
      const progress = total > 0 ? clamp(-rect.top / total, 0, 1) : 0;
      progressRef.current = progress;

      if (durationRef.current > 0) {
        const targetTime = progress * durationRef.current;
        if (Math.abs(video.currentTime - targetTime) > 0.017) {
          video.currentTime = targetTime;
        }
      }

      setScrollOffset(progress);
      const stage = stageForProgress(progress);
      if (stage !== lastStageRef.current) {
        lastStageRef.current = stage;
        setStage(stage);
      }
    };

    const onScroll = () => {
      if (rafRef.current == null) rafRef.current = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      video.removeEventListener("loadedmetadata", onLoadedMetadata);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, [setScrollOffset, setStage]);

  return (
    <div ref={wrapperRef} style={{ height: `${SCROLL_LENGTH_VH}vh` }} className="relative">
      <div className="sticky top-0 h-dvh w-full overflow-hidden bg-black">
        <video
          ref={videoRef}
          className="h-full w-full object-cover"
          poster="/videos/poster.jpg"
          muted
          playsInline
          preload="auto"
        >
          <source src="/videos/entrance.mp4" type="video/mp4" />
          <source src="/videos/entrance.webm" type="video/webm" />
        </video>
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/35 via-transparent to-black/50" />

        {products.map((p) => (
          <VideoHotspotWired key={p.id} product={p} />
        ))}
      </div>
    </div>
  );
}

function VideoHotspotWired({ product }: { product: (typeof products)[number] }) {
  const progress = useSceneStore((s) => s.scrollOffset);
  return <VideoHotspot product={product} progress={progress} />;
}
