"use client";

import Image from "next/image";
import { useState } from "react";
import { createPortal } from "react-dom";
import { categories, collection, thumbFor, wallPosters, type Category } from "@/data/collection";
import { useShopStore } from "@/store/useShopStore";

export type InfoMode = "menu" | "search" | "collections" | "about" | "journal";

const TITLES: Record<InfoMode, string> = {
  menu: "Menu",
  search: "Recherche",
  collections: "Collections",
  about: "À propos",
  journal: "Journal",
};

/** One side drawer behind every header link that used to be a dead label. */
export default function InfoDrawer({
  mode: initialMode,
  onClose,
  onPick,
  onHelp,
}: {
  mode: InfoMode;
  onClose: () => void;
  /** Opens a piece on the wall (closes this drawer first). */
  onPick: (id: string) => void;
  onHelp: (tab?: "tracking" | "support") => void;
}) {
  const [mode, setMode] = useState<InfoMode>(initialMode);
  const [q, setQ] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);
  const setCategory = useShopStore((s) => s.setCategory);
  const select = useShopStore((s) => s.select);

  const needle = q.trim().toLowerCase();
  const results = collection.filter(
    (i) => !i.locked && i.front !== null && (needle === "" || `${i.name} ${i.category}`.toLowerCase().includes(needle)),
  );

  return createPortal(
    <div className="shop-drawer-backdrop" onClick={onClose}>
      <aside className="shop-drawer" role="dialog" aria-label={TITLES[mode]} onClick={(e) => e.stopPropagation()}>
        <button type="button" className="shop-drawer-close" onClick={onClose} aria-label="Fermer">
          ×
        </button>
        <h2>{TITLES[mode]}</h2>

        {mode === "menu" && (
          <ul className="shop-info-list">
            {([
              ["search", "Rechercher une pièce"],
              ["collections", "Collections"],
              ["about", "À propos"],
              ["journal", "Journal"],
            ] as [InfoMode, string][]).map(([m, label]) => (
              <li key={m}>
                <button type="button" onClick={() => setMode(m)}>
                  <span>
                    <strong>{label}</strong>
                  </span>
                  <span aria-hidden="true">→</span>
                </button>
              </li>
            ))}
            <li>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onHelp("tracking");
                }}
              >
                <span>
                  <strong>Suivre ma commande</strong>
                </span>
                <span aria-hidden="true">→</span>
              </button>
            </li>
            <li>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onHelp();
                }}
              >
                <span>
                  <strong>Aide · Retours · Contact</strong>
                </span>
                <span aria-hidden="true">→</span>
              </button>
            </li>
          </ul>
        )}

        {mode === "search" && (
          <>
            <input
              autoFocus
              placeholder="Polo, casquette, veste…"
              value={q}
              maxLength={60}
              onChange={(e) => setQ(e.target.value)}
              style={{ width: "100%", marginBottom: 14 }}
            />
            {results.length === 0 ? (
              <p className="shop-drawer-empty">Aucune pièce ne correspond à « {q} ».</p>
            ) : (
              <ul className="shop-info-list">
                {results.map((i) => (
                  <li key={i.id}>
                    <button type="button" onClick={() => onPick(i.id)}>
                      <span className="shop-info-thumb">
                        <Image src={thumbFor(i.id)} alt="" fill sizes="56px" />
                      </span>
                      <span>
                        <strong>{i.name}</strong>
                        <small>
                          {i.category} · €{i.price.toFixed(2).replace(".", ",")}
                        </small>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}

        {mode === "collections" && (
          <ul className="shop-info-list">
            {categories.map((c) => {
              const n = collection.filter((i) => !i.locked && i.front !== null && (c === "TOUS" || i.category === c)).length;
              return (
                <li key={c}>
                  <button
                    type="button"
                    onClick={() => {
                      setCategory(c as Category | "TOUS");
                      select(null);
                      onClose();
                    }}
                  >
                    <span>
                      <strong>{c === "TOUS" ? "Toute la collection" : c}</strong>
                      <small>
                        {n} pièce{n > 1 ? "s" : ""}
                      </small>
                    </span>
                    <span aria-hidden="true">→</span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        {mode === "about" && (
          <div className="shop-info-text">
            <p>
              <strong>Vedette</strong> — Snob, Vilain, Arrogant.
            </p>
            <p>
              Une marque de streetwear parisienne : des pièces imprimées et brodées, pensées comme des affiches
              que l’on porte. Chaque pièce se découvre sur le mur de la boutique, se fait tourner à 360° et
              s’essaie en cabine, en version homme ou femme, en mince, médium ou large.
            </p>
            <p>Une question, un retour, une commande ? On te répond par e-mail.</p>
            <button
              type="button"
              className="shop-cta"
              onClick={() => {
                onClose();
                onHelp();
              }}
            >
              Nous contacter
            </button>
          </div>
        )}

        {mode === "journal" && (
          <>
            <p className="shop-drawer-empty">Les images accrochées dans la boutique.</p>
            <div className="shop-info-photos">
              {wallPosters.map((p) => (
                <button key={p.id} type="button" onClick={() => setPhoto(p.id)} aria-label={p.name}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.src} alt={p.name} loading="lazy" />
                  <span>{p.name}</span>
                </button>
              ))}
            </div>
            {photo && (
              <div className="shop-info-zoom" onClick={() => setPhoto(null)} role="button" tabIndex={-1} aria-label="Fermer la photo">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={wallPosters.find((p) => p.id === photo)?.src} alt="" />
              </div>
            )}
          </>
        )}
      </aside>
    </div>,
    document.body,
  );
}
