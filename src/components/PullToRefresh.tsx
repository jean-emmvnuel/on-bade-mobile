import { useRef, useState, type ReactElement } from 'react';
import { View } from 'react-native';
import { GestureDetector, useNativeGesture, usePanGesture } from 'react-native-gesture-handler';
import Animated, {
  cancelAnimation,
  Easing,
  interpolate,
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { colors } from '@/theme/tokens';

import { AppText } from './AppText';
import { Confetti, type ConfettiHandle } from './Confetti';
import { success, tap } from './haptics';
import { LaughingMark } from './LaughingMark';

const TRIGGER = 84; // pull distance that arms the refresh
const HOLD = 92; // height kept open while loading
const MAX = 150; // rubber-band ceiling

type Phase = 'pull' | 'release' | 'loading' | 'done' | 'empty';

const LABELS: Record<Phase, string> = {
  pull: 'Tire pour voir les nouveaux badings',
  release: 'Lâche, ça va bader !',
  loading: 'On ramène les badings…',
  done: 'Nouveaux badings !',
  empty: "C'est à jour, rien de neuf",
};

type Props = {
  /** Resolves with the number of new items (0 = nothing new). */
  onRefresh: () => Promise<number>;
  /** List scroll offset, fed by the list's animated scroll handler. */
  scrollY: SharedValue<number>;
  /** Space above the list content (e.g. under a floating header). */
  top: number;
  children: ReactElement;
};

/**
 * Brand pull-to-refresh: the laughing b appears and opens its mouth as you pull,
 * laughs in a loop while loading, and pops confetti when new badings land.
 */
export function PullToRefresh({ onRefresh, scrollY, top, children }: Props) {
  const reduce = useReducedMotion();
  const pull = useSharedValue(0);
  const base = useSharedValue<number | null>(null);
  const busy = useSharedValue(false);
  const laugh = useSharedValue(0);
  const bob = useSharedValue(0);
  const [phase, setPhase] = useState<Phase>('pull');
  const confetti = useRef<ConfettiHandle>(null);

  const finish = (count: number) => {
    setPhase(count > 0 ? 'done' : 'empty');
    if (count > 0) {
      success();
      confetti.current?.burst();
    }
    cancelAnimation(laugh);
    cancelAnimation(bob);
    bob.value = withTiming(0, { duration: 150 });
    laugh.value = withSpring(count > 0 ? 1 : 0.4);
    setTimeout(() => {
      pull.value = withSpring(0, { damping: 18, stiffness: 180 }, () => {
        busy.value = false;
        runOnJS(setPhase)('pull');
      });
    }, 700);
  };

  const start = () => {
    setPhase('loading');
    tap();
    if (!reduce) {
      // "Ha ha ha": mouth snaps open/closed while the mark bobs.
      laugh.value = withRepeat(withSequence(withTiming(1, { duration: 140 }), withTiming(0.25, { duration: 140 })), -1);
      bob.value = withRepeat(withTiming(1, { duration: 280, easing: Easing.inOut(Easing.sin) }), -1, true);
    }
    onRefresh().then(finish, () => finish(0));
  };

  // Haptic + label when the pull crosses the threshold, both ways.
  useAnimatedReaction(
    () => !busy.value && pull.value >= TRIGGER,
    (armed, prev) => {
      if (prev === null || armed === prev || busy.value) return;
      runOnJS(setPhase)(armed ? 'release' : 'pull');
      if (armed) runOnJS(tap)();
    },
  );

  const native = useNativeGesture({});
  const pan = usePanGesture({
    simultaneousWith: native,
    activeOffsetY: 8,
    onUpdate: (e) => {
      'worklet';
      if (busy.value) return;
      if (scrollY.value > 1) {
        base.value = null;
        return;
      }
      if (base.value === null) base.value = e.translationY;
      const d = Math.max(0, e.translationY - base.value);
      pull.value = MAX * (1 - Math.exp(-d / 190));
    },
    onFinalize: () => {
      'worklet';
      base.value = null;
      if (busy.value) return;
      if (pull.value >= TRIGGER) {
        busy.value = true;
        pull.value = withSpring(HOLD, { damping: 16, stiffness: 200 });
        runOnJS(start)();
      } else {
        pull.value = withSpring(0, { damping: 18, stiffness: 220 });
      }
    },
  });

  const shift = useAnimatedStyle(() => ({ transform: [{ translateY: pull.value }] }));
  const indicator = useAnimatedStyle(() => {
    const p = Math.min(1, pull.value / TRIGGER);
    return {
      opacity: interpolate(pull.value, [8, 40], [0, 1], 'clamp'),
      transform: [
        { translateY: pull.value / 2 - 46 - bob.value * 4 },
        { scale: interpolate(p, [0, 1], [0.5, 1]) * (pull.value > TRIGGER && !busy.value ? 1 + (pull.value - TRIGGER) / 300 : 1) },
        { rotate: `${(1 - p) * -18}deg` },
      ],
    };
  });
  // Mouth follows the pull until loading takes over.
  const open = useSharedValue(0);
  useAnimatedReaction(
    () => (busy.value ? laugh.value : Math.min(1, pull.value / TRIGGER)),
    (v) => {
      open.value = v;
    },
  );

  return (
    <View style={{ flex: 1 }}>
      <Animated.View pointerEvents="none" style={[{ position: 'absolute', top, left: 0, right: 0, alignItems: 'center', gap: 8 }, indicator]}>
        <View>
          <LaughingMark size={44} open={open} />
          <Confetti ref={confetti} />
        </View>
        <AppText variant="small" color={phase === 'done' ? colors.brandInk : colors.text2} accessibilityLiveRegion="polite">
          {LABELS[phase]}
        </AppText>
      </Animated.View>
      <GestureDetector gesture={pan}>
        <Animated.View style={[{ flex: 1 }, shift]}>
          <GestureDetector gesture={native}>{children}</GestureDetector>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}
