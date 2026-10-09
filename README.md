# Vedette

Site immersif (Next.js 16, React 19, Tailwind 4, three / R3F) : scroll depuis la rue jusqu'à la boutique, collection 3D, cabine d'essayage 8 angles, dashboard staff.

## Développement

```bash
npm install
npm run dev      # http://localhost:3000
npm run lint
npm run build
```

## Variables d'environnement (Vercel → Settings → Environment Variables)

| Variable | Rôle |
| --- | --- |
| `STAFF_PASSWORD` | Mot de passe du dashboard `/staff` (défaut `admin`, **à changer**) |
| `STAFF_SESSION_SECRET` | Longue chaîne aléatoire qui signe le cookie de session staff |
| `KV_REST_API_URL`, `KV_REST_API_TOKEN` | Base Upstash / Vercel KV pour stocker commandes, retours, assistance (sinon : données de démo en mémoire) |
| `NEXT_PUBLIC_SITE_URL` | URL publique (SEO, sitemap) ; sinon l'URL de production Vercel |

## Dashboard staff

`/staff` (protégé par `src/proxy.ts`) : commandes, retours, assistance. Les formulaires publics écrivent via `POST /api/orders`, `/api/returns`, `/api/support` (prix recalculés côté serveur, rate limit).

## Médias

`public/cabine/looks/<id>/0..7.webp` : 8 photos par pièce, tous les 45° (0 = face). `public/collection/turntable` : vidéos 3D.
