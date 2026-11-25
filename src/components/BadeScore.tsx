// BadeScore : toute l'activité du Badeur depuis son arrivée, sur le profil. Calculé par le serveur (badings signés seulement).
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import type { BadeScore as Score } from '@/data/types';
import { colors, fonts, radius, space } from '@/theme/tokens';

import { AppText } from './AppText';
import { Sheet } from './Sheet';

const LEVEL_EMOJI = ['🌱', '🏘️', '🔥', '🚀', '👑'];
// Ce qui fait monter le BadeScore (sans le détail du calcul, qui reste côté serveur).
const USED = ['Les rires reçus', 'Les commentaires reçus', 'Les partages', 'Les rebades', 'Les badings publiés', 'Les commentaires écrits'];

export function BadeScore({ score, mine = false }: { score?: Score; mine?: boolean }) {
  const [open, setOpen] = useState(false);
  if (!score) return null;
  const prev = score.from ?? 0;
  const progress = score.next ? Math.min(1, (score.score - prev) / (score.next - prev)) : 1;
  const left = score.next ? score.next - score.score : 0;
  return (
    <>
      {/* Pastille discrète sous les statistiques ; le détail (progression, ce qui compte) est dans la fiche. */}
      <Pressable onPress={() => setOpen(true)} accessibilityRole="button" accessibilityLabel={`BadeScore ${score.score}, niveau ${score.level}. D’où vient-il ?`}
        hitSlop={8}
        style={{ alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: space.sm, paddingVertical: 4, paddingHorizontal: 12, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface2 }}>
        <AppText variant="small">{LEVEL_EMOJI[score.levelIndex] ?? '🔥'}</AppText>
        <AppText variant="small" color={colors.text2}>BadeScore</AppText>
        <AppText variant="small" style={{ fontFamily: fonts.bodyBold }}>{score.score}</AppText>
        <AppText variant="small" color={colors.text3}>· {score.level}</AppText>
      </Pressable>
      <Sheet visible={open} onClose={() => setOpen(false)} title="Le BadeScore">
        <View style={{ paddingHorizontal: space.xl, gap: space.md, paddingBottom: space.lg }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <AppText style={{ fontSize: 22 }}>{LEVEL_EMOJI[score.levelIndex] ?? '🔥'}</AppText>
            <AppText style={{ fontFamily: fonts.display, fontSize: 22 }}>{score.score}</AppText>
            <AppText variant="body" color={colors.text2}>· {score.level}</AppText>
          </View>
          <View style={{ height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
            <View style={{ width: `${Math.round(progress * 100)}%`, height: '100%', borderRadius: 3, backgroundColor: colors.brandInk }} />
          </View>
          <AppText variant="small" color={colors.text2}>{score.next ? `${mine ? 'Encore' : 'Plus que'} ${left} point${left > 1 ? 's' : ''} pour ${score.nextLevel}` : 'Niveau maximum atteint 👑'}</AppText>
          <AppText variant="bodyStrong">{mine ? 'Ton' : 'Le'} BadeScore vient de l’engouement autour {mine ? 'de tes' : 'de ses'} badings : les rires, les commentaires, les partages et les rebades qu’ils reçoivent.</AppText>
          {USED.map((what) => <AppText key={what} variant="body"><AppText variant="bodyStrong" color={colors.brandInk}>•</AppText>  {what}</AppText>)}
          <AppText variant="body" color={colors.text2}>Depuis {mine ? 'ton' : 'son'} arrivée sur On Bade.</AppText>
          <AppText variant="small" color={colors.text3}>Les badings anonymes ne comptent jamais : personne ne peut deviner qui les a écrits.</AppText>
        </View>
      </Sheet>
    </>
  );
}
