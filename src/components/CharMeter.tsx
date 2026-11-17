import { View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { AppText } from '@/components/AppText';
import { colors, fonts } from '@/theme/tokens';

const WARN = '#FFB547';
const R = 10, C = 2 * Math.PI * R;

/** Compteur de caractères toujours visible sous la zone de texte : anneau qui se remplit + nombre. */
export function CharMeter({ length, max, caption = false }: { length: number; max: number; caption?: boolean }) {
  const rest = max - length;
  const over = rest < 0, near = !over && rest <= Math.max(20, max * 0.1);
  const tint = over ? colors.danger : near ? WARN : colors.brand;
  const fill = Math.min(1, length / max) * C;
  return (
    <View
      accessible
      accessibilityLiveRegion="polite"
      accessibilityLabel={over ? `${-rest} caractères en trop` : `${length} caractères sur ${max}`}
      style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 8, minHeight: 28 }}>
      <Svg width={24} height={24} viewBox="0 0 24 24" style={{ transform: [{ rotate: '-90deg' }] }}>
        <Circle cx={12} cy={12} r={R} stroke={colors.line} strokeWidth={3} fill="none" />
        <Circle cx={12} cy={12} r={R} stroke={tint} strokeWidth={3} fill="none" strokeLinecap="round" strokeDasharray={`${fill} ${C}`} />
      </Svg>
      <AppText variant="small" color={over ? colors.danger : colors.text3} style={{ fontVariant: ['tabular-nums'] }}>
        <AppText variant="small" color={over ? colors.danger : near ? WARN : colors.text2} style={{ fontFamily: fonts.bodyBold }}>
          {over ? -rest : length}
        </AppText>
        {over ? ' en trop' : ` / ${max}${caption ? ' · légende' : ''}`}
      </AppText>
    </View>
  );
}
