// Branchement sur le backend : client HTTP, conversion des objets du serveur, règles du pseudo.
import { ApiError, errorMessage, request } from '@/lib/api';
import { PSEUDO_RULES, pseudoFormatError } from '@/lib/pseudo';
import { fromServerBading, fromServerComment, fromServerSticker, fromServerUser, idMapper, pruneFeed } from '@/data/server';
import { ME_ID } from '@/data/seed';
import { momentOf, withPinsFirst } from '@/data/store';
import type { Bading } from '@/data/types';

const ids = idMapper('srv-me');

describe('Client HTTP', () => {
  afterEach(() => { (globalThis as any).fetch = undefined; });
  const respond = (status: number, body: unknown) => {
    (globalThis as any).fetch = jest.fn(async () => ({ ok: status < 400, status, text: async () => JSON.stringify(body) }));
  };

  it('déballe la réponse { success, data }', async () => {
    respond(200, { success: true, message: 'OK', data: { available: true } });
    await expect(request('/pseudo-available')).resolves.toEqual({ available: true });
  });
  it('transforme une erreur du serveur en ApiError avec son code', async () => {
    respond(409, { success: false, code: 'taken', message: 'Ce pseudo est déjà pris' });
    await expect(request('/me', { method: 'PATCH', body: {} })).rejects.toMatchObject({ status: 409, code: 'taken' });
  });
  it('serveur injoignable : code « network » et message lisible', async () => {
    (globalThis as any).fetch = jest.fn(async () => { throw new TypeError('Network request failed'); });
    const error = await request('/feed').catch((e) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error.code).toBe('network');
    expect(errorMessage(error)).toMatch(/réseau/);
  });
});

describe('Objets du serveur → objets de l’app', () => {
  it('mon identifiant devient « me », les autres restent', () => {
    expect(ids.toLocal('srv-me')).toBe(ME_ID);
    expect(ids.toLocal('u9')).toBe('u9');
    expect(ids.toServer(ME_ID)).toBe('srv-me');
  });
  it('utilisateur : pseudo (ou username), photo et couleur stable', () => {
    const u = fromServerUser({ id: 'u9', username: 'zero', photo: 'https://x/p.jpg', joinedAt: 5 }, ids);
    expect(u).toMatchObject({ id: 'u9', pseudo: 'zero', photo: 'https://x/p.jpg', joinedAt: 5, verified: false });
    expect(fromServerUser({ id: 'u9', pseudo: 'zero' }, ids).hue).toBe(u.hue);
  });
  it('bading : image { src, ratio } → { uri, width, height }, auteur anonyme jamais révélé', () => {
    const b = fromServerBading({ id: 'b1', authorId: null, anonymous: true, text: 'Salut', image: { src: 'https://x/i', ratio: 0.8 }, createdAt: 1, likes: 2, commentCount: 3 }, ids);
    expect(b).toMatchObject({ id: 'b1', authorId: '', anonymous: true, likes: 2, commentCount: 3, image: { uri: 'https://x/i', width: 800, height: 1000 } });
    expect(fromServerBading({ id: 'b2', authorId: 'srv-me', text: '', createdAt: 1 }, ids).authorId).toBe(ME_ID);
  });
  it('commentaire et sticker', () => {
    expect(fromServerComment({ id: 'c1', badingId: 'b1', authorId: 'srv-me', text: 'Eh', parentId: null, createdAt: 1 }, ids)).toMatchObject({ authorId: ME_ID, parentId: null, likes: 0 });
    expect(fromServerSticker({ id: 's1', ownerId: 'u9', src: 'https://x/s', createdAt: 1 }, ids)).toEqual({ id: 's1', ownerId: 'u9', uri: 'https://x/s', createdAt: 1 });
  });
  it('fil reçu : les badings disparus du serveur sont oubliés, sauf mes favoris et ceux cités', () => {
    const mk = (id: string, createdAt: number, rebadeOf?: string): Bading => ({ id, authorId: 'u', anonymous: false, text: '', createdAt, likes: 0, likedByMe: false, rebades: 0, shares: 0, ...(rebadeOf ? { rebadeOf } : {}) });
    const cache = [mk('a', 3), mk('gone', 2), mk('fav', 2), mk('quoted', 1)];
    const received = [mk('a', 3), mk('r', 4, 'quoted')];
    const kept = pruneFeed(cache, received, 50, new Set(['fav'])).map((b) => b.id);
    expect(kept).toEqual(['a', 'fav', 'quoted']);
  });
});

