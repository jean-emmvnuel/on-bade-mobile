import { useEffect } from 'react';
import { Pressable } from 'react-native';
import Animated, { interpolateColor, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { colors } from '@/theme/tokens';

import { tap } from './haptics';

export function Toggle({ value, onChange, label }: { value: boolean; onChange: (v: boolean) => void; label: string }) {
  const p = useSharedValue(value ? 1 : 0);
  useEffect(() => {
    p.value = withSpring(value ? 1 : 0, { damping: 16, stiffness: 240 });
  }, [value, p]);
  const track = useAnimatedStyle(() => ({ backgroundColor: interpolateColor(p.value, [0, 1], [colors.line, colors.brand]) }));
  const knob = useAnimatedStyle(() => ({ transform: [{ translateX: p.value * 20 }] }));
  return (
    <Pressable onPress={() => { tap(); onChange(!value); }} accessibilityRole="switch" accessibilityLabel={label} accessibilityState={{ checked: value }} hitSlop={10} style={{ minHeight: 44, justifyContent: 'center' }}>
      <Animated.View style={[{ width: 48, height: 28, borderRadius: 14, padding: 3 }, track]}>
        <Animated.View style={[{ width: 22, height: 22, borderRadius: 11, backgroundColor: '#fff' }, knob]} />
      </Animated.View>
    </Pressable>
  );
}
