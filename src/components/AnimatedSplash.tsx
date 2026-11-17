import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import { colors } from '@/theme/tokens';

/**
 * Picks up exactly where the native splash leaves off (same size, same position:
 * `splash-icon.png` is the symbol at 90 % of a 1024 canvas, shown 120 dp wide),
 * then the b laughs twice and the mark zooms through to reveal the app.
 */
const SIZE = 120;
// splash-icon.png geometry: scale 3.6, offset 36.8 px → in 256-unit space.
const VB = '-10.2 -10.2 284.4 284.4';

const STEM = 'M40 46a22 22 0 0 1 44 0V214a22 22 0 0 1-44 0Z';
const BOWL = 'M68 158A78 78 0 1 0 224 158A78 78 0 1 0 68 158Z';
const MOUTH = 'M104 146H188A42 42 0 0 1 104 146Z';
// Four upper teeth hanging from the mouth's top edge (rounded at the bottom).
const tooth = (x: number) => `M${x} 146H${x + 17}V155a4 4 0 0 1-4 4H${x + 4}a4 4 0 0 1-4-4Z`;
const TEETH = [110, 129, 148, 167].map(tooth).join(' ');
// Tongue peeking at the bottom of the mouth (clipped to the half-disc shape).
const TONGUE = 'M124.4 182A21.6 14 0 0 1 167.6 182A42 42 0 0 1 124.4 182Z';
// Mouth top edge (y = 146) and centre (x = 146) in the 284.4-unit view box, as %.
const ORIGIN = `${((146 + 10.2) / 284.4) * 100}%`;

export function AnimatedSplash({ onDone }: { onDone: () => void }) {
  const reduce = useReducedMotion();
  const mouth = useSharedValue(1);
  const squash = useSharedValue(1);
  const zoom = useSharedValue(1);
  const fade = useSharedValue(1);

  useEffect(() => {
    SplashScreen.hideAsync();
    const finish = () => {
      fade.value = withTiming(0, { duration: 260, easing: Easing.out(Easing.quad) }, (ok) => ok && runOnJS(onDone)());
    };
    if (reduce) {
      fade.value = withDelay(300, withTiming(0, { duration: 260 }, (ok) => ok && runOnJS(onDone)()));
      return;
    }
    // "Ha… ha!": the mouth closes and bursts open twice, the bowl bounces with it.
    const laugh = (d: number) =>
      withSequence(withTiming(0.2, { duration: d, easing: Easing.in(Easing.quad) }), withSpring(1, { damping: 7, stiffness: 320 }));
    mouth.value = withDelay(150, withSequence(laugh(110), laugh(100)));
    squash.value = withDelay(150, withSequence(withTiming(0.94, { duration: 110 }), withSpring(1.06, { damping: 6 }), withTiming(0.95, { duration: 100 }), withSpring(1, { damping: 7 })));
    // Zoom-through reveal.
    zoom.value = withDelay(
      900,
      withTiming(14, { duration: 520, easing: Easing.in(Easing.exp) }, (ok) => ok && runOnJS(finish)()),
    );
  }, [reduce, mouth, squash, zoom, fade, onDone]);

  const markStyle = useAnimatedStyle(() => ({ transform: [{ scale: squash.value * zoom.value }] }));
  const mouthStyle = useAnimatedStyle(() => ({ transform: [{ scaleY: mouth.value }] }));
  const rootStyle = useAnimatedStyle(() => ({ opacity: fade.value }));

  return (
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.root, rootStyle]} accessibilityLabel="On Bade" accessibilityRole="image">
      <Animated.View style={[{ width: SIZE, height: SIZE }, markStyle]}>
        <Svg width={SIZE} height={SIZE} viewBox={VB} style={StyleSheet.absoluteFill}>
          <Path d={STEM} fill={colors.brand} />
          <Path d={BOWL} fill={colors.brand} />
        </Svg>
        <Animated.View style={[StyleSheet.absoluteFill, { transformOrigin: [ORIGIN, ORIGIN, 0] }, mouthStyle]}>
          <Svg width={SIZE} height={SIZE} viewBox={VB}>
            <Path d={MOUTH} fill={colors.bg} />
            <Path d={TONGUE} fill="#FF6FA8" />
            <Path d={TEETH} fill="#FFFFFF" />
          </Svg>
        </Animated.View>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', zIndex: 100 },
});
