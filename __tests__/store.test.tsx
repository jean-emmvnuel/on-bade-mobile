import { act, renderHook } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { compact, MAX_MY_STICKERS, passwordProblem, RULES, StoreProvider, timeAgo, useStore, validateBading } from '@/data/store';
import { ME_ID } from '@/data/seed';

const wrapper = ({ children }: { children: ReactNode }) => <StoreProvider>{children}</StoreProvider>;
/** Store neuf, avec un compte connecté. */
async function setup() {
  const h = await renderHook(() => useStore(), { wrapper });
  await act(async () => h.result.current.startSignup('awa@test.ci', 'motdepasse1'));
  await act(async () => h.result.current.register('AwaLaGo225'));
  return h;
}

describe('Règles de publication (F1)', () => {
  it('texte de 10 à 1 000 caractères sans image', () => {
    expect(validateBading('Court')).toBe('too_short');
    expect(validateBading('a'.repeat(10))).toBeNull();
    expect(validateBading('a'.repeat(1001))).toBe('too_long');
  });
  it('avec une image : texte facultatif, légende de 280 caractères max.', () => {
    expect(validateBading('', true)).toBeNull();
    expect(validateBading('a'.repeat(281), true)).toBe('caption_too_long');
  });
  it('mots interdits, 5 mentions, et aucune limite par jour', () => {
    for (let i = 0; i < 30; i++) expect(validateBading('Une histoire assez longue')).toBeNull();
    expect(validateBading('Quel connard ce chauffeur')).toBe('blocked_word');
    expect(validateBading('@a @b @c @d @e @f trop de monde')).toBe('too_many_mentions');
  });
});

describe('Compte', () => {
  it('mot de passe : 8 caractères, lettres et chiffres', () => {
    expect(passwordProblem('abc1')).toBeTruthy();
    expect(passwordProblem('abcdefgh')).toBeTruthy();
    expect(passwordProblem('motdepasse1')).toBeNull();
  });
  it('inscription, déconnexion, mauvaise connexion puis bonne connexion', async () => {
    const { result } = await setup();
    expect(result.current.session?.user.pseudo).toBe('AwaLaGo225');
    expect(result.current.isEmailTaken('awa@test.ci')).toBe(true);
    await act(async () => result.current.signOut());
    expect(result.current.session).toBeNull();
    let r = '';
    await act(async () => { r = await result.current.logIn('awa@test.ci', 'mauvais12'); });
    expect(r).toBe('wrong_password');
    await act(async () => { r = await result.current.logIn('inconnu@test.ci', 'motdepasse1'); });
    expect(r).toBe('unknown');
    await act(async () => { r = await result.current.logIn('awa@test.ci', 'motdepasse1'); });
    expect(r).toBe('ok');
  });
  it('la photo de profil reste après une reconnexion, et peut être retirée', async () => {
    const { result } = await setup();
    await act(async () => result.current.setPhoto('file:///photo.jpg'));
    expect(result.current.session?.user.photo).toBe('file:///photo.jpg');
    await act(async () => result.current.signOut());
    await act(async () => { await result.current.logIn('awa@test.ci', 'motdepasse1'); });
    expect(result.current.session?.user.photo).toBe('file:///photo.jpg');
    await act(async () => result.current.setPhoto(null));
    expect(result.current.users[ME_ID].photo).toBeUndefined();
  });
  it('changer de pseudo retire le badge vérifié', async () => {
    const { result } = await setup();
    await act(async () => result.current.changePseudo('NouveauNom'));
    expect(result.current.session?.user).toMatchObject({ pseudo: 'NouveauNom', verified: false });
  });
});

