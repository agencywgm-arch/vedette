import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-[#08080b] px-6 text-center text-white">
      <p className="font-mono text-xs uppercase tracking-[0.3em] text-white/50">
        Erreur 404
      </p>
      <h1 className="text-3xl font-semibold">Cette porte est fermée.</h1>
      <Link
        href="/"
        className="rounded-full border border-white/30 px-6 py-2 text-sm hover:bg-white hover:text-black"
      >
        Retour à la boutique
      </Link>
    </main>
  );
}
