import { router } from 'expo-router';
import { ArrowLeft } from '@/components/icons';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, space } from '@/theme/tokens';

import { AppText } from './AppText';

type Props = { step: number; total: number; title: string; subtitle?: string; children: React.ReactNode; footer: React.ReactNode; back?: boolean };

export function AuthScaffold({ step, total, title, subtitle, children, footer, back = true }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ paddingTop: insets.top + 8, paddingHorizontal: space.lg, flexDirection: 'row', alignItems: 'center', gap: space.md, height: insets.top + 56 }}>
        {back && router.canGoBack() ? (
          <Pressable onPress={() => router.back()} hitSlop={10} accessibilityRole="button" accessibilityLabel="Retour" style={{ width: 44, height: 44, justifyContent: 'center' }}>
            <ArrowLeft size={24} color={colors.text} />
          </Pressable>
        ) : (
          <View style={{ width: 44 }} />
        )}
        <View style={{ flex: 1, flexDirection: 'row', gap: 4 }} accessibilityRole="progressbar" accessibilityLabel={`Étape ${step} sur ${total}`}>
          {Array.from({ length: total }, (_, i) => (
            <View key={i} style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: i < step ? colors.brand : colors.line }} />
          ))}
        </View>
        <View style={{ width: 44 }} />
      </View>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: space.xl, paddingTop: space.xl, gap: space.xl, flexGrow: 1 }}>
        <Animated.View entering={FadeInDown.duration(380)} style={{ gap: space.sm }}>
          <AppText variant="title" accessibilityRole="header">{title}</AppText>
          {subtitle && <AppText variant="body" color={colors.text2}>{subtitle}</AppText>}
        </Animated.View>
        <Animated.View entering={FadeInDown.duration(380).delay(70)} style={{ gap: space.lg }}>
          {children}
        </Animated.View>
      </ScrollView>
      <View style={{ paddingHorizontal: space.xl, paddingBottom: insets.bottom + space.lg, paddingTop: space.md }}>{footer}</View>
    </KeyboardAvoidingView>
  );
}
