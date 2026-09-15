"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type WheelEvent,
} from "react";
import Image from "next/image";
import { useSceneStore } from "@/store/useSceneStore";
import { products } from "@/data/products";
import ProductViewer3D from "./ProductViewer3D";

function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v));
}

const DRAG_SNAP_THRESHOLD = 0.28; // slot units of drag before it commits to the next/prev card
const FLICK_VELOCITY_THRESHOLD = 0.5; // px/ms — a fast flick commits even over a short distance

/** Full-screen coverflow-style product browser — opens on any hotspot click,
 * shows the whole collection, not just the item that was clicked. Cards
 * follow the pointer 1:1 while dragging (mouse or touch) and glide to rest
 * on release, rather than snapping in discrete steps. */
export default function CollectionViewer() {
  const activeProductId = useSceneStore((s) => s.activeProductId);
  const setActiveProductId = useSceneStore((s) => s.setActiveProductId);
  const open = activeProductId !== null;

  const [activeIndex, setActiveIndex] = useState(0);
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const wheelLockRef = useRef(false);
  const trackRef = useRef<HTMLDivElement>(null);
  const dragStartXRef = useRef<number | null>(null);
  const dragLastXRef = useRef(0);
  const dragLastTRef = useRef(0);
  const dragVelocityRef = useRef(0);
  const hasDraggedRef = useRef(false);

  // Reset the active card to whichever product was clicked, each time the
  // viewer opens on a (possibly different) product — done during render
  // rather than in an effect, per React's guidance for adjusting state in
  // response to a prop change.
  const [lastSyncedProductId, setLastSyncedProductId] = useState(activeProductId);
  if (activeProductId !== lastSyncedProductId) {
    setLastSyncedProductId(activeProductId);
    const idx = products.findIndex((p) => p.id === activeProductId);
    if (idx >= 0) setActiveIndex(idx);
  }

  const close = useCallback(() => setActiveProductId(null), [setActiveProductId]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      else if (e.key === "ArrowRight") setActiveIndex((i) => clamp(i + 1, 0, products.length - 1));
      else if (e.key === "ArrowLeft") setActiveIndex((i) => clamp(i - 1, 0, products.length - 1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close]);

  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  const handleWheel = (e: WheelEvent) => {
    if (wheelLockRef.current) return;
    const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
    if (Math.abs(delta) < 24) return;
    wheelLockRef.current = true;
    setActiveIndex((i) => clamp(i + (delta > 0 ? 1 : -1), 0, products.length - 1));
    setTimeout(() => {
      wheelLockRef.current = false;
    }, 380);
  };

  // Pointer events unify mouse-drag and touch-swipe: the carousel slides
  // continuously under the cursor/finger instead of jumping one card per
  // gesture. (Dragging the active card's 3D object itself stops propagation
  // before it reaches these handlers, so rotating it never triggers a
  // card change.)
  const handlePointerDown = (e: ReactPointerEvent) => {
    dragStartXRef.current = e.clientX;
    dragLastXRef.current = e.clientX;
    dragLastTRef.current = performance.now();
    dragVelocityRef.current = 0;
    hasDraggedRef.current = false;
    setIsDragging(true);
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };

  const handlePointerMove = (e: ReactPointerEvent) => {
    if (dragStartXRef.current == null) return;
    const width = trackRef.current?.offsetWidth || 1;
    const now = performance.now();
    const dt = now - dragLastTRef.current;
    if (dt > 0) dragVelocityRef.current = (e.clientX - dragLastXRef.current) / dt;
    dragLastXRef.current = e.clientX;
    dragLastTRef.current = now;
    const dx = e.clientX - dragStartXRef.current;
    if (Math.abs(dx) > 5) hasDraggedRef.current = true;
    setDragOffset(-dx / (width * 0.58));
  };

  const endDrag = () => {
    if (dragStartXRef.current == null) return;
    dragStartXRef.current = null;
    setIsDragging(false);
    let delta = 0;
    if (Math.abs(dragOffset) > DRAG_SNAP_THRESHOLD) {
      delta = dragOffset > 0 ? 1 : -1;
    } else if (Math.abs(dragVelocityRef.current) > FLICK_VELOCITY_THRESHOLD) {
      delta = dragVelocityRef.current < 0 ? 1 : -1;
    }
    setActiveIndex((i) => clamp(i + delta, 0, products.length - 1));
    setDragOffset(0);
  };

  const activeProduct = products[activeIndex];

  return (
    <div
      className={`fixed inset-0 z-40 flex flex-col overflow-hidden bg-[#050506] transition-opacity duration-300 ${
        open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
      }`}
      onWheel={handleWheel}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(242,195,0,0.1),transparent_62%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,rgba(0,0,0,0.6),transparent_18%,transparent_78%,rgba(0,0,0,0.75))]" />

      <div className="relative flex items-center justify-between px-5 py-5 sm:px-10 sm:py-6">
        <div>
          <p className="text-[10px] uppercase tracking-[0.45em] text-[#f2c300]">Vedette</p>
          <h2 className="text-lg font-black uppercase tracking-wide sm:text-2xl">Collection</h2>
        </div>
        <button type="button" onClick={close} className="collection-close-btn" aria-label="Fermer">
          <span>Fermer</span>
          <span className="collection-close-x">✕</span>
        </button>
      </div>

      <div className="relative flex flex-1 items-center justify-center px-4" style={{ perspective: "1600px" }}>
        <button
          type="button"
          onClick={() => setActiveIndex((i) => clamp(i - 1, 0, products.length - 1))}
          disabled={activeIndex === 0}
          className="collection-arrow left-1 sm:left-6"
          aria-label="Précédent"
        >
          ‹
        </button>
        <button
          type="button"
          onClick={() => setActiveIndex((i) => clamp(i + 1, 0, products.length - 1))}
          disabled={activeIndex === products.length - 1}
          className="collection-arrow right-1 sm:right-6"
          aria-label="Suivant"
        >
          ›
        </button>

        <div
          ref={trackRef}
          className={`relative h-[48vh] w-full max-w-5xl select-none sm:h-[56vh] ${
            isDragging ? "cursor-grabbing" : "cursor-grab"
          }`}
          style={{ touchAction: "pan-y" }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onPointerLeave={(e) => {
            // Only bail the drag if the pointer actually left with the
            // button up — losing capture mid-drag would otherwise strand it.
            if (dragStartXRef.current != null && e.buttons === 0) endDrag();
          }}
        >
          {products.map((p, i) => {
            const rawOffset = i - activeIndex;
            const effectiveOffset = rawOffset - dragOffset;
            const abs = Math.abs(effectiveOffset);
            if (abs > 2.6) return null;
            const isActive = rawOffset === 0;
            const translateX = effectiveOffset * 58;
            const rotateY = clamp(effectiveOffset * -38, -80, 80);
            const scale = clamp(1 - abs * 0.18, 0.3, 1);
            const z = Math.round(10 - abs);

            const cardStyle = {
              transform: `translate(-50%, -50%) translateX(${translateX}%) rotateY(${rotateY}deg) scale(${scale})`,
              zIndex: z,
              opacity: clamp(1 - abs * 0.32, 0, 1),
              transition: isDragging ? "none" : undefined,
            };

            // The active card hosts a real draggable 3D object (its own
            // pointer/drag handling), so it can't also be a <button> — side
            // cards stay plain image buttons you click to bring to center.
            if (isActive) {
              return (
                <div
                  key={p.id}
                  className="collection-card collection-card-active"
                  style={cardStyle}
                  aria-current
                >
                  <span className="collection-card-frame" aria-hidden="true">
                    <span className="hotspot-corner hotspot-corner-tl is-hovered" />
                    <span className="hotspot-corner hotspot-corner-tr is-hovered" />
                    <span className="hotspot-corner hotspot-corner-bl is-hovered" />
                    <span className="hotspot-corner hotspot-corner-br is-hovered" />
                  </span>
                  {open && p.image && <ProductViewer3D imageSrc={p.image} model={p.model} />}
                  {p.tag && <span className="collection-card-tag">{p.tag}</span>}
                </div>
              );
            }

            return (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  if (hasDraggedRef.current) return;
                  setActiveIndex(i);
                }}
                className="collection-card"
                style={cardStyle}
                aria-label={p.name}
              >
                {p.image && (
                  <Image
                    src={p.image}
                    alt={p.name}
                    fill
                    sizes="(max-width: 640px) 70vw, 340px"
                    className="collection-card-image"
                    draggable={false}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {activeProduct && (
        <div className="relative fade-in px-6 pb-6 text-center sm:px-10 sm:pb-8" key={activeProduct.id}>
          <p className="text-[10px] uppercase tracking-[0.35em] text-white/40 sm:text-xs">
            {activeProduct.tagline}
          </p>
          <h3 className="mt-1 text-2xl font-black uppercase tracking-tight text-white sm:text-3xl">
            {activeProduct.name}
          </h3>
          <p className="mx-auto mt-3 max-w-md text-xs leading-relaxed text-white/70 sm:text-sm">
            {activeProduct.description}
          </p>
          <div className="mt-5 flex items-center justify-center gap-5">
            <span className="text-xl font-bold text-[#f2c300] sm:text-2xl">
              {activeProduct.price ?? ""}
            </span>
            <button className="collection-cta">
              {activeProduct.price ? "Ajouter au panier" : "En savoir plus"}
            </button>
          </div>
        </div>
      )}

      <div className="relative flex items-center justify-center gap-2 pb-6 sm:pb-8">
        {products.map((p, i) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setActiveIndex(i)}
            className={`collection-dot ${i === activeIndex ? "collection-dot-active" : ""}`}
            aria-label={p.name}
          />
        ))}
      </div>
    </div>
  );
}
