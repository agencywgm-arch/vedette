"use client";

import { create } from "zustand";

export type SceneStage = "street" | "approach" | "threshold" | "collection";
export type EntryMode = "fast" | null;

interface SceneState {
  scrollOffset: number;
  setScrollOffset: (v: number) => void;
  stage: SceneStage;
  setStage: (s: SceneStage) => void;
  hovered: string | null;
  setHovered: (id: string | null) => void;
  loaded: boolean;
  setLoaded: (v: boolean) => void;
  started: boolean;
  setStarted: (v: boolean) => void;
  muted: boolean;
  toggleMuted: () => void;
  entryMode: EntryMode;
  setEntryMode: (m: EntryMode) => void;
}

export const useSceneStore = create<SceneState>((set) => ({
  scrollOffset: 0,
  setScrollOffset: (v) => set({ scrollOffset: v }),
  stage: "street",
  setStage: (s) => set({ stage: s }),
  hovered: null,
  setHovered: (id) => set({ hovered: id }),
  loaded: false,
  setLoaded: (v) => set({ loaded: v }),
  started: false,
  setStarted: (v) => set({ started: v }),
  muted: true,
  toggleMuted: () => set((s) => ({ muted: !s.muted })),
  entryMode: null,
  setEntryMode: (m) => set({ entryMode: m }),
}));
