import { Text, type TextProps, type TextStyle } from 'react-native';

import { colors, fonts } from '@/theme/tokens';

const variants = {
  hero: { fontFamily: fonts.display, fontSize: 40, lineHeight: 42, letterSpacing: -1.2 },
  title: { fontFamily: fonts.display, fontSize: 28, lineHeight: 32, letterSpacing: -0.6 },
  heading: { fontFamily: fonts.displayBold, fontSize: 20, lineHeight: 24, letterSpacing: -0.2 },
  // Interlettrage selon la taille (apple-design) : serré en grand, légèrement ouvert en petit.
  story: { fontFamily: fonts.bodyMedium, fontSize: 17, lineHeight: 24, letterSpacing: -0.1 },
  body: { fontFamily: fonts.body, fontSize: 16, lineHeight: 22 },
  bodyStrong: { fontFamily: fonts.bodyBold, fontSize: 16, lineHeight: 22 },
  label: { fontFamily: fonts.bodySemi, fontSize: 15, lineHeight: 20, letterSpacing: -0.1 },
  meta: { fontFamily: fonts.body, fontSize: 14, lineHeight: 18, letterSpacing: 0.1 },
  small: { fontFamily: fonts.bodyMedium, fontSize: 13, lineHeight: 16, letterSpacing: 0.15 },
} satisfies Record<string, TextStyle>;

export type TextVariant = keyof typeof variants;

type Props = TextProps & { variant?: TextVariant; color?: string };

export function AppText({ variant = 'body', color = colors.text, style, ...rest }: Props) {
  return <Text {...rest} style={[variants[variant], { color }, style]} />;
}