describe('Publier, rire, voir, partager', () => {
  it('publie en tête du fil avec des compteurs à zéro et vide le brouillon', async () => {
    const { result } = await setup();
    await act(async () => result.current.setDraft({ text: 'brouillon', anonymous: true, image: null }));
    let id = '';
    await act(async () => { const r = await result.current.publish('  Le gbaka m’a oublié à Adjamé  ', false); if (r.ok) id = r.id; });
    expect(result.current.feed[0]).toMatchObject({ id, text: 'Le gbaka m’a oublié à Adjamé', likes: 0, views: 0, authorId: ME_ID });
    expect(result.current.draft).toEqual({ text: '', anonymous: false, image: null });
  });
  it('deux badings publiés dans la même milliseconde ont des identifiants différents', async () => {
    const { result } = await setup();
    jest.spyOn(Date, 'now').mockReturnValue(1_800_000_000_000);
    const ids: string[] = [];
    await act(async () => {
      for (const t of ['Première histoire du jour', 'Deuxième histoire du jour']) { const r = await result.current.publish(t, false); if (r.ok) ids.push(r.id); }
    });
    jest.restoreAllMocks();
    expect(new Set(ids).size).toBe(2);
  });
  it('rire puis retirer son rire', async () => {
    const { result } = await setup();
    const before = result.current.getBading('b1')!.likes;
    await act(async () => result.current.toggleLike('b1'));
    expect(result.current.getBading('b1')).toMatchObject({ likes: before + 1, likedByMe: true });
    await act(async () => result.current.toggleLike('b1'));
    expect(result.current.getBading('b1')).toMatchObject({ likes: before, likedByMe: false });
  });
  it('chaque bading a un compteur de vues qui augmente à l’ouverture', async () => {
    const { result } = await setup();
    expect(result.current.feed.every((b) => typeof b.views === 'number')).toBe(true);
    const v = result.current.getBading('b1')!.views!;
    await act(async () => { result.current.addView('b1'); result.current.addView('b1'); });
    expect(result.current.getBading('b1')!.views).toBe(v + 2);
  });
  it('partager et mettre en favori', async () => {
    const { result } = await setup();
    const n = result.current.getBading('b1')!.shares;
    await act(async () => result.current.share('b1'));
    expect(result.current.getBading('b1')!.shares).toBe(n + 1);
    let on = false;
    await act(async () => { on = result.current.toggleFavorite('b1'); });
    expect(on).toBe(true); expect(result.current.favorites).toContain('b1');
  });
  it('une rebade pointe toujours vers le bading d’origine et l’avis est coupé à 280', async () => {
    const { result } = await setup();
    const origin = result.current.feed.find((b) => !b.rebadeOf && b.authorId !== ME_ID)!;
    const n = origin.rebades;
    await act(async () => result.current.rebade(origin.id, 'x'.repeat(400), false));
    const r = result.current.feed[0];
    expect(r).toMatchObject({ rebadeOf: origin.id, authorId: ME_ID });
    expect(r.text).toHaveLength(280);
    expect(result.current.getBading(origin.id)!.rebades).toBe(n + 1);
    await act(async () => result.current.rebade(r.id, 'encore', false));
    expect(result.current.feed[0].rebadeOf).toBe(origin.id);
  });
  it('bloquer un Badeur masque ses badings', async () => {
    const { result } = await setup();
    await act(async () => result.current.block('u1'));
    expect(result.current.feed.some((b) => b.authorId === 'u1')).toBe(false);
  });
});

