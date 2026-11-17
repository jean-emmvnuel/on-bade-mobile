import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

import { getSticker } from '@/data/stickers';
import type { Bading, Comment, CustomSticker, MentionPolicy, User } from '@/data/types';

/** Tout ce qu'il faut pour la « copie de mes données » (droit d'accès, loi ivoirienne n° 2013-450). */
export type MyDataInput = {
  me: User;
  email: string;
  feed: Bading[];
  comments: Comment[];
  users: Record<string, User>;
  favorites: string[];
  customStickers: Record<string, CustomSticker>;
  myStickers: string[];
  mentionsReceived: number;
  mentionPolicy: MentionPolicy;
  blocked: string[];
  badge: { status: string; reason?: string };
  deletion: { status: string; requestedAt?: number };
};

const BRAND = '#9810e6';
const n = (v: number) => Number(v || 0).toLocaleString('fr-FR');
const day = (ts: number) => new Date(ts).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
const dayTime = (ts: number) => new Date(ts).toLocaleString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
const pl = (v: number, one: string, many: string) => `${n(v)} ${v > 1 ? many : one}`;
const esc = (s = '') => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

function collect(d: MyDataInput) {
  const all = d.feed.filter((b) => b.authorId === d.me.id && !b.deleted);
  const signed = all.filter((b) => !b.anonymous), anon = all.filter((b) => b.anonymous);
  const originals = all.filter((b) => !b.rebadeOf);
  const ids = new Set(all.map((b) => b.id));
  const written = d.comments.filter((c) => c.authorId === d.me.id && !c.deleted);
  const received = d.comments.filter((c) => ids.has(c.badingId) && c.authorId !== d.me.id && !c.deleted);
  const laughedAt = d.feed.filter((b) => b.likedByMe && !b.deleted);
  const sum = (arr: Bading[] | Comment[], k: 'likes' | 'views' | 'rebades' | 'shares') => (arr as any[]).reduce((t, x) => t + (x[k] ?? 0), 0);
  const mine = Object.values(d.customStickers).filter((s) => s.ownerId === d.me.id).map((s) => s.id);
  return {
    all, signed, anon, originals, written, received, laughedAt,
    stats: {
      badings: originals.length, signedN: signed.filter((b) => !b.rebadeOf).length, anonN: anon.filter((b) => !b.rebadeOf).length, withImage: originals.filter((b) => b.image).length,
      rebadesMade: all.length - originals.length,
      laughsReceived: sum(all, 'likes'), laughsSigned: sum(signed, 'likes'), laughsAnon: sum(anon, 'likes'),
      laughsGiven: laughedAt.length, commentLaughsGiven: d.comments.filter((c) => c.likedByMe && !c.deleted).length,
      views: sum(all, 'views'), rebadesReceived: sum(all, 'rebades'), shares: sum(all, 'shares'),
      commentsReceived: received.length, commentsWritten: written.length, stickersSent: written.filter((c) => c.sticker).length,
      commentLaughsReceived: sum(written, 'likes'),
      favorites: d.favorites.length, stickersCreated: mine.length, stickersSaved: d.myStickers.filter((id) => !mine.includes(id)).length,
      best: [...originals].sort((a, b) => b.likes - a.likes)[0] ?? null,
    },
  };
}

