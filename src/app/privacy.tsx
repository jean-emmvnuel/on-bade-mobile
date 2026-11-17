import * as Linking from 'expo-linking';
import { ScrollView, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { ScreenHeader } from '@/components/ScreenHeader';
import policy from '@/content/privacy.json';
import { colors, space } from '@/theme/tokens';

/** In-app privacy policy. Same source as POLITIQUE_DE_CONFIDENTIALITE.md at the repo root. */
export default function Privacy() {
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScreenHeader title="Confidentialité" />
      <ScrollView contentContainerStyle={{ padding: space.lg, paddingBottom: space.xxxl, gap: space.xl }}>
        <View style={{ gap: space.sm }}>
          <AppText variant="title" accessibilityRole="header">{policy.title}</AppText>
          <AppText variant="small" color={colors.text3}>{policy.version}</AppText>
          <AppText variant="body" color={colors.text2}>{policy.intro}</AppText>
        </View>
        {policy.sections.map((s) => (
          <View key={s.title} style={{ gap: space.sm }}>
            <AppText variant="heading" accessibilityRole="header">{s.title}</AppText>
            {s.paragraphs.map((p, i) => (
              <AppText key={i} variant="body" color={colors.text2} style={{ lineHeight: 23 }}>{p}</AppText>
            ))}
          </View>
        ))}
        <Button label="Exercer mes droits par e-mail" kind="secondary" onPress={() => Linking.openURL('mailto:oriverseit@gmail.com?subject=Mes%20donn%C3%A9es%20Je%20Bade')} />
        <AppText variant="small" color={colors.text3}>{policy.note}</AppText>
      </ScrollView>
    </View>
  );
}