describe('Commentaires et stickers (F8)', () => {
  it('refuse un commentaire vide, trop long ou avec un mot interdit', async () => {
    const { result } = await setup();
    await act(async () => {
      expect(await result.current.addComment('b1', '   ')).toBeNull();
      expect(await result.current.addComment('b1', 'a'.repeat(RULES.commentMax + 1))).toBeNull();
      expect(await result.current.addComment('b1', 'espèce de connard')).toBeNull();
    });
  });
  it('un sticker en commentaire n’a pas de texte et rejoint les récents', async () => {
    const { result } = await setup();
    await act(async () => { await result.current.addComment('b1', 'ignoré', undefined, 'ehhh'); });
    expect(result.current.comments.at(-1)).toMatchObject({ text: '', sticker: 'ehhh' });
    expect(result.current.recentStickers[0]).toBe('ehhh');
  });
  it('deux commentaires dans la même milliseconde ont des identifiants différents', async () => {
    const { result } = await setup();
    jest.spyOn(Date, 'now').mockReturnValue(1_800_000_000_000);
    await act(async () => { await Promise.all([result.current.addComment('b1', 'premier'), result.current.addComment('b1', 'second')]); });
    jest.restoreAllMocks();
    const [a, b] = result.current.comments.slice(-2);
    expect(a.id).not.toBe(b.id);
  });
  it('une réponse s’accroche au commentaire exact et s’affiche dans le fil de sa racine', async () => {
    const { result } = await setup();
    const reply = result.current.comments.find((c) => c.parentId)!;
    const root = reply.parentId!;
    let mine: any;
    await act(async () => { mine = await result.current.addComment(reply.badingId, 'Je réponds', reply); });
    expect(mine.parentId).toBe(reply.id);
    expect(mine.replyTo).toBe(result.current.users[reply.authorId]?.pseudo);
    const thread = result.current.commentsFor(reply.badingId).find((t) => t.root.id === root)!;
    expect(thread.replies.map((c) => c.id)).toEqual(expect.arrayContaining([reply.id, mine.id]));
  });
  it('supprimer un commentaire retire toutes ses réponses, à toutes les profondeurs', async () => {
    const { result } = await setup();
    const reply = result.current.comments.find((c) => c.parentId)!;
    const before = result.current.commentsFor(reply.badingId).find((t) => t.root.id === reply.parentId)!.replies.length;
    let deep: any;
    await act(async () => { deep = await result.current.addComment(reply.badingId, 'Réponse à la réponse', reply); });
    await act(async () => { await result.current.addComment(reply.badingId, 'Encore plus bas', deep); });
    await act(async () => { await result.current.removeComment(reply.id); });
    const thread = result.current.commentsFor(reply.badingId).find((t) => t.root.id === reply.parentId)!;
    expect(thread.replies).toHaveLength(before - 1);
    expect(thread.replies.some((c) => c.id === deep.id)).toBe(false);
  });
  it('une très grande collection (1 000 stickers) : créer, enregistrer, puis refuser au-delà sans rien effacer', async () => {
    expect(MAX_MY_STICKERS).toBe(1000);
    const { result } = await setup();
    await act(async () => { await result.current.createSticker('file:///s.jpg'); });
    expect(result.current.myStickers).toHaveLength(1);
    let ok = false;
    await act(async () => { ok = await result.current.saveSticker('us1'); });
    expect(ok).toBe(true);
    await act(async () => { ok = await result.current.saveSticker('us1'); });
    expect(ok).toBe(false);
    for (let i = result.current.myStickers.length; i < MAX_MY_STICKERS; i++) await act(async () => { await result.current.createSticker(`file:///s${i}.jpg`); });
    expect(result.current.myStickers).toHaveLength(MAX_MY_STICKERS);
    const first = [...result.current.myStickers];
    let created: string | null = 'x';
    await act(async () => { created = await result.current.createSticker('file:///trop.jpg'); ok = await result.current.saveSticker('us2'); });
    expect(created).toBeNull(); expect(ok).toBe(false);
    expect(result.current.myStickers).toEqual(first); // rien n'a été effacé en silence
  });
});

describe('Badge vérifié', () => {
  it('envoyer une demande la met en attente', async () => {
    const { result } = await setup();
    await act(async () => result.current.requestBadge(['tiktok.com/@awa']));
    expect(result.current.badge).toMatchObject({ status: 'pending', links: ['tiktok.com/@awa'] });
  });
  it('suppression du compte : demande puis annulation', async () => {
    const { result } = await setup();
    await act(async () => result.current.requestDeletion('Je pars'));
    expect(result.current.deletion.status).toBe('pending');
    await act(async () => result.current.cancelDeletion());
    expect(result.current.deletion.status).toBe('none');
  });
});

describe('Formats', () => {
  it('compact et timeAgo', () => {
    expect(compact(999)).toBe('999');
    expect(compact(12_400)).toMatch(/^12\s?k$/);
    const now = Date.now();
    expect(timeAgo(now - 5 * 60_000)).toMatch(/5 min/);
  });
});
