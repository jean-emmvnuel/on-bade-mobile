import { router } from 'expo-router';
import { Text } from 'react-native';

import { colors } from '@/theme/tokens';

import { AppText, type TextVariant } from './AppText';

// @mention ou #hashtag (2 à 30 lettres, accents compris, chiffres ou _), comme sur le site.
const TOKENS = /(@[\w.]+|#[\p{L}\p{N}_]{2,30}(?![\p{L}\p{N}_]))/gu;
// Collé à une lettre ou à « / » avant : ce n'est pas un hashtag (adresse web, e-mail…).
const BEFORE_TAG = /[\p{L}\p{N}_&/]$/u;

/** @mentions et #hashtags en couleur de marque (5.5:1 sur le fond), touchables : profil du Badeur, page du hashtag. */
export function RichText({ children, variant = 'story', numberOfLines }: { children: string; variant?: TextVariant; numberOfLines?: number }) {
  const parts = children.split(TOKENS);
  return (
    <AppText variant={variant} numberOfLines={numberOfLines}>
      {parts.map((p, i) => {
        const token = i % 2 === 1 && (p.startsWith('@') || !BEFORE_TAG.test(parts[i - 1] || parts[i - 2] || ''));
        return token ? (
          <Text key={i} style={{ color: colors.brandInk, fontWeight: p.startsWith('#') ? '600' : undefined }} suppressHighlighting
            accessibilityRole="link"
            onPress={() => (p.startsWith('#')
              ? router.push({ pathname: '/tag/[tag]', params: { tag: p.slice(1).toLowerCase() } })
              : router.push({ pathname: '/u/[id]', params: { id: p.slice(1).replace(/\.+$/, '') } }))}>
            {p}
          </Text>
        ) : (
          p
        );
      })}
    </AppText>
  );
}