export function myDataHtml(d: MyDataInput) {
  const c = collect(d), s = c.stats, me = d.me;
  const who = (b: Bading) => (b.anonymous ? 'Badeur anonyme' : `@${d.users[b.authorId]?.pseudo ?? '?'}`);
  const badgeTxt = me.verified ? 'Oui' : ({ none: 'Pas encore demandé', pending: 'Demande en attente', accepted: 'Acceptée', refused: `Refusée${d.badge.reason ? ` (${d.badge.reason})` : ''}` } as Record<string, string>)[d.badge.status] ?? d.badge.status;
  const rows: [string, string][] = [
    ['Pseudo', `@${me.pseudo}`], ['Adresse e-mail', d.email], ['Inscription', dayTime(me.joinedAt)],
    ['Photo de profil', me.photo ? 'Oui' : 'Non (initiale affichée)'], ['Badge vérifié', badgeTxt],
    ['Qui peut me mentionner', ({ everyone: 'Tout le monde', verified: 'Comptes vérifiés seulement', none: 'Personne' } as Record<string, string>)[d.mentionPolicy] ?? d.mentionPolicy],
    ['Utilisateurs bloqués', d.blocked.length ? d.blocked.map((id) => `@${d.users[id]?.pseudo ?? id}`).join(', ') : 'Aucun'],
    ['Suppression du compte', d.deletion.status === 'pending' && d.deletion.requestedAt ? `Demandée le ${day(d.deletion.requestedAt)}` : 'Non demandée'],
  ];
  const tiles: [string, number, string, string?][] = [
    ['Badings publiés', s.badings, `${n(s.signedN)} signés · ${n(s.anonN)} anonymes${s.withImage ? ` · ${n(s.withImage)} avec image` : ''}`],
    ['Rires reçus', s.laughsReceived, `${n(s.laughsSigned)} signés · ${n(s.laughsAnon)} anonymes`],
    ['Rires donnés', s.laughsGiven + s.commentLaughsGiven, `${n(s.laughsGiven)} badings · ${n(s.commentLaughsGiven)} commentaires`],
    ['Vues reçues', s.views, 'ouvertures de tes badings'],
    ['Commentaires reçus', s.commentsReceived, 'sur tes badings'],
    ['Commentaires écrits', s.commentsWritten, `dont ${pl(s.stickersSent, 'sticker', 'stickers')}`],
    ['Rebades reçues', s.rebadesReceived, 'tes badings repartagés'],
    ['Rebades faites', s.rebadesMade, 'badings que tu as repartagés'],
    ['Partages', s.shares, 'WhatsApp, lien, image…'],
    ['Rires sur mes commentaires', s.commentLaughsReceived, ''],
    ['Mentions reçues', d.mentionsReceived, ''],
    ['Favoris', s.favorites, 'badings mis de côté'],
    ['Stickers créés', s.stickersCreated, 'à partir de tes photos'],
    ['Stickers enregistrés', s.stickersSaved, 'créés par d’autres Badeurs'],
    ['Taux de rire', s.views ? Math.round((s.laughsReceived / s.views) * 100) : 0, 'rires pour 100 vues', '%'],
  ];
  const stickerLabel = (id: string) => getSticker(id)?.label ?? d.customStickers[id]?.label ?? 'personnel';
  const list = (arr: Bading[], empty: string) => arr.length ? arr.map((b) => `<div class="row"><b>${esc(who(b))}</b><span>${esc((b.text || '(image)').slice(0, 160))}${(b.text?.length ?? 0) > 160 ? '…' : ''}</span></div>`).join('') : `<p class="muted">${empty}</p>`;

  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"/><title>Copie de mes données — @${esc(me.pseudo)}</title>
<style>
  @page { size: A4; margin: 16mm 14mm 18mm; }
  * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body { font-family: -apple-system, 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #1a1919; font-size: 10pt; margin: 0; }
  header { background: #1a1919; color: #fff; border-radius: 14px; padding: 18px 20px; display: flex; justify-content: space-between; align-items: center; }
  .brand { display: flex; align-items: center; gap: 10px; font-weight: 800; font-size: 17pt; }
  .mark { width: 30px; height: 30px; border-radius: 8px; background: ${BRAND}; display: grid; place-items: center; font-size: 15pt; }
  header .r { text-align: right; } header .r b { display: block; font-size: 12pt; } header .r small { color: #bdb7b7; font-size: 8pt; }
  .law { color: #8d8888; font-size: 7.5pt; margin: 6px 2px 18px; }
  h1 { font-size: 20pt; margin: 0; } .sub { color: #5e5959; margin: 2px 0 14px; }
  h2 { font-size: 13pt; margin: 22px 0 4px; } h2::after { content: ''; display: block; width: 28px; height: 3px; border-radius: 2px; background: ${BRAND}; margin-top: 6px; }
  .note { color: #5e5959; font-size: 8.5pt; margin: 6px 0 10px; }
  table.kv { width: 100%; border-collapse: collapse; } .kv td { padding: 7px 0; border-bottom: 1px solid #e6e2e2; vertical-align: top; } .kv td:first-child { color: #8d8888; width: 38%; }
  .tiles { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
  .tile { background: #f5f3f3; border-radius: 10px; padding: 10px 12px; break-inside: avoid; }
  .tile .v { font-size: 16pt; font-weight: 800; } .tile .v.hl { color: ${BRAND}; } .tile b { display: block; font-size: 8.5pt; margin-top: 2px; } .tile small { color: #8d8888; font-size: 7pt; }
  .best { border: 1px solid #e6e2e2; border-radius: 12px; padding: 12px 14px; margin-top: 10px; break-inside: avoid; } .best .h { display: flex; justify-content: space-between; color: ${BRAND}; font-weight: 700; font-size: 8.5pt; } .best .h span { color: #8d8888; font-weight: 400; }
  .item { border-bottom: 1px solid #e6e2e2; padding: 8px 0; break-inside: avoid; } .item .m { color: #8d8888; font-size: 7.5pt; } .item p { margin: 3px 0; } .item .st { font-weight: 700; color: #5e5959; font-size: 8pt; }
  .row { display: flex; gap: 12px; border-bottom: 1px solid #e6e2e2; padding: 6px 0; break-inside: avoid; } .row b { width: 120px; flex: none; font-size: 9pt; } .row span { color: #5e5959; font-size: 9pt; }
  .muted { color: #8d8888; }
  footer { margin-top: 24px; color: #8d8888; font-size: 7.5pt; border-top: 1px solid #e6e2e2; padding-top: 8px; }
</style></head><body>
<header><div class="brand"><span class="mark">b</span>on bade</div><div class="r"><b>Copie de mes données</b><small>Générée le ${dayTime(Date.now())}</small></div></header>
<p class="law">Droit d’accès · loi ivoirienne n° 2013-450 relative à la protection des données à caractère personnel</p>
<h1>@${esc(me.pseudo)}</h1><p class="sub">Badeur depuis le ${day(me.joinedAt)}${me.verified ? ' · badge vérifié' : ''}</p>

<h2>Mon compte</h2>
<table class="kv">${rows.map(([k, v]) => `<tr><td>${k}</td><td>${esc(v)}</td></tr>`).join('')}</table>

<h2>Mes statistiques</h2>
<p class="note">Les rires et vues des badings anonymes sont comptés ici car c’est ta copie privée ; ils ne sont jamais reliés à ton profil public.</p>
<div class="tiles">${tiles.map(([l, v, sub, unit], i) => `<div class="tile"><div class="v ${i < 4 ? 'hl' : ''}">${n(v)}${unit ?? ''}</div><b>${l}</b>${sub ? `<small>${esc(sub)}</small>` : ''}</div>`).join('')}</div>
${s.best ? `<div class="best"><div class="h">Mon bading le plus drôle<span>${n(s.best.likes)} rires · ${n(s.best.views ?? 0)} vues · ${day(s.best.createdAt)}</span></div><p>${esc(s.best.text || '(bading en image)')}</p></div>` : ''}

<h2>Mes badings (${c.all.length})</h2>
<p class="note">Signés et anonymes, du plus récent au plus ancien.</p>
${c.all.length ? [...c.all].sort((a, b) => b.createdAt - a.createdAt).map((b) => {
    const origin = b.rebadeOf ? d.feed.find((x) => x.id === b.rebadeOf) : null;
    const kind = [b.anonymous ? 'Anonyme (privé)' : 'Signé', b.rebadeOf ? 'rebade' : null, b.image ? 'avec image' : null].filter(Boolean).join(' · ');
    const nc = d.comments.filter((x) => x.badingId === b.id && !x.deleted).length;
    return `<div class="item"><div class="m">${dayTime(b.createdAt)} · ${kind}</div><p>${esc(b.text || (b.image ? '(image sans légende)' : origin ? `Rebade de : « ${origin.text.slice(0, 120)} »` : ''))}</p><div class="st">${pl(b.likes, 'rire', 'rires')} · ${pl(b.views ?? 0, 'vue', 'vues')} · ${pl(nc, 'commentaire', 'commentaires')} · ${pl(b.rebades, 'rebade', 'rebades')} · ${pl(b.shares, 'partage', 'partages')}</div></div>`;
  }).join('') : '<p class="muted">Aucun bading publié.</p>'}

<h2>Mes commentaires (${c.written.length})</h2>
${c.written.length ? [...c.written].sort((a, b) => b.createdAt - a.createdAt).map((x) => {
    const on = d.feed.find((b) => b.id === x.badingId);
    return `<div class="item"><div class="m">${dayTime(x.createdAt)} · sous le bading de ${on ? esc(who(on)) : 'un bading supprimé'}${x.replyTo ? ` · en réponse à @${esc(x.replyTo)}` : ''} · ${pl(x.likes, 'rire', 'rires')}</div><p>${x.sticker ? `[Sticker « ${esc(stickerLabel(x.sticker))} »]` : esc(x.text)}</p></div>`;
  }).join('') : '<p class="muted">Aucun commentaire.</p>'}

<h2>Badings qui m’ont fait rire (${c.laughedAt.length})</h2>
${list(c.laughedAt, 'Tu n’as encore ri à aucun bading.')}

<h2>Mes favoris (${d.favorites.length})</h2>
${list(d.favorites.map((id) => d.feed.find((b) => b.id === id)).filter((b): b is Bading => !!b), 'Aucun favori.')}

<h2>À propos de cette copie</h2>
<p>Ce document rassemble les données qu’On Bade conserve sur ton compte : informations du compte, contenus publiés (signés et anonymes), commentaires, réactions et statistiques. Garde-le pour toi : il contient des informations personnelles, dont tes badings anonymes.</p>
<p>Ton mot de passe n’y figure pas : il est stocké haché et personne ne peut le lire. Les pièces fournies pour une demande de badge sont supprimées dès la décision. Pour rectifier ou supprimer tes données : Paramètres › Mes données, ou supprime ton compte (effacement définitif sous 30 jours).</p>
<footer>On Bade · copie des données de @${esc(me.pseudo)}</footer>
</body></html>`;
}

/**
 * Crée le PDF et ouvre le partage (Enregistrer dans Fichiers, WhatsApp, e-mail…).
 * En prod, il est aussi envoyé par e-mail via un lien sécurisé.
 */
export async function exportMyData(d: MyDataInput) {
  const html = myDataHtml(d);
  if (Platform.OS === 'web') { await Print.printAsync({ html }); return; }
  const { uri } = await Print.printToFileAsync({ html, base64: false });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf', dialogTitle: 'Copie de mes données On Bade' });
  }
}
