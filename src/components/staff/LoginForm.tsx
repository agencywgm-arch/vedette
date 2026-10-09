"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LoginForm() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/staff/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        router.replace("/staff");
        return;
      }
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      setError(body.error ?? "Connexion impossible.");
    } catch {
      setError("Connexion impossible.");
    }
    setBusy(false);
  }

  return (
    <main className="staff-login">
      <form onSubmit={submit} className="staff-login-card">
        <p className="staff-eyebrow">Vedette · Accès staff</p>
        <h1>Connexion</h1>
        <label htmlFor="staff-pw">Mot de passe</label>
        <input
          id="staff-pw"
          type="password"
          autoComplete="current-password"
          autoFocus
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && <p className="staff-error" role="alert">{error}</p>}
        <button type="submit" disabled={busy || !password}>
          {busy ? "…" : "Entrer"}
        </button>
      </form>
    </main>
  );
}
