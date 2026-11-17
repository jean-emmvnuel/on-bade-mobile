import { forwardRef, useImperativeHandle, useMemo } from 'react';
import { View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { colors } from '@/theme/tokens';

const PALETTE = [colors.brand, colors.brandInk, '#FFC93C', '#FF6FA8', colors.success, colors.lilac];
const COUNT = 18;
const GRAVITY = 260; // px per (animation unit)²
const DURATION = 950;

type Piece = { vx: number; vy: number; spin: number; color: string; w: number; h: number; round: boolean };

function makePieces(): Piece[] {
  return Array.from({ length: COUNT }, (_, i) => {
    // Fan upward: angles between -160° and -20°, a few stragglers to the sides.
    const angle = (-160 + (140 * i) / (COUNT - 1) + (Math.random() * 16 - 8)) * (Math.PI / 180);
    const speed = 70 + Math.random() * 70;
    const round = i % 4 === 0;
    return {
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      spin: (Math.random() * 2 - 1) * 720,
      color: PALETTE[i % PALETTE.length],
      w: round ? 6 : 4 + Math.random() * 3,
      h: round ? 6 : 8 + Math.random() * 4,
      round,
    };
  });
}

function Confetto({ p, t }: { p: Piece; t: SharedValue<number> }) {
  const style = useAnimatedStyle(() => {
    const k = t.value;
    return {
      opacity: k === 0 ? 0 : k < 0.7 ? 1 : 1 - (k - 0.7) / 0.3,
      transform: [
        { translateX: p.vx * k },
        { translateY: p.vy * k + 0.5 * GRAVITY * k * k },
        { rotate: `${p.spin * k}deg` },
        // Paper flutter: flips on one axis as it falls.
        { scaleX: p.round ? 1 : Math.cos(k * 14 + p.spin) },
      ],
    };
  });
  return (
    <Animated.View
      style={[
        { position: 'absolute', left: -p.w / 2, top: -p.h / 2, width: p.w, height: p.h, borderRadius: p.round ? p.w / 2 : 1.5, backgroundColor: p.color },
        style,
      ]}
    />
  );
}

export type ConfettiHandle = { burst: () => void };

/** A confetti burst centred on its parent position. Call `ref.current.burst()`. */
export const Confetti = forwardRef<ConfettiHandle>(function Confetti(_, ref) {
  const reduce = useReducedMotion();
  const t = useSharedValue(0);
  // New random shapes each mount; re-bursting reuses them (cheap, still feels lively).
  const pieces = useMemo(makePieces, []);

  useImperativeHandle(ref, () => ({
    burst: () => {
      if (reduce) return;
      t.value = 0;
      t.value = withTiming(1, { duration: DURATION, easing: Easing.out(Easing.quad) });
    },
  }));

  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: '50%', top: '50%', width: 0, height: 0, zIndex: 10, overflow: 'visible' }}>
      {pieces.map((p, i) => (
        <Confetto key={i} p={p} t={t} />
      ))}
    </View>
  );
});
