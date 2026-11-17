import { Text } from 'react-native';

import { colors } from '@/theme/tokens';

import { AppText, type TextVariant } from './AppText';

/** Renders @mentions in brand-ink (5.5:1 on bg). */
export function RichText({ children, variant = 'story', numberOfLines }: { children: string; variant?: TextVariant; numberOfLines?: number }) {
  const parts = children.split(/(@[\w.]+)/g);
  return (
    <AppText variant={variant} numberOfLines={numberOfLines}>
      {parts.map((p, i) =>
        p.startsWith('@') ? (
          <Text key={i} style={{ color: colors.brandInk }}>
            {p}
          </Text>
        ) : (
          p
        ),
      )}
    </AppText>
  );
}
