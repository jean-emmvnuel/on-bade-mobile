import { BadgeCheck } from '@/components/icons';

import { colors } from '@/theme/tokens';

export function Verified({ size = 16 }: { size?: number }) {
  return <BadgeCheck size={size} color={colors.onBrand} fill={colors.brand} strokeWidth={2} accessibilityLabel="Compte vérifié" />;
}
