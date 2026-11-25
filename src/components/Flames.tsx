// Flammes sur le profil : série en cours 🔥, rang de la saison, progression de la saison (30 jours), jours actifs, record,
// total. Tout vient du serveur : 1 jour d'activité = 1 flamme.
import { View } from 'react-native';

import type { Flames as FlamesData } from '@/data/types';
import { colors, fonts, radius, space } from '@/theme/tokens';

import { AppText } from './AppText';

const ORANGE = '#FF8C32';

export function Flames({ flames, mine = false }: { flames?: FlamesData; mine?: boolean }) {
  if (!flames) return null;
  const { streak, today, seasonDays, record, totalDays, seasonRank, season } = flames;
  const left = season.length - season.day;
  const Stat = ({ label, value, unit }: { label: string; value: string; unit: string }) => (
    <View style={{ flex: 1, padding: 8, borderRadius: radius.md, backgroundColor: 'rgba(0,0,0,0.18)', gap: 2 }}>
      <AppText variant="small" color={colors.text3}>{label}</AppText>
      <AppText style={{ fontFamily: fonts.display, fontSize: 18 }}>{value}<AppText variant="small" color={colors.text3}>{unit}</AppText></AppText>
    </View>
  );
  return (
    <View accessibilityLabel={`${streak} flamme${streak > 1 ? 's' : ''}${seasonRank ? `, ${seasonRank}e de la saison` : ''}`}
      style={{ alignSelf: 'stretch', marginTop: space.md, marginHorizontal: space.lg, padding: space.lg, gap: 10, borderRadius: radius.lg, borderWidth: 1, borderColor: 'rgba(255,140,50,0.35)', backgroundColor: 'rgba(255,122,26,0.12)' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <AppText style={{ fontSize: 26, opacity: streak ? 1 : 0.4 }}>🔥</AppText>
        <AppText variant="body" color={colors.text2}><AppText style={{ fontFamily: fonts.display, fontSize: 24, color: colors.text }}>{streak}</AppText> flamme{streak > 1 ? 's' : ''}</AppText>
        <AppText variant="small" color="#FFB066" style={{ marginLeft: 'auto', fontFamily: fonts.bodyBold }}>{seasonRank ? `${seasonRank}e de la saison` : 'Pas encore classé'}</AppText>
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <AppText variant="small" style={{ fontFamily: fonts.bodyBold }}>Saison {season.number} · jour {season.day}/{season.length}</AppText>
        <AppText variant="small" color={colors.text2}>{left > 0 ? `encore ${left} jour${left > 1 ? 's' : ''}` : 'dernier jour'}</AppText>
      </View>
      <View style={{ flexDirection: 'row', gap: 3 }}>
        {Array.from({ length: season.length }, (_, i) => (
          <View key={i} style={{ flex: 1, height: 8, borderRadius: 2, backgroundColor: i < season.day - 1 ? 'rgba(255,140,50,0.55)' : i === season.day - 1 ? ORANGE : 'rgba(255,255,255,0.08)' }} />
        ))}
      </View>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Stat label="Jours actifs" value={String(seasonDays)} unit={`/${season.length}`} />
        <Stat label="Record" value={String(record)} unit=" j" />
        <Stat label="Au total" value={String(totalDays)} unit=" j" />
      </View>
      {mine && (
        <AppText variant="small" color={colors.text2}>
          {today ? '✓ Flamme du jour gagnée. Reviens demain pour la garder !'
            : streak ? 'Publie un bading aujourd’hui pour garder ta série 🔥' : 'Publie un bading aujourd’hui pour allumer ta première flamme 🔥'}
        </AppText>
      )}
    </View>
  );
}
