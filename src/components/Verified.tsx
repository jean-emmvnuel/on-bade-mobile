import { BadgeCheck, Award } from '@/components/icons';

import { colors } from '@/theme/tokens';

export function Verified({ size = 16 }: { size?: number }) {
  return <BadgeCheck size={size} color={colors.onBrand} fill={colors.brand} strokeWidth={2} accessibilityLabel="Compte vérifié" />;
}

/** Badge « Légende du Bade » (BadeScore ≥ 25 000) : médaille dorée à côté du pseudo. */
export function Legend({ size = 16 }: { size?: number }) {
  return <Award size={size} color="#5a3a00" fill="#F5B82E" strokeWidth={2} accessibilityLabel="Légende du Bade" />;
}
