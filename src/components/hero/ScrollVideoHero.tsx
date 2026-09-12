"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { useSceneStore } from "@/store/useSceneStore";
import { products } from "@/data/products";
import { SCROLL_LENGTH_VH, stageForProgress } from "@/lib/video-timeline";
import VideoHotspot from "./VideoHotspot";

const MOBILE_QUERY = "(max-width: 767px)";

function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v));
}

function subscribeMobileQuery(callback: () => void) {
  const mql = window.matchMedia(MOBILE_QUERY);
  mql.addEventListener("change", callback);
  return () => mql.removeEventListener("change", callback);
}

function getMobileSnapshot() {
  return window.matchMedia(MOBILE_QUERY).matches;
}

function getMobileServerSnapshot() {
  return false;
}

export default function ScrollVideoHero() {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const durationRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const progressRef = useRef(0);
  const isMobile = useSyncExternalStore(
    subscribeMobileQuery,
    getMobileSnapshot,
    getMobileServerSnapshot
  );

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
  }, [started, isMobile]);

  useEffect(() => {
    const video = videoRef.current;
    const wrapper = wrapperRef.current;
    if (!video || !wrapper) return;

    durationRef.current = 0;
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
  }, [setScrollOffset, setStage, isMobile]);

  return (
    <div ref={wrapperRef} style={{ height: `${SCROLL_LENGTH_VH}vh` }} className="relative">
      <div className="sticky top-0 h-dvh w-full overflow-hidden bg-black">
        <video
          key={isMobile ? "vertical" : "horizontal"}
          ref={videoRef}
          className="h-full w-full object-cover"
          poster={isMobile ? "/videos/poster-vertical.jpg" : "/videos/poster.jpg"}
          muted
          playsInline
          preload="auto"
        >
          {isMobile ? (
            <>
              <source src="/videos/entrance-vertical.mp4" type="video/mp4" />
              <source src="/videos/entrance-vertical.webm" type="video/webm" />
            </>
          ) : (
            <>
              <source src="/videos/entrance.mp4" type="video/mp4" />
              <source src="/videos/entrance.webm" type="video/webm" />
            </>
          )}
        </video>
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/35 via-transparent to-black/50" />

        {products.map((p) => (
          <VideoHotspotWired key={p.id} product={p} isMobile={isMobile} />
        ))}
      </div>
    </div>
  );
}

function VideoHotspotWired({
  product,
  isMobile,
}: {
  product: (typeof products)[number];
  isMobile: boolean;
}) {
  const progress = useSceneStore((s) => s.scrollOffset);
  return <VideoHotspot product={product} progress={progress} isMobile={isMobile} />;
}
