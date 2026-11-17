import type { ErrorBoundaryProps } from 'expo-router';
import { ScrollView, View } from 'react-native';

import { colors, space } from '@/theme/tokens';

import { AppText } from './AppText';
import { Button } from './Button';

/** Shown by Expo Router instead of closing the app when a screen throws. */
export function AppErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  console.error('[OnBade] crash écran', error?.message, error?.stack);
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, padding: space.xl, paddingTop: 80, gap: space.lg }}>
      <AppText variant="title">Oups, ça a planté.</AppText>
      <AppText variant="body" color={colors.text2}>Envoie une capture de cet écran à l'équipe, puis réessaie.</AppText>
      <ScrollView style={{ maxHeight: 320, backgroundColor: colors.surface, borderRadius: 12, padding: space.md }}>
        <AppText variant="small" color={colors.danger}>{String(error?.message ?? error)}</AppText>
        <AppText variant="small" color={colors.text3}>{String(error?.stack ?? '').slice(0, 1500)}</AppText>
      </ScrollView>
      <Button label="Réessayer" onPress={retry} />
    </View>
  );
}