describe('Pseudo : règles explicites', () => {
  it('dit exactement ce qui ne va pas', () => {
    expect(pseudoFormatError('ab')).toMatch(/Trop court.*encore 1/);
    expect(pseudoFormatError('jean emmanuel')).toMatch(/non autorisé : espace/);
    expect(pseudoFormatError('Élodie@')).toMatch(/« É », « @ »/);
    expect(pseudoFormatError('a'.repeat(21))).toMatch(/Trop long/);
    expect(pseudoFormatError('ok_pseudo.1')).toBeNull();
    expect(PSEUDO_RULES).toMatch(/lettres sans accent/);
  });
});

describe('Fil de commentaires en arbre', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { groupThreads, descendantIds } = require('@/data/store') as typeof import('@/data/store');
  const c = (id: string, parentId: string | null, createdAt: number, extra = {}) =>
    ({ id, badingId: 'b', authorId: 'u', text: id, createdAt, parentId, likes: 0, likedByMe: false, ...extra });
  const list = [c('A', null, 1), c('B', 'A', 2), c('C', 'B', 3), c('D', 'C', 4), c('E', null, 5), c('F', 'E', 6, { deleted: true }), c('G', 'F', 7), c('H', 'zz', 8)];
  const hidden = (x: any) => !!x.deleted;

  it('toutes les réponses d’un fil (réponses aux réponses comprises) sous leur racine, dans l’ordre', () => {
    const threads = groupThreads(list as any, hidden);
    expect(threads.find((t) => t.root.id === 'A')!.replies.map((x) => x.id)).toEqual(['B', 'C', 'D']);
  });
  it('réponse sous un commentaire masqué ou absent : masquée', () => {
    const threads = groupThreads(list as any, hidden);
    expect(threads.find((t) => t.root.id === 'E')!.replies).toEqual([]);
    expect(threads.flatMap((t) => t.replies).some((x) => x.id === 'H')).toBe(false);
  });
  it('descendants à toutes les profondeurs', () => {
    expect([...descendantIds(list as any, 'B')].sort()).toEqual(['C', 'D']);
  });
});

describe('Badings du moment', () => {
  const b = (id: string, likes: number, createdAt: number, extra: Partial<Bading> = {}) =>
    ({ id, authorId: 'u', anonymous: false, text: 'x', createdAt, likes, likedByMe: false, rebades: 0, shares: 0, ...extra }) as Bading;

  it('classe par rires, le plus récent d’abord à égalité, sans les rebades', () => {
    const feed = [b('a', 2, 1), b('b', 9, 1), b('c', 2, 5), b('r', 50, 9, { rebadeOf: 'b' })];
    expect(momentOf(feed).map((x) => x.id)).toEqual(['b', 'c', 'a']);
    expect(momentOf(feed, 1).map((x) => x.id)).toEqual(['b']);
  });
});

describe('Badings épinglés', () => {
  const b = (id: string, createdAt: number) =>
    ({ id, authorId: 'u', anonymous: false, text: 'x', createdAt, likes: 0, likedByMe: false, rebades: 0, shares: 0 }) as Bading;

  it('tout en haut du fil, dans l’ordre des épingles, puis les autres sans changer', () => {
    const feed = [b('a', 5), b('b', 4), b('c', 3), b('d', 2)];
    expect(withPinsFirst(feed, [{ id: 'd' }, { id: 'b', label: 'Bading du jour' }]).map((x) => x.id)).toEqual(['d', 'b', 'a', 'c']);
    expect(withPinsFirst(feed, [])).toBe(feed);
    expect(withPinsFirst(feed, [{ id: 'absent' }]).map((x) => x.id)).toEqual(['a', 'b', 'c', 'd']);
  });
});
