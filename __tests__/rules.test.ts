import { applyRules, RULES } from '@/data/rules';

describe('règles réglées par l’équipe', () => {
  it('remplacent les valeurs par défaut, en ignorant les valeurs invalides', () => {
    const before = { ...RULES, badge: { ...RULES.badge } };
    applyRules({ commentMax: 300, minLength: 'abc', voiceMaxSeconds: 90, badgeMinLaughs: 500, inconnue: 1 });
    expect(RULES.commentMax).toBe(300);
    expect(RULES.minLength).toBe(before.minLength);
    expect(RULES.voiceMaxSeconds).toBe(90);
    expect(RULES.badge.minLaughs).toBe(500);
    expect((RULES as Record<string, unknown>).inconnue).toBeUndefined();
    Object.assign(RULES, before);
  });
});
