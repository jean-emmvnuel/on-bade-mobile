import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import { colors } from '@/theme/tokens';

const STEM = 'M40 46a22 22 0 0 1 44 0V214a22 22 0 0 1-44 0Z';
const BOWL = 'M68 158A78 78 0 1 0 224 158A78 78 0 1 0 68 158Z';
const MOUTH = 'M104 146H188A42 42 0 0 1 104 146Z';
const TEETH = [110, 129, 148, 167].map((x) => `M${x} 146H${x + 17}V155a4 4 0 0 1-4 4H${x + 4}a4 4 0 0 1-4-4Z`).join(' ');
const TONGUE = 'M124.4 182A21.6 14 0 0 1 167.6 182A42 42 0 0 1 124.4 182Z';
const ORIGIN = `${(146 / 256) * 100}%`;

/**
 * The logo with a mouth that can open and close: `open` goes 0 (closed smile line) → 1 (full laugh).
 * Shared by the pull-to-refresh; same drawing as the splash.
 */
export function LaughingMark({ size, open, bg = colors.bg }: { size: number; open: SharedValue<number>; bg?: string }) {
  const mouth = useAnimatedStyle(() => ({ transform: [{ scaleY: 0.12 + 0.88 * Math.min(1, Math.max(0, open.value)) }] }));
  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} viewBox="0 0 256 256" style={StyleSheet.absoluteFill}>
        <Path d={STEM} fill={colors.brand} />
        <Path d={BOWL} fill={colors.brand} />
      </Svg>
      <Animated.View style={[StyleSheet.absoluteFill, { transformOrigin: [ORIGIN, ORIGIN, 0] }, mouth]}>
        <Svg width={size} height={size} viewBox="0 0 256 256">
          <Path d={MOUTH} fill={bg} />
          <Path d={TONGUE} fill="#FF6FA8" />
          <Path d={TEETH} fill="#FFFFFF" />
        </Svg>
      </Animated.View>
    </View>
  );
}
