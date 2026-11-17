import { router } from 'expo-router';
import { ArrowLeft } from '@/components/icons';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, space } from '@/theme/tokens';

import { AppText } from './AppText';

export function ScreenHeader({ title, right }: { title: string; right?: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ paddingTop: insets.top, backgroundColor: colors.bg, borderBottomWidth: 1, borderBottomColor: colors.line }}>
      <View style={{ height: 56, flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.sm, gap: space.sm }}>
        <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))} accessibilityRole="button" accessibilityLabel="Retour" hitSlop={8} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
          <ArrowLeft size={22} color={colors.text} />
        </Pressable>
        <AppText variant="heading" style={{ flex: 1 }} accessibilityRole="header">{title}</AppText>
        {right}
      </View>
    </View>
  );
}
