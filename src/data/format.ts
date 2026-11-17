// Petits formats d'affichage partagés : identifiants locaux, nom affiché d'un bading, « il y a 3 min », « 1,2 k ».
import type { Bading, User } from './types';

/** Identifiant unique, même pour deux actions dans la même milliseconde. */
let seq = 0;

export const uid = (prefix: string) => `${prefix}${Date.now().toString(36)}${(seq++).toString(36)}`;

export function displayName(b: Bading, users: Record<string, User>) {
  if (b.anonymous) return { name: 'Badeur anonyme', handle: null, user: null };
  const u = users[b.authorId];
  return { name: u?.pseudo ?? 'Badeur', handle: u ? `@${u.pseudo}` : null, user: u ?? null };
}

export function timeAgo(ts: number) {
  const s = Math.max(1, Math.floor((Date.now() - ts) / 1000));
  if (s < 60) return `${s} s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} h`;
  return `${Math.floor(h / 24)} j`;
}

export function compact(n: number) {
  if (n < 1000) return String(n);
  if (n < 10_000) return `${(n / 1000).toFixed(1).replace('.0', '')} k`;
  return `${Math.round(n / 1000)} k`;
}
