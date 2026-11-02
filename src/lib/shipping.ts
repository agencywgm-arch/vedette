/** Shipping vocabulary shared by the shop (customer tracking) and the staff dashboard. */

export type ShipStatus = "nouvelle" | "preparation" | "expediee" | "livree" | "annulee";

export const SHIP_LABEL: Record<ShipStatus, string> = {
  nouvelle: "Commande reçue",
  preparation: "En préparation",
  expediee: "Expédiée",
  livree: "Livrée",
  annulee: "Annulée",
};

/** What the customer is told at each step. */
export const SHIP_HELP: Record<ShipStatus, string> = {
  nouvelle: "On a bien reçu ta commande. Elle part en préparation très vite.",
  preparation: "Ton colis est en cours de préparation dans notre atelier.",
  expediee: "Ton colis est parti. Utilise le numéro de suivi pour le suivre.",
  livree: "Ton colis a été livré. Merci !",
  annulee: "Cette commande a été annulée.",
};

/** The happy path, in order. Cancelled sits outside it. */
export const SHIP_STEPS: ShipStatus[] = ["nouvelle", "preparation", "expediee", "livree"];

export const CARRIERS: { id: string; name: string; url?: (n: string) => string }[] = [
  { id: "colissimo", name: "Colissimo", url: (n) => `https://www.laposte.fr/outils/suivre-vos-envois?code=${encodeURIComponent(n)}` },
  { id: "chronopost", name: "Chronopost", url: (n) => `https://www.chronopost.fr/tracking-no-cms/suivi-page?listeNumerosLT=${encodeURIComponent(n)}` },
  { id: "mondialrelay", name: "Mondial Relay", url: (n) => `https://www.mondialrelay.fr/suivi-de-colis/?numeroExpedition=${encodeURIComponent(n)}` },
  { id: "dhl", name: "DHL", url: (n) => `https://www.dhl.com/fr-fr/home/tracking.html?tracking-id=${encodeURIComponent(n)}` },
  { id: "ups", name: "UPS", url: (n) => `https://www.ups.com/track?tracknum=${encodeURIComponent(n)}` },
  { id: "autre", name: "Autre transporteur" },
];

export const carrierName = (id?: string) => CARRIERS.find((c) => c.id === id)?.name ?? "";
export const trackingUrl = (id?: string, num?: string) =>
  id && num ? CARRIERS.find((c) => c.id === id)?.url?.(num) : undefined;

export interface PublicOrder {
  id: string;
  createdAt: string;
  status: ShipStatus;
  total: number;
  lines: { name: string; color: string; size: string; qty: number }[];
  carrier?: string;
  tracking?: string;
  message?: string;
  history: { status: ShipStatus; at: string }[];
}
