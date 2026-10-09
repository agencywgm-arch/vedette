import { collection } from "@/data/collection";

export type OrderStatus = "nouvelle" | "preparation" | "expediee" | "livree" | "annulee";
export type ReturnStatus = "demandee" | "acceptee" | "recue" | "remboursee" | "refusee";
export type TicketStatus = "ouvert" | "en_cours" | "resolu";

export const ORDER_STATUSES: OrderStatus[] = ["nouvelle", "preparation", "expediee", "livree", "annulee"];
export const RETURN_STATUSES: ReturnStatus[] = ["demandee", "acceptee", "recue", "remboursee", "refusee"];
export const TICKET_STATUSES: TicketStatus[] = ["ouvert", "en_cours", "resolu"];

export interface Customer {
  name: string;
  email: string;
  city?: string;
}
export interface OrderLine {
  itemId: string;
  name: string;
  color: string;
  size: string;
  qty: number;
  price: number;
}
export interface Order {
  id: string;
  createdAt: string;
  customer: Customer;
  lines: OrderLine[];
  total: number;
  status: OrderStatus;
  note: string;
}
export interface ReturnRequest {
  id: string;
  createdAt: string;
  orderId: string;
  customer: Customer;
  itemName: string;
  reason: string;
  status: ReturnStatus;
  note: string;
}
export interface TicketMessage {
  from: "client" | "staff";
  at: string;
  text: string;
}
export interface Ticket {
  id: string;
  createdAt: string;
  customer: Customer;
  subject: string;
  channel: "email" | "chat" | "instagram";
  status: TicketStatus;
  messages: TicketMessage[];
  note: string;
}
export interface Db {
  orders: Order[];
  returns: ReturnRequest[];
  tickets: Ticket[];
}

const KEY = "vedette:staff:v1";

/** Upstash / Vercel KV REST credentials, when a database is connected. */
function kv() {
  const url = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? { url: url.replace(/\/$/, ""), token } : null;
}

export const isPersistent = () => kv() !== null;

const ago = (h: number) => new Date(Date.now() - h * 3600_000).toISOString();

function line(itemId: string, color: string, size: string, qty = 1): OrderLine {
  const it = collection.find((c) => c.id === itemId);
  return { itemId, name: it?.name ?? itemId, color, size, qty, price: it?.price ?? 0 };
}
const sum = (ls: OrderLine[]) => ls.reduce((t, l) => t + l.price * l.qty, 0);

/** Demo data shown until a database is connected. */
function seed(): Db {
  const o = (id: string, h: number, c: Customer, ls: OrderLine[], status: OrderStatus): Order => ({
    id, createdAt: ago(h), customer: c, lines: ls, total: sum(ls), status, note: "",
  });
  const orders: Order[] = [
    o("CMD-48213", 1, { name: "Yanis B.", email: "yanis.b@example.com", city: "Paris" }, [line("black-jacket", "Noir", "M"), line("cap-vedette", "Noir", "TU")], "nouvelle"),
    o("CMD-48212", 3, { name: "Inès M.", email: "ines.m@example.com", city: "Lyon" }, [line("jparis-tee", "Blanc", "S")], "nouvelle"),
    o("CMD-48207", 9, { name: "Karim D.", email: "karim.d@example.com", city: "Marseille" }, [line("jparis-sweat", "Gris", "L"), line("paris-polo", "Marine", "L")], "preparation"),
    o("CMD-48199", 26, { name: "Léa R.", email: "lea.r@example.com", city: "Bordeaux" }, [line("sac-vedette", "Bleu ciel", "TU")], "expediee"),
    o("CMD-48180", 70, { name: "Moussa T.", email: "moussa.t@example.com", city: "Lille" }, [line("champions-tee", "Noir", "XL")], "livree"),
    o("CMD-48171", 96, { name: "Sarah K.", email: "sarah.k@example.com", city: "Nantes" }, [line("rainbow-jersey", "Blanc", "M")], "annulee"),
  ];
  const returns: ReturnRequest[] = [
    { id: "RET-3304", createdAt: ago(5), orderId: "CMD-48180", customer: { name: "Moussa T.", email: "moussa.t@example.com" }, itemName: "CHAMPIONS 2025 TEE", reason: "Taille trop grande, souhaite un L.", status: "demandee", note: "" },
    { id: "RET-3299", createdAt: ago(30), orderId: "CMD-48150", customer: { name: "Julie P.", email: "julie.p@example.com" }, itemName: "SWEAT J'♥ PARIS", reason: "Ne convient pas.", status: "acceptee", note: "Étiquette retour envoyée." },
    { id: "RET-3291", createdAt: ago(80), orderId: "CMD-48120", customer: { name: "Adam F.", email: "adam.f@example.com" }, itemName: "VESTE VOLEUR", reason: "Fermeture éclair défectueuse.", status: "recue", note: "Colis reçu, à contrôler." },
  ];
  const tickets: Ticket[] = [
    { id: "SAV-901", createdAt: ago(2), customer: { name: "Nora A.", email: "nora.a@example.com" }, subject: "Où en est ma commande ?", channel: "email", status: "ouvert", note: "", messages: [{ from: "client", at: ago(2), text: "Bonjour, je n'ai pas reçu de numéro de suivi pour ma commande d'hier." }] },
    { id: "SAV-898", createdAt: ago(7), customer: { name: "@zak.paris", email: "zak@example.com" }, subject: "Tailles du polo", channel: "instagram", status: "en_cours", note: "", messages: [{ from: "client", at: ago(7), text: "Le polo taille grand ou normal ? Je fais 1m85." }, { from: "staff", at: ago(6), text: "Il taille ample, un M suffit avec ta taille." }] },
    { id: "SAV-890", createdAt: ago(28), customer: { name: "Hugo L.", email: "hugo.l@example.com" }, subject: "Changer l'adresse de livraison", channel: "chat", status: "resolu", note: "Adresse corrigée.", messages: [{ from: "client", at: ago(28), text: "Je me suis trompé de code postal, est-ce modifiable ?" }, { from: "staff", at: ago(27), text: "C'est corrigé, merci de nous avoir prévenus." }] },
  ];
  return { orders, returns, tickets };
}

const g = globalThis as unknown as { __staffDb?: Db };

export async function loadDb(): Promise<Db> {
  const k = kv();
  if (k) {
    const res = await fetch(`${k.url}/get/${encodeURIComponent(KEY)}`, {
      headers: { Authorization: `Bearer ${k.token}` },
      cache: "no-store",
    });
    const body = (await res.json()) as { result: string | null };
    if (body.result) return JSON.parse(body.result) as Db;
    const fresh: Db = { orders: [], returns: [], tickets: [] };
    await saveDb(fresh);
    return fresh;
  }
  return (g.__staffDb ??= seed());
}

export async function saveDb(db: Db): Promise<void> {
  const k = kv();
  if (k) {
    await fetch(`${k.url}/set/${encodeURIComponent(KEY)}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${k.token}` },
      body: JSON.stringify(db),
      cache: "no-store",
    });
    return;
  }
  g.__staffDb = db;
}

export const newId = (prefix: string) =>
  `${prefix}-${Math.floor(10000 + Math.random() * 89999)}`;

/** Tiny per-IP brake for the public intake endpoints. */
const hits = new Map<string, number[]>();
export function tooMany(ip: string, perMinute = 8): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < 60_000);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > perMinute;
}

export const clean = (v: unknown, max = 200): string =>
  typeof v === "string" ? v.replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, max) : "";

export const validEmail = (e: string) => /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,}$/.test(e);
