"use client";

import { useEffect, useState } from "react";

export type SoldOut = Record<string, string[]>;

/** Sizes the team has marked out of stock, re-read each time the component mounts. A failure means nothing is greyed out. */
export function useSoldOut(): SoldOut {
  const [soldOut, setSoldOut] = useState<SoldOut>({});
  useEffect(() => {
    let live = true;
    fetch("/api/stock", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { soldOut?: SoldOut } | null) => {
        if (live && d?.soldOut) setSoldOut(d.soldOut);
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, []);
  return soldOut;
}

export const isSizeGone = (s: SoldOut, id: string, size: string) => !!s[id]?.includes(size);
export const isItemGone = (s: SoldOut, id: string, sizes: string[]) =>
  sizes.length > 0 && sizes.every((z) => isSizeGone(s, id, z));
