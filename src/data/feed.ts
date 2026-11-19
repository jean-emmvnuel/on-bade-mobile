// Ordre du fil : badings épinglés par l'équipe en tête, badings du moment (les plus drôles).
import type { Bading } from './types';

/** Badings du moment (comme sur le site) : les plus drôles du fil, classés par rires, hors rebades ; le plus récent d'abord à égalité. */
/** Épinglé par l'équipe ; `label` : étiquette facultative (« Bading du jour »). */
export type Pin = { id: string; label?: string };

/** Le fil avec les badings épinglés tout en haut (dans l'ordre des épingles), puis les autres du plus récent au plus ancien. */
export function withPinsFirst(feed: Bading[], pins: Pin[]) {
  if (!pins.length) return feed;
  const rank = new Map(pins.map((p, i) => [p.id, i]));
  const top = feed.filter((b) => rank.has(b.id)).sort((a, b) => rank.get(a.id)! - rank.get(b.id)!);
  return [...top, ...feed.filter((b) => !rank.has(b.id))];
}

export function momentOf(feed: Bading[], limit = 20) {
  return feed.filter((b) => !b.rebadeOf).sort((a, b) => (b.likes - a.likes) || (b.createdAt - a.createdAt)).slice(0, limit);
}

/** Partie du fil chargée pendant cette visite (fil par pages de 20). */
export type FeedPaging = { from: number | null; hasMore: boolean; nextBefore?: number };

/** Le fil affiché : seulement les pages chargées (`from`), épinglés compris même plus anciens. */
export function feedWindow<T extends { id: string; createdAt: number }>(feed: T[], paging: FeedPaging, pinnedIds: Set<string>): T[] {
  const from = paging.from;
  return from == null ? feed : feed.filter((b) => b.createdAt >= from || pinnedIds.has(b.id));
}
