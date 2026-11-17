import { project, rubberband, SPRING_FLICK, SPRING_UI } from '@/lib/motion';

describe('Mouvement (apple-design)', () => {
  it('ressort par défaut sans rebond, rebond léger réservé aux gestes lancés', () => {
    expect(SPRING_UI.dampingRatio).toBe(1);
    expect(SPRING_FLICK.dampingRatio).toBeLessThan(1);
    expect(SPRING_FLICK.dampingRatio).toBeGreaterThanOrEqual(0.8);
  });
  it('projection de l’élan : nulle sans vitesse, plus loin quand on lance plus fort', () => {
    expect(project(0)).toBe(0);
    expect(project(1000)).toBeCloseTo(499, 0);
    expect(project(2000)).toBeGreaterThan(project(1000));
    expect(project(-1000)).toBeLessThan(0);
  });
  it('résistance élastique : on suit de moins en moins au-delà du bord', () => {
    expect(Math.abs(rubberband(-100, 600))).toBeLessThan(100);
    expect(Math.abs(rubberband(-1000, 600))).toBeLessThan(600 * 0.55 + 1);
  });
});
