import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { colors, fonts } from '@/theme/tokens';

import { AppText } from './AppText';

import { DAY_MS as DAY, seasonEnd, timeLeft } from '@/lib/season';

const pad = (n: number) => String(n).padStart(2, '0');

/** Compte à rebours jusqu'à la fin de la saison, qui défile à la seconde (rouge le dernier jour). */
export function SeasonCountdown({ season }: { season: { endsOn?: string; day: number; length: number } }) {
  const end = seasonEnd(season);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const t = timeLeft(end, now);
  const urgent = t.total > 0 && t.total < DAY;
  if (!t.total) return <AppText variant="label" color="#FFD166">Saison terminée : résultats à minuit passé</AppText>;
  const parts: [string, string][] = [[String(t.days), t.days > 1 ? 'jours' : 'jour'], [pad(t.hours), 'h'], [pad(t.minutes), 'min'], [pad(t.seconds), 's']];
  return (
    <View accessibilityRole="timer" accessibilityLabel={`Fin de la saison dans ${t.days} jours, ${t.hours} heures et ${t.minutes} minutes`} style={{ flexDirection: 'row', gap: 6, marginTop: 4 }}>
      {parts.map(([v, unit]) => (
        <View key={unit} style={{ minWidth: 48, paddingVertical: 5, paddingHorizontal: 4, borderRadius: 10, alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.28)', borderWidth: 1, borderColor: urgent ? 'rgba(255,90,95,0.6)' : 'rgba(255,201,60,0.3)' }}>
          <AppText style={{ fontFamily: fonts.display, fontSize: 20, lineHeight: 22, color: urgent ? '#FF8A8D' : colors.text, fontVariant: ['tabular-nums'] }}>{v}</AppText>
          <AppText variant="small" color={colors.text2} style={{ fontSize: 10.5 }}>{unit}</AppText>
        </View>
      ))}
    </View>
  );
}
