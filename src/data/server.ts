/**
 * Objets du backend → objets de l'app (types.ts).
 * Le serveur a presque la même forme ; seules quelques différences sont traduites ici :
 * - images `{ src, ratio }` → `{ uri, width, height }` ;
 * - stickers `{ src }` → `{ uri }` ;
 * - mon identifiant serveur → ME_ID (« me »), comme dans tout le reste de l'app ;
 * - auteur anonyme `null` → '' (jamais révélé).
 */
import { ME_ID } from './seed';
import type { AppNotification, Bading, BadingImage, Comment, CustomSticker, User } from './types';

/** Traduit les identifiants d'utilisateurs entre le serveur et l'app. */
export function idMapper(myServerId: string | null) {
  const toLocal = (id: string | null | undefined) => (id && id === myServerId ? ME_ID : id ?? '');
  const toServer = (id: string) => (id === ME_ID && myServerId ? myServerId : id);
  return { toLocal, toServer };
}
export type IdMapper = ReturnType<typeof idMapper>;

/** Couleur d'avatar stable tirée de l'identifiant (le backend n'en fournit pas). */
export function hueFrom(id = '') {
  let h = 0;
  for (const ch of String(id)) h = (h * 31 + ch.charCodeAt(0)) % 360;
  return h;
}

const RATIO_BASE = 1000;

export function fromServerImage(img: any): BadingImage | undefined {
  if (!img) return undefined;
  const uri = img.src ?? img.uri;
  if (!uri) return undefined;
  if (img.width && img.height) return { uri, width: img.width, height: img.height };
  const ratio = Number(img.ratio) > 0 ? Number(img.ratio) : 1; // largeur / hauteur
  return { uri, width: Math.round(RATIO_BASE * ratio), height: RATIO_BASE };
}

export function fromServerUser(u: any, ids: IdMapper): User {
  const joined = u.joinedAt ?? (u.createdAt ? Date.parse(u.createdAt) : NaN);
  const user: User = {
    id: ids.toLocal(u.id),
    pseudo: u.pseudo ?? u.username ?? 'Badeur',
    verified: !!u.verified,
    hue: typeof u.hue === 'number' ? u.hue : hueFrom(u.id),
    joinedAt: Number.isFinite(joined) ? joined : Date.now(),
  };
  const photo = u.photo ?? u.avatarUrl;
  if (photo) user.photo = photo;
  return user;
}

export function fromServerBading(b: any, ids: IdMapper): Bading {
  const out: Bading = {
    id: b.id,
    authorId: ids.toLocal(b.authorId),
    anonymous: !!b.anonymous,
    text: b.text ?? '',
    createdAt: b.createdAt,
    likes: b.likes ?? 0,
    likedByMe: !!b.likedByMe,
    rebades: b.rebades ?? 0,
    shares: b.shares ?? 0,
    views: b.views ?? 0,
  };
  if (b.rebadeOf) out.rebadeOf = b.rebadeOf;
  if (b.deleted) out.deleted = true;
  const image = fromServerImage(b.image);
  if (image) out.image = image;
  if (typeof b.commentCount === 'number') out.commentCount = b.commentCount;
  return out;
}

export function fromServerComment(c: any, ids: IdMapper): Comment {
  const out: Comment = {
    id: c.id,
    badingId: c.badingId,
    authorId: ids.toLocal(c.authorId),
    text: c.text ?? '',
    createdAt: c.createdAt,
    parentId: c.parentId ?? null,
    likes: c.likes ?? 0,
    likedByMe: !!c.likedByMe,
  };
  if (c.replyTo) out.replyTo = c.replyTo;
  if (c.sticker ?? c.stickerId) out.sticker = c.sticker ?? c.stickerId;
  if (c.audio?.src) out.audio = { src: c.audio.src, durationMs: c.audio.durationMs ?? 0, waveform: Array.isArray(c.audio.waveform) ? c.audio.waveform : [] };
  if (c.deleted) out.deleted = true;
  return out;
}

export function fromServerSticker(s: any, ids: IdMapper): CustomSticker {
  const out: CustomSticker = { id: s.id, ownerId: ids.toLocal(s.ownerId), createdAt: s.createdAt ?? Date.now() };
  const uri = s.src ?? s.uri;
  if (uri) out.uri = uri;
  if (s.removed) out.removed = true;
  return out;
}

export function fromServerNotification(n: any, ids: IdMapper): AppNotification {
  const out: AppNotification = {
    id: n.id,
    kind: n.kind,
    actorId: n.actorId ? ids.toLocal(n.actorId) : null,
    createdAt: n.createdAt,
    read: !!n.read,
  };
  if (n.others) out.others = n.others;
  if (n.badingId) out.badingId = n.badingId;
  if (n.badgeStatus) out.badgeStatus = n.badgeStatus;
  if (n.title) out.title = n.title;
  if (n.body) out.body = n.body;
  return out;
}

/**
 * Fil reçu du serveur (première page) : les badings du cache absents de la réponse n'existent plus
 * ou ne sont plus visibles (supprimés, modérés, auteur bloqué…). Si la page n'est pas pleine, le serveur
 * a tout envoyé ; sinon seule la période couverte est jugée. Un bading cité par une rebade visible reste.
 */
export function pruneFeed(cache: Bading[], received: Bading[], pageSize: number, keep: Set<string>) {
  if (!received.length) return cache.filter((b) => keep.has(b.id));
  const returned = new Set(received.map((b) => b.id));
  const complete = received.length < pageSize;
  const oldest = Math.min(...received.map((b) => b.createdAt));
  const quoted = new Set(received.map((b) => b.rebadeOf).filter(Boolean) as string[]);
  return cache.filter((b) => returned.has(b.id) || keep.has(b.id) || quoted.has(b.id) || (!complete && b.createdAt < oldest));
}
