import { Laugh } from '@/components/icons';
import { useRef } from 'react';
import { View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { compact } from '@/data/store';
import { colors } from '@/theme/tokens';

import { AppText } from './AppText';
import { Confetti, type ConfettiHandle } from './Confetti';
import { tap } from './haptics';
import { PressableScale } from './PressableScale';

/** "Ça m'a fait rire" — the V1 like. Spring pop + confetti burst when it turns on. */
export function LaughButton({ active, count, onToggle }: { active: boolean; count: number; onToggle: () => void }) {
  const reduce = useReducedMotion();
  const scale = useSharedValue(1);
  const confetti = useRef<ConfettiHandle>(null);
  const iconStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }, { rotate: `${(scale.value - 1) * -40}deg` }] }));

  const press = () => {
    tap();
    if (!active && !reduce) {
      scale.value = withSequence(withTiming(1.35, { duration: 120 }), withSpring(1, { damping: 8, stiffness: 260 }));
      confetti.current?.burst();
    }
    onToggle();
  };

  return (
    <PressableScale
      onPress={press}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={active ? `Retirer mon rire, ${count} rires` : `Rire, ${count} rires`}
      accessibilityState={{ selected: active }}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 44, minWidth: 64, zIndex: 5 }}>
      <View style={{ width: 24, height: 24, alignItems: 'center', justifyContent: 'center', zIndex: 5 }}>
        <Confetti ref={confetti} />
        <Animated.View style={iconStyle}>
          <Laugh size={21} color={active ? colors.brandInk : colors.text2} fill={active ? colors.brandSoft : 'transparent'} strokeWidth={active ? 2.3 : 1.8} />
        </Animated.View>
      </View>
      <AppText variant="meta" color={active ? colors.brandInk : colors.text2} style={{ fontVariant: ['tabular-nums'] }}>
        {compact(count)}
      </AppText>
    </PressableScale>
  );
}
