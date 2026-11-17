import { getSticker, STICKERS } from '@/data/stickers';
import { seedBadings, seedComments, seedMyBadings } from '@/data/seed';

describe('Données de base', () => {
  it('16 stickers On Bade aux identifiants uniques', () => {
    expect(STICKERS).toHaveLength(16);
    expect(new Set(STICKERS.map((s) => s.id)).size).toBe(16);
    expect(getSticker('ehhh')?.label).toBe('Éhhh !');
    expect(getSticker('inconnu')).toBeUndefined();
  });
  it('la démo est cohérente : identifiants uniques, commentaires rattachés à un bading existant', () => {
    const badings = [...seedMyBadings, ...seedBadings];
    expect(new Set(badings.map((b) => b.id)).size).toBe(badings.length);
    const ids = new Set(badings.map((b) => b.id));
    for (const c of seedComments) expect(ids.has(c.badingId)).toBe(true);
    for (const b of badings.filter((x) => x.rebadeOf)) expect(ids.has(b.rebadeOf!)).toBe(true);
  });
});
