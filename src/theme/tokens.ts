import '@/global.css';

export const colors = {
  bg: '#1a1919',
  surface: '#222121',
  surface2: '#2b2929',
  line: '#333131',
  text: '#F4F1F1',
  text2: '#A9A4A4',
  text3: '#817d7d',
  brand: '#9810e6',
  brandPressed: '#7f0cc2',
  brandInk: '#B76BFF',
  brandSoft: 'rgba(152,16,230,0.16)',
  onBrand: '#FFFFFF',
  lilac: '#EDE3FA',
  plum: '#4A1477',
  danger: '#FF5A5F',
  success: '#3DDC97',
  scrim: 'rgba(10,9,9,0.72)',
} as const;

export const fonts = {
  display: 'BricolageGrotesque_800ExtraBold',
  displayBold: 'BricolageGrotesque_700Bold',
  body: 'Figtree_400Regular',
  bodyMedium: 'Figtree_500Medium',
  bodySemi: 'Figtree_600SemiBold',
  bodyBold: 'Figtree_700Bold',
} as const;

export const space = { xxs: 2, xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48 } as const;
export const radius = { sm: 8, md: 12, lg: 20, xl: 28, pill: 999 } as const;

/** Exponential ease-out used across the app (expo-out). */
export const easeOut = [0.16, 1, 0.3, 1] as const;

export const duration = { fast: 120, base: 220, slow: 320 } as const;
