// BadeScore : l'activité actuelle du Badeur (30 derniers jours), sur le profil. Calculé par le serveur (badings signés seulement).
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import type { BadeScore as Score } from '@/data/types';
import { colors, fonts, radius, space } from '@/theme/tokens';

import { AppText } from './AppText';
import { Sheet } from './Sheet';

const LEVEL_EMOJI = ['🌱', '🏘️', '🔥', '🚀', '👑'];
const STEPS = [0, 50, 200, 500, 1500];
const RULES: [string, string][] = [
  ['+5', 'par bading signé publié'], ['+1', 'par rire reçu'], ['+2', 'par commentaire reçu'],
  ['+3', 'par partage'], ['+3', 'par rebade d’un autre Badeur'], ['+1', 'par commentaire écrit (10 par jour au plus)'],
];

export function BadeScore({ score, mine = false }: { score?: Score; mine?: boolean }) {
  const [open, setOpen] = useState(false);
  if (!score) return null;
  const prev = STEPS[score.levelIndex] ?? 0;
  const progress = score.next ? Math.min(1, (score.score - prev) / (score.next - prev)) : 1;
  const left = score.next ? score.next - score.score : 0;
  return (
    <>
      <Pressable onPress={() => setOpen(true)} accessibilityRole="button" accessibilityLabel={`BadeScore ${score.score}, niveau ${score.level}. Comment est-il calculé ?`}
        style={{ alignSelf: 'stretch', marginTop: space.md, marginHorizontal: space.lg, padding: space.lg, gap: 6, borderRadius: radius.lg, borderWidth: 1, borderColor: 'rgba(183,107,255,0.35)', backgroundColor: 'rgba(152,16,230,0.16)' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <AppText style={{ fontSize: 20 }}>{LEVEL_EMOJI[score.levelIndex] ?? '🔥'}</AppText>
          <AppText variant="label" color={colors.text2}>BadeScore</AppText>
          <AppText style={{ marginLeft: 'auto', fontFamily: fonts.display, fontSize: 26, lineHeight: 30 }}>{score.score}</AppText>
        </View>
        <AppText variant="bodyStrong" color={colors.brandInk}>{score.level}</AppText>
        <View style={{ height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
          <View style={{ width: `${Math.round(progress * 100)}%`, height: '100%', borderRadius: 4, backgroundColor: colors.brand }} />
        </View>
        <AppText variant="small" color={colors.text2}>
          {score.next ? `${mine ? 'Encore' : 'Plus que'} ${left} point${left > 1 ? 's' : ''} pour ${score.nextLevel}` : 'Niveau maximum atteint 👑'} · {score.days} derniers jours
        </AppText>
      </Pressable>
      <Sheet visible={open} onClose={() => setOpen(false)} title="Comment marche le BadeScore ?">
        <View style={{ paddingHorizontal: space.xl, gap: space.md, paddingBottom: space.lg }}>
          <AppText variant="body" color={colors.text2}>Le BadeScore mesure l’activité {mine ? 'de ton compte' : 'de ce Badeur'} sur les {score.days} derniers jours. Il monte quand tu fais bader, et redescend doucement quand tu te fais rare.</AppText>
          {RULES.map(([pts, what]) => (
            <AppText key={what} variant="body"><AppText variant="bodyStrong" color={colors.brandInk}>{pts}</AppText>  {what}</AppText>
          ))}
          <AppText variant="small" color={colors.text3}>Les badings anonymes ne comptent jamais : personne ne peut deviner qui les a écrits.</AppText>
        </View>
      </Sheet>
    </>
  );
}
