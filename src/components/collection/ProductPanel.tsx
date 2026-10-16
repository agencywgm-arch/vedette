"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import {
  FIT_FRAMES,
  femmeFolder,
  type CollectionItem,
} from "@/data/collection";
import { useShopStore } from "@/store/useShopStore";
import CabineViewer from "./CabineViewer";
import CabineVideo from "./CabineVideo";

// Real-cloth curtain (WebGL). Phones and laptops without WebGL keep the CSS one.
const CabineCurtain3D = dynamic(() => import("./CabineCurtain3D"), { ssr: false });

function canUseWebGL() {
  try {
    if ((navigator.hardwareConcurrency ?? 8) <= 2) return false;
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

// Masqué en attendant de nouveaux mannequins femmes.
const SHOW_FEMME = false;

function formatPrice(price: number) {
  return `€${price.toFixed(2).replace(".", ",")}`;
}

export default function ProductPanel({
  item,
  onClose,
}: {
  item: CollectionItem;
  onClose: () => void;
}) {
  const addToCart = useShopStore((s) => s.addToCart);
  const bundleAccessory = useShopStore((s) => s.bundleAccessory);
  const setBundleAccessory = useShopStore((s) => s.setBundleAccessory);
  const [color, setColor] = useState(item.colors[0]?.name ?? "");
  const [size, setSize] = useState(item.sizes[1] ?? item.sizes[0] ?? "");
  const [added, setAdded] = useState(false);
  const [cabineOpen, setCabineOpenRaw] = useState(false);
  const [curtainDone, setCurtainDone] = useState(false);
  const [curtain3d, setCurtain3d] = useState(false);
  const [curtainReady, setCurtainReady] = useState(false);
  useEffect(() => setCurtain3d(canUseWebGL()), []);
  // Every entry into the cabine replays the curtain.
  const setCabineOpen = (v: boolean) => {
    if (v) {
      setCurtainDone(false);
      setCurtainReady(false);
    }
    setCabineOpenRaw(v);
  };
  // Safety net: if a browser never fires the animation events (battery saver,
  // background tab), the curtain is removed anyway so it can't stay on screen.
  useEffect(() => {
    if (!cabineOpen || curtainDone) return;
    const id = window.setTimeout(() => setCurtainDone(true), 2100);
    return () => window.clearTimeout(id);
  }, [cabineOpen, curtainDone]);
  const [gender, setGender] = useState<"homme" | "femme">("homme");
  const isFemme = SHOW_FEMME && gender === "femme" && !!item.femme;
  return (
    <>
    <aside className="shop-panel">
      <button type="button" className="shop-panel-close" onClick={onClose} aria-label="Fermer">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>

      {/* The wrappers do nothing on desktop, where the sheet stacks. On a phone
          they let the title sit beside the price and the two pickers share one
          row, which is most of what makes the sheet short enough there. */}
      <div className="shop-panel-head">
        <h2 className="shop-panel-title">{item.name}</h2>
        <p className="shop-panel-price">{formatPrice(item.price)}</p>
      </div>
      <hr className="shop-panel-rule" />
      <p className="shop-panel-desc">{item.description}</p>

      <div className="shop-panel-fields">
        <div className="shop-panel-field">
          <p className="shop-panel-label">Couleurs</p>
          <div className="shop-swatches">
            {item.colors.map((c) => (
              <button
                key={c.name}
                type="button"
                title={c.name}
                aria-label={c.name}
                aria-pressed={color === c.name}
                className={`shop-swatch ${color === c.name ? "is-active" : ""}`}
                style={{ background: c.hex }}
                onClick={() => setColor(c.name)}
              />
            ))}
          </div>
        </div>

        <div className="shop-panel-field">
          <p className="shop-panel-label">Tailles</p>
          <div className="shop-sizes">
            {item.sizes.map((s) => (
              <button
                key={s}
                type="button"
                aria-pressed={size === s}
                className={`shop-size ${size === s ? "is-active" : ""}`}
                onClick={() => setSize(s)}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>

      {item.accessory && (
        <label className="shop-accessory-toggle">
          <input
            type="checkbox"
            checked={bundleAccessory}
            onChange={(e) => setBundleAccessory(e.target.checked)}
          />
          + {item.accessory.name.toUpperCase()} (offerte)
        </label>
      )}

      <button
        type="button"
        className="shop-cta"
        onClick={() => {
          addToCart({ itemId: item.id, color, size });
          setAdded(true);
          window.setTimeout(() => setAdded(false), 1800);
        }}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M6 8h12l-1 12H7L6 8z" />
          <path d="M9 8V6a3 3 0 016 0v2" />
        </svg>
        {added ? "Ajouté au panier" : "Ajouter au panier"}
      </button>

      {item.cabine && (
        <button
          type="button"
          className="shop-cta shop-cta-cabine"
          onClick={() => setCabineOpen(true)}
        >
          Essayer en cabine
        </button>
      )}
    </aside>

    {cabineOpen && item.cabine && (
      <div
        className="shop-cabine-overlay"
        onClick={() => setCabineOpen(false)}
        role="button"
        tabIndex={-1}
        aria-label="Fermer la cabine"
      >
        {/* The fitting-room curtain: closed on arrival, then drawn aside. */}
        {!curtainDone && (
          <div className="cabine-curtains" aria-hidden="true">
            {curtain3d ? (
              <>
                {!curtainReady && <div className="cabine-curtain-ph" />}
                <CabineCurtain3D
                  onReady={() => requestAnimationFrame(() => requestAnimationFrame(() => setCurtainReady(true)))}
                />
              </>
            ) : (
              <>
                <div className="cabine-curtain cabine-curtain-l" />
                <div className="cabine-curtain cabine-curtain-r" />
                <div className="cabine-logo-half cabine-logo-l">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/logo-white.png" alt="" draggable={false} decoding="sync" />
                </div>
                <div className="cabine-logo-half cabine-logo-r">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/logo-white.png" alt="" draggable={false} decoding="sync" />
                </div>
              </>
            )}
          </div>
        )}
        <button
          type="button"
          className="shop-cabine-close"
          onClick={(e) => {
            e.stopPropagation();
            setCabineOpen(false);
          }}
          aria-label="Fermer la cabine"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
        {item.cabineVideo ? (
          <CabineVideo
            key={isFemme ? `${item.id}-f` : `${item.id}-h`}
            src={isFemme ? `${item.cabineVideo}-femme` : item.cabineVideo}
            label={`${item.name} — ${isFemme ? "Femme" : "Homme"}`}
            fallback={
              <CabineViewer
                base={isFemme ? femmeFolder(item.id) : item.cabine}
                frames={isFemme ? FIT_FRAMES : undefined}
                label={`${item.name} — ${isFemme ? "Femme" : "Homme"}`}
              />
            }
          />
        ) : (
          <CabineViewer
            base={isFemme ? femmeFolder(item.id) : item.cabine}
            frames={isFemme ? FIT_FRAMES : undefined}
            label={`${item.name} — ${isFemme ? "Femme" : "Homme"}`}
          />
        )}
        {SHOW_FEMME && item.femme && (
          <div
            className="shop-cabine-morphs shop-cabine-gender"
            onClick={(e) => e.stopPropagation()}
            role="group"
            aria-label="Mannequin"
          >
            {(["homme", "femme"] as const).map((g) => (
              <button
                key={g}
                type="button"
                aria-pressed={gender === g}
                className={gender === g ? "is-active" : undefined}
                onClick={() => setGender(g)}
              >
                {g === "homme" ? "Homme" : "Femme"}
              </button>
            ))}
          </div>
        )}
        <p className="shop-cabine-caption">{item.name}</p>
      </div>
    )}

    </>
  );
}
