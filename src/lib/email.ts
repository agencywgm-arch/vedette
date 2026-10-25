import type { Order, Ticket } from "@/lib/staff/store";
import { carrierName, trackingUrl } from "@/lib/shipping";

/**
 * Transactional e-mails through Resend's REST API (no SDK). Needs RESEND_API_KEY and
 * MAIL_FROM (e.g. `Vedette <commandes@vedette620.com>`); without them every call is a
 * silent no-op, so the shop works the same before the mail account is connected.
 * MAIL_REPLY_TO: where customer replies go. MAIL_BCC: a copy of every mail sent, for the shop's own mailbox.
 * A failed send never breaks an order, a payment or a staff action.
 */
const SITE = () => process.env.NEXT_PUBLIC_SITE_URL ?? "https://vedette620.com";
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string);
const euro = (n: number) => `${n.toFixed(2).replace(".", ",")} €`;

export const mailConfigured = () => Boolean(process.env.RESEND_API_KEY && process.env.MAIL_FROM);

async function send(to: string, subject: string, title: string, bodyHtml: string, text: string) {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.MAIL_FROM;
  if (!key || !from || !to) return;
  const html = `<!doctype html><html lang="fr"><body style="margin:0;background:#f4f3ee;font-family:Helvetica,Arial,sans-serif;color:#15151a">
<div style="max-width:560px;margin:0 auto;padding:28px 18px">
<div style="background:#08080b;border-radius:14px 14px 0 0;padding:22px;text-align:center"><img src="${SITE()}/logo-white.png" alt="vedette" width="150" style="display:inline-block;max-width:150px;height:auto"></div>
<div style="background:#fff;border-radius:0 0 14px 14px;padding:26px 24px;line-height:1.55;font-size:15px">
<h1 style="font-size:20px;margin:0 0 14px">${esc(title)}</h1>${bodyHtml}
<p style="color:#6b6b76;font-size:13px;margin:26px 0 0">Besoin d'aide ? Réponds simplement à cet e-mail.</p></div></div></body></html>`;
  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: [to], subject, html, text, reply_to: process.env.MAIL_REPLY_TO || undefined, bcc: process.env.MAIL_BCC ? [process.env.MAIL_BCC] : undefined }),
    });
  } catch {
    /* mail is best-effort */
  }
}

const lineList = (o: Order) =>
  `<ul style="padding-left:18px;margin:10px 0">${o.lines
    .map((l) => `<li>${esc(l.name)} <span style="color:#6b6b76">· ${esc(l.color)} · ${esc(l.size)}</span> — ${euro(l.price * l.qty)}</li>`)
    .join("")}</ul>`;
const trackLink = (o: Order) =>
  `<p style="margin:16px 0"><a href="${SITE()}/" style="background:#f2c300;color:#08080b;text-decoration:none;font-weight:700;padding:11px 18px;border-radius:10px;display:inline-block">Suivre ma commande</a></p>
<p style="color:#6b6b76;font-size:13px;margin:0">Sur le site : Aide → Suivi, avec le numéro <b>${esc(o.id)}</b> et cet e-mail.</p>`;

export function mailOrderPaid(o: Order) {
  return send(
    o.customer.email,
    `Commande ${o.id} confirmée`,
    `Merci ${o.customer.name.split(" ")[0] || ""} ! Ton paiement est bien reçu.`.replace("  ", " "),
    `<p>Commande <b>${esc(o.id)}</b></p>${lineList(o)}<p><b>Total : ${euro(o.total)}</b></p>${
      o.shippingAddress ? `<p style="color:#6b6b76">Livraison : ${esc(o.shippingAddress)}</p>` : ""
    }${trackLink(o)}`,
    `Merci ! Ton paiement est reçu pour la commande ${o.id} (${euro(o.total)}). Suivi : ${SITE()} → Aide → Suivi.`,
  );
}

export function mailOrderStatus(o: Order) {
  if (o.status === "expediee") {
    const url = trackingUrl(o.carrier, o.tracking);
    return send(
      o.customer.email,
      `Ta commande ${o.id} est expédiée`,
      "Ton colis est parti !",
      `<p>Commande <b>${esc(o.id)}</b>${o.carrier ? ` · ${esc(carrierName(o.carrier))}` : ""}</p>${
        o.tracking ? `<p>Numéro de suivi : <b>${esc(o.tracking)}</b></p>` : ""
      }${url ? `<p><a href="${esc(url)}">Suivre mon colis</a></p>` : ""}${
        o.message ? `<p style="color:#6b6b76">${esc(o.message)}</p>` : ""
      }${trackLink(o)}`,
      `Ta commande ${o.id} est expédiée. Suivi : ${o.tracking ?? ""} ${url ?? ""}`,
    );
  }
  if (o.status === "livree")
    return send(o.customer.email, `Ta commande ${o.id} est livrée`, "Ton colis est livré", `<p>Commande <b>${esc(o.id)}</b> livrée. Merci de ta confiance !</p>`, `Ta commande ${o.id} est livrée. Merci !`);
  if (o.status === "annulee")
    return send(o.customer.email, `Ta commande ${o.id} est annulée`, "Commande annulée", `<p>Commande <b>${esc(o.id)}</b> annulée. Si tu as été débité, le remboursement est en cours.</p>`, `Ta commande ${o.id} est annulée.`);
  return Promise.resolve();
}

export function mailTicketReply(t: Ticket, reply: string) {
  return send(
    t.customer.email,
    `Re : ${t.subject}`,
    "Une réponse de l'équipe Vedette",
    `<p style="white-space:pre-wrap">${esc(reply)}</p><p style="color:#6b6b76;font-size:13px">Ticket ${esc(t.id)}</p>`,
    `${reply}\n\nTicket ${t.id}`,
  );
}
