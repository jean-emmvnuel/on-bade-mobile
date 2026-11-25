// BadeScore : l'activité actuelle du Badeur (30 derniers jours), sur le profil. Calculé par le serveur (badings signés seulement).
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import type { BadeScore as Score } from '@/data/types';
import { colors, fonts, radius, space } from '@/theme/tokens';

import { AppText } from './AppText';
import { Sheet } from './Sheet';

const LEVEL_EMOJI = ['🌱', '🏘️', '🔥', '🚀', '👑'];
const STEPS = [0, 50, 200, 500, 1500];
// Ce qui fait monter le BadeScore (sans le détail du calcul, qui reste côté serveur).
const USED = ['Les rires reçus', 'Les commentaires reçus', 'Les partages', 'Les rebades', 'Les badings publiés', 'Les commentaires écrits'];

export function BadeScore({ score, mine = false }: { score?: Score; mine?: boolean }) {
  const [open, setOpen] = useState(false);
  if (!score) return null;
  const prev = STEPS[score.levelIndex] ?? 0;
  const progress = score.next ? Math.min(1, (score.score - prev) / (score.next - prev)) : 1;
  const left = score.next ? score.next - score.score : 0;
  return (
    <>
      <Pressable onPress={() => setOpen(true)} accessibilityRole="button" accessibilityLabel={`BadeScore ${score.score}, niveau ${score.level}. D’où vient-il ?`}
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
      <Sheet visible={open} onClose={() => setOpen(false)} title="Le BadeScore">
        <View style={{ paddingHorizontal: space.xl, gap: space.md, paddingBottom: space.lg }}>
          <AppText variant="bodyStrong">{mine ? 'Ton' : 'Le'} BadeScore vient de l’engouement autour {mine ? 'de tes' : 'de ses'} badings : les rires, les commentaires, les partages et les rebades qu’ils reçoivent.</AppText>
          {USED.map((what) => <AppText key={what} variant="body"><AppText variant="bodyStrong" color={colors.brandInk}>•</AppText>  {what}</AppText>)}
          <AppText variant="body" color={colors.text2}>Sur les {score.days} derniers jours.</AppText>
          <AppText variant="small" color={colors.text3}>Les badings anonymes ne comptent jamais : personne ne peut deviner qui les a écrits.</AppText>
        </View>
      </Sheet>
    </>
  );
}
