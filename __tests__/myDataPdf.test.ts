import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

import { exportMyData, myDataHtml, type MyDataInput } from '@/lib/myDataPdf';

jest.mock('expo-print', () => ({ printToFileAsync: jest.fn(async () => ({ uri: 'file:///donnees.pdf' })), printAsync: jest.fn() }));
jest.mock('expo-sharing', () => ({ isAvailableAsync: jest.fn(async () => true), shareAsync: jest.fn() }));

const now = Date.now(), d = 86_400_000;
const input = (o: Partial<MyDataInput> = {}): MyDataInput => ({
  me: { id: 'me', pseudo: 'AwaLaGo225', verified: false, hue: 280, joinedAt: now - 45 * d },
  email: 'awa@test.ci',
  feed: [
    { id: 'm1', authorId: 'me', anonymous: false, text: 'Mon patron m’a vu au match <b>', createdAt: now - 3_600_000, likes: 13, likedByMe: false, rebades: 2, shares: 1, views: 120 },
    { id: 'm2', authorId: 'me', anonymous: true, text: 'Réunion en anglais', createdAt: now - 2 * d, likes: 64, likedByMe: false, rebades: 5, shares: 9, views: 444 },
    { id: 'b1', authorId: 'u1', anonymous: false, text: 'Gbaka', createdAt: now, likes: 248, likedByMe: true, rebades: 0, shares: 0, views: 1600 },
  ],
  comments: [
    { id: 'c1', badingId: 'b1', authorId: 'me', text: '', sticker: 'ehhh', createdAt: now, parentId: null, likes: 2, likedByMe: false },
    { id: 'c2', badingId: 'm1', authorId: 'u3', text: 'Le docteur était bon ?', createdAt: now, parentId: null, likes: 11, likedByMe: true },
  ],
  users: { u1: { id: 'u1', pseudo: 'Koffi225', verified: false, hue: 1, joinedAt: 0 }, u3: { id: 'u3', pseudo: 'LeVraiZoba', verified: true, hue: 1, joinedAt: 0 } },
  favorites: ['b1'], customStickers: {}, myStickers: [], mentionsReceived: 1, mentionPolicy: 'everyone', blocked: [],
  badge: { status: 'refused', reason: 'il faut au moins 1 000 rires reçus' }, deletion: { status: 'none' },
  ...o,
});
const tile = (html: string, label: string) => new RegExp(`<div class="v[^"]*">([^<]+)</div><b>${label}</b>`).exec(html)?.[1];

describe('Copie de mes données (PDF)', () => {
  it('donne les bonnes statistiques', () => {
    const html = myDataHtml(input());
    expect(tile(html, 'Badings publiés')).toBe('2');
    expect(tile(html, 'Rires reçus')).toBe('77');
    expect(tile(html, 'Rires donnés')).toBe('2'); // 1 bading + 1 commentaire
    expect(tile(html, 'Vues reçues')).toMatch(/^564$/);
    expect(tile(html, 'Commentaires reçus')).toBe('1');
    expect(tile(html, 'Commentaires écrits')).toBe('1');
    expect(tile(html, 'Taux de rire')).toBe('14%');
  });
  it('contient le compte, les badings (anonymes compris, marqués privés) et le sticker envoyé', () => {
    const html = myDataHtml(input());
    for (const t of ['@AwaLaGo225', 'awa@test.ci', 'Anonyme (privé)', 'Mes badings (2)', '[Sticker « Éhhh ! »]', 'Mes favoris (1)', 'Koffi225']) expect(html).toContain(t);
  });
  it('échappe le HTML écrit par les utilisateurs', () => {
    const html = myDataHtml(input());
    expect(html).toContain('&lt;b&gt;'); expect(html).not.toContain('au match <b>');
  });
  it('ne montre jamais le mot de passe', () => { expect(myDataHtml(input())).not.toMatch(/mot de passe\s*:/i); });
  it('crée le PDF puis ouvre le partage', async () => {
    await exportMyData(input());
    expect(Print.printToFileAsync).toHaveBeenCalledWith(expect.objectContaining({ html: expect.stringContaining('Copie de mes données') }));
    expect(Sharing.shareAsync).toHaveBeenCalledWith('file:///donnees.pdf', expect.objectContaining({ mimeType: 'application/pdf' }));
  });
});
