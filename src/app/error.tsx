"use client";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-[#08080b] px-6 text-center text-white">
      <h1 className="text-3xl font-semibold">Un souci en boutique.</h1>
      <button
        type="button"
        onClick={reset}
        className="rounded-full border border-white/30 px-6 py-2 text-sm hover:bg-white hover:text-black"
      >
        Réessayer
      </button>
    </main>
  );
}
