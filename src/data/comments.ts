// Fil de commentaires : arbre des réponses (4 niveaux, comme le site) et descendants d'un commentaire.
import type { Comment } from './types';

/** Identifiants des réponses à `id`, à toutes les profondeurs (le fil de commentaires est un arbre). */
export function descendantIds(list: Comment[], id: string) {
  const out = new Set<string>();
  let frontier = [id];
  while (frontier.length) {
    const next = list.filter((c) => c.parentId && frontier.includes(c.parentId) && !out.has(c.id)).map((c) => c.id);
    next.forEach((x) => out.add(x));
    frontier = next;
  }
  return out;
}

/**
 * Commentaires d'un bading regroupés pour l'affichage : chaque commentaire racine, puis toutes ses réponses
 * (réponses aux réponses comprises) dans l'ordre chronologique ; « en réponse à @x » dit à qui chacune répond.
 * Une réponse dont un commentaire au-dessus est masqué (supprimé, auteur bloqué, pas chargé) est masquée aussi.
 */
export type CommentNode = { comment: Comment; children: CommentNode[] };

/** Niveaux de réponses imbriquées (comme le site) : au-delà, les réponses se rangent au dernier niveau, « en réponse à @… ». */
export const MAX_REPLY_DEPTH = 4;

/**
 * Arbre des commentaires d'un bading : racines (les plus ris d'abord), puis chaque réponse sous son commentaire,
 * du plus ancien au plus récent, sur MAX_REPLY_DEPTH niveaux. Une réponse dont le parent est masqué disparaît avec lui.
 */
export function buildTree(list: Comment[], hidden: (c: Comment) => boolean): CommentNode[] {
  const visible = list.filter((c) => !hidden(c));
  const byParent = new Map<string, Comment[]>();
  visible.forEach((c) => { if (c.parentId) byParent.set(c.parentId, [...(byParent.get(c.parentId) ?? []), c]); });
  const byDate = (a: Comment, b: Comment) => a.createdAt - b.createdAt;
  const descendants = (id: string): Comment[] => (byParent.get(id) ?? []).flatMap((c) => [c, ...descendants(c.id)]);
  const build = (c: Comment, depth: number): CommentNode => ({
    comment: c,
    // Dernier niveau : toutes les réponses plus profondes à plat, à côté.
    children: depth >= MAX_REPLY_DEPTH ? [] : depth === MAX_REPLY_DEPTH - 1
      ? descendants(c.id).sort(byDate).map((d) => ({ comment: d, children: [] }))
      : (byParent.get(c.id) ?? []).sort(byDate).map((d) => build(d, depth + 1)),
  });
  return visible
    .filter((c) => c.parentId === null)
    .sort((a, b) => b.likes - a.likes || a.createdAt - b.createdAt)
    .map((c) => build(c, 0));
}

export function groupThreads(list: Comment[], hidden: (c: Comment) => boolean) {
  const byId = new Map(list.map((c) => [c.id, c]));
  const rootOf = (c: Comment): string | null => {
    const seen = new Set<string>();
    let cur = c;
    while (cur.parentId) {
      const up = byId.get(cur.parentId);
      if (!up || hidden(up) || seen.has(up.id)) return null;
      seen.add(up.id);
      cur = up;
    }
    return cur.id;
  };
  const visible = list.filter((c) => !hidden(c));
  const replies = new Map<string, Comment[]>();
  visible.forEach((c) => {
    if (c.parentId === null) return;
    const root = rootOf(c);
    if (root) replies.set(root, [...(replies.get(root) ?? []), c]);
  });
  return visible
    .filter((c) => c.parentId === null)
    .sort((a, b) => b.likes - a.likes || a.createdAt - b.createdAt)
    .map((root) => ({ root, replies: (replies.get(root.id) ?? []).sort((a, b) => a.createdAt - b.createdAt) }));
}
