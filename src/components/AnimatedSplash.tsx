import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useMemo } from 'react';
import { StyleSheet, useWindowDimensions } from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import { colors, fonts } from '@/theme/tokens';

/**
 * Picks up exactly where the native splash leaves off (same size, same position:
 * `splash-icon.png` is the symbol at 90 % of a 1024 canvas, shown 120 dp wide),
 * then the b bursts out laughing — its « ha ha » fly out across the screen — and the mark zooms through to reveal the app.
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

// Les rires qui jaillissent du b et traversent l'écran.
const LAUGHS = ['ha', 'HA', 'haha', 'HAHA', 'hihi', 'ha ha', 'mdr', 'HAHAHA'];
const LAUGH_COLORS = ['#C58CFF', '#FFC93C', '#FFFFFF', colors.brand, '#FF6FA8'];
const LAUGH_COUNT = 16;
const LAUGH_START = 150; // ms : en même temps que le fou rire
const LAUGH_EVERY = 70; // ms entre deux rires
const LAUGH_CYCLE = 230; // ms : bouche fermée puis grande ouverte
const LAUGH_CYCLES = 6;

/** « Hasard » stable entre 0 et 1, tiré du numéro du rire (même dessin à chaque rendu). */
const rnd = (i: number, k: number) => { const x = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453; return x - Math.floor(x); };

function FlyingLaugh({ index, reach }: { index: number; reach: number }) {
  // Direction, taille, rotation : réparties tout autour, avec un peu de variété.
  const p = useMemo(() => {
    const angle = (index / LAUGH_COUNT) * Math.PI * 2 + (rnd(index, 1) - 0.5) * 0.6;
    return {
      dx: Math.cos(angle) * reach * (0.55 + rnd(index, 2) * 0.15),
      dy: Math.sin(angle) * reach * (0.55 + rnd(index, 3) * 0.15),
      size: 18 + rnd(index, 4) * 26,
      rot0: (rnd(index, 5) - 0.5) * 30,
      rot1: (rnd(index, 6) - 0.5) * 120,
      grow: 1.3 + rnd(index, 7) * 0.6,
      duration: 900 + rnd(index, 8) * 300,
    };
  }, [index, reach]);
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withDelay(LAUGH_START + index * LAUGH_EVERY, withTiming(1, { duration: p.duration, easing: Easing.out(Easing.quad) }));
  }, [t, index, p.duration]);
  const style = useAnimatedStyle(() => ({
    opacity: t.value === 0 ? 0 : t.value > 0.8 ? (1 - t.value) / 0.2 : Math.min(1, t.value * 8),
    transform: [
      { translateX: p.dx * t.value },
      { translateY: p.dy * t.value },
      { rotate: `${p.rot0 + (p.rot1 - p.rot0) * t.value}deg` },
      { scale: 0.3 + (p.grow - 0.3) * Math.min(1, t.value * 1.5) },
    ],
  }));
  return (
    <Animated.Text
      style={[styles.laugh, { fontSize: p.size, color: LAUGH_COLORS[index % LAUGH_COLORS.length] }, style]}>
      {LAUGHS[index % LAUGHS.length]}
    </Animated.Text>
  );
}

export function AnimatedSplash({ onDone }: { onDone: () => void }) {
  const reduce = useReducedMotion();
  const { width, height } = useWindowDimensions();
  const reach = Math.hypot(width, height);
  const mouth = useSharedValue(1);
  const squash = useSharedValue(1);
  const bounce = useSharedValue(0);
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
    // Fou rire : la bouche se ferme et s'ouvre en grand plusieurs fois, le b sautille et se secoue.
    const half = LAUGH_CYCLE / 2;
    mouth.value = withDelay(LAUGH_START, withRepeat(withSequence(
      withTiming(0.15, { duration: half * 0.8, easing: Easing.in(Easing.quad) }),
      withTiming(1, { duration: half * 1.2, easing: Easing.out(Easing.back(3)) }),
    ), LAUGH_CYCLES));
    bounce.value = withDelay(LAUGH_START, withSequence(
      withRepeat(withSequence(withTiming(1, { duration: half * 0.8 }), withTiming(-1, { duration: half * 1.2, easing: Easing.out(Easing.quad) })), LAUGH_CYCLES),
      withTiming(0, { duration: 150 }),
    ));
    squash.value = withDelay(LAUGH_START + LAUGH_CYCLE * LAUGH_CYCLES, withSpring(1.05, { damping: 8 }));
    // Zoom-through reveal, once the laughs have flown across the screen.
    zoom.value = withDelay(
      LAUGH_START + LAUGH_CYCLE * LAUGH_CYCLES + 200,
      withTiming(14, { duration: 520, easing: Easing.in(Easing.exp) }, (ok) => ok && runOnJS(finish)()),
    );
  }, [reduce, mouth, squash, bounce, zoom, fade, onDone]);

  const markStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: bounce.value * -6 }, { rotate: `${bounce.value * -4}deg` }, { scale: squash.value * zoom.value }],
  }));
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
      {/* Devant le b : les rires jaillissent de sa bouche. */}
      {!reduce && Array.from({ length: LAUGH_COUNT }, (_, i) => <FlyingLaugh key={i} index={i} reach={reach} />)}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', zIndex: 100, overflow: 'hidden' },
  // Centré sur le b (le conteneur centre ses enfants) ; position absolue pour que les rires ne poussent pas le logo.
  laugh: { position: 'absolute', fontFamily: fonts.display, letterSpacing: -0.4, textShadowColor: 'rgba(0,0,0,0.35)', textShadowOffset: { width: 0, height: 3 }, textShadowRadius: 10 },
});
