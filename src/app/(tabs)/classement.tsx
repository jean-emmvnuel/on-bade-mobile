import { Crown, Laugh, Trophy } from '@/components/icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/AppText';
import { NotificationBell } from '@/components/NotificationBell';
import { Button } from '@/components/Button';
import { success } from '@/components/haptics';
import { useToast } from '@/components/Toast';
import { colors, fonts, radius, space } from '@/theme/tokens';

/** Aperçu flouté du futur podium : pas de vraies données, juste l'envie de monter dedans. */
const PREVIEW = [
  { rank: 1, w: '78%', laughs: '12,4 k', medal: '#FFC93C' },
  { rank: 2, w: '64%', laughs: '9,8 k', medal: '#C9C4C4' },
  { rank: 3, w: '70%', laughs: '7,1 k', medal: '#D08A4E' },
  { rank: 4, w: '56%', laughs: '5,3 k', medal: null },
  { rank: 5, w: '61%', laughs: '4,9 k', medal: null },
] as const;

/**
 * Onglet Classement (app mobile) — « bientôt » : « À bientôt, on verra qui sera le meilleur Badeur ».
 * Le vrai classement viendra dans une prochaine version ; cette page l'annonce pour donner envie de bader dès maintenant.
 */
export default function Classement() {
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const [notify, setNotify] = useState(false);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ paddingTop: insets.top, borderBottomWidth: 1, borderBottomColor: colors.line }}>
        <View style={{ height: 56, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: space.lg }}>
          <AppText variant="heading" style={{ fontSize: 22 }} accessibilityRole="header">Classement</AppText>
          <View style={{ paddingHorizontal: 10, height: 24, borderRadius: radius.pill, backgroundColor: colors.surface2, justifyContent: 'center' }}>
            <AppText variant="small" color={colors.text2} style={{ fontFamily: fonts.bodyBold }}>Bientôt</AppText>
          </View>
          <View style={{ flex: 1 }} />
          <NotificationBell />
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: space.lg, paddingBottom: space.xl * 2, gap: space.lg }}>
        <Animated.View entering={FadeInDown.duration(380)} style={{ alignItems: 'center', gap: space.sm, paddingTop: space.lg }}>
          <View style={{ width: 88, height: 88, borderRadius: 44, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center', marginBottom: space.sm }}>
            <Trophy size={40} color="#FFC93C" strokeWidth={1.8} />
          </View>
          <AppText variant="title" style={{ textAlign: 'center' }}>À bientôt !</AppText>
          <AppText variant="heading" style={{ textAlign: 'center', maxWidth: 320 }}>On verra qui sera le meilleur Badeur 👑</AppText>
          <AppText variant="body" color={colors.text2} style={{ textAlign: 'center', maxWidth: 320 }}>
            Le classement arrive bientôt : les badings qui font rire le plus de monde en Côte d'Ivoire. Commence à bader dès maintenant pour prendre de l'avance.
          </AppText>
        </Animated.View>

        {/* Podium d'aperçu, volontairement flou */}
        <Animated.View entering={FadeInDown.duration(380).delay(120)} accessibilityLabel="Aperçu du futur classement" style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: 28, padding: space.md, gap: 6 }}>
          {PREVIEW.map((p) => (
            <View key={p.rank} style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: 10, paddingHorizontal: space.sm, borderRadius: 16, backgroundColor: p.rank === 1 ? colors.surface2 : 'transparent' }}>
              <View style={{ width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: p.medal ?? colors.surface2 }}>
                {p.rank === 1 ? <Crown size={16} color={colors.bg} strokeWidth={2.4} /> : <AppText variant="label" color={p.medal ? colors.bg : colors.text2}>{p.rank}</AppText>}
              </View>
              <View style={{ flex: 1, gap: 6 }}>
                <View style={{ width: '40%', height: 10, borderRadius: 5, backgroundColor: colors.line }} />
                <View style={{ width: p.w, height: 8, borderRadius: 4, backgroundColor: '#2f2d2d' }} />
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, opacity: 0.55 }}>
                <Laugh size={15} color={colors.text2} />
                <AppText variant="meta" color={colors.text2}>{p.laughs}</AppText>
              </View>
            </View>
          ))}
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(380).delay(220)} style={{ gap: space.md }}>
          {[
            ['😂', 'Classé aux rires', 'Plus ton bading fait rire, plus il monte.'],
            ['🗓️', 'Remis à zéro chaque semaine', 'Tout le monde a sa chance, même les nouveaux Badeurs.'],
            ['🎭', 'Les anonymes aussi', 'Un bading anonyme peut gagner sans dévoiler son auteur.'],
          ].map(([e, t, d]) => (
            <View key={t} style={{ flexDirection: 'row', gap: space.md, alignItems: 'flex-start' }}>
              <AppText style={{ fontSize: 22, lineHeight: 28 }}>{e}</AppText>
              <View style={{ flex: 1 }}>
                <AppText variant="label">{t}</AppText>
                <AppText variant="meta" color={colors.text2}>{d}</AppText>
              </View>
            </View>
          ))}
        </Animated.View>

        <Button label="Bader maintenant" onPress={() => router.push('/compose')} />
        <Button
          kind="secondary"
          label={notify ? 'On te prévient dès que c’est prêt ✓' : 'Préviens-moi au lancement'}
          onPress={() => { if (!notify) { success(); toast('Noté ! Tu seras prévenu au lancement du classement.'); } setNotify(!notify); }}
        />
      </ScrollView>
    </View>
  );
}
