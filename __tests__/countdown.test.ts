// Compte à rebours de fin de saison (src/lib/season.ts).
import { seasonEnd, timeLeft } from '@/lib/season';

describe('fin de saison', () => {
  it('minuit (Abidjan = UTC) le soir du dernier jour', () => {
    expect(new Date(seasonEnd({ endsOn: '2026-12-24', day: 1, length: 30 })).toISOString()).toBe('2026-12-25T00:00:00.000Z');
  });
  it('jours, heures, minutes, secondes ; jamais négatif', () => {
    const end = Date.parse('2026-12-25T00:00:00Z');
    expect(timeLeft(end, Date.parse('2026-11-25T18:30:15Z'))).toMatchObject({ days: 29, hours: 5, minutes: 29, seconds: 45 });
    expect(timeLeft(end, Date.parse('2026-12-26T00:00:00Z')).total).toBe(0);
  });
});
