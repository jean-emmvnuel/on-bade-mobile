import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSpring } from 'react-native-reanimated';

// Appui : réponse immédiate et sans rebond ; relâchement : ressort amorti (apple-design).
const PRESS = { dampingRatio: 1, duration: 140 } as const;
const RELEASE = { dampingRatio: 0.9, duration: 300 } as const;

const APressable = Animated.createAnimatedComponent(Pressable);

type Props = PressableProps & { style?: StyleProp<ViewStyle>; scaleTo?: number };

/** Pressable with a quick spring scale — the app's standard press feedback. */
export function PressableScale({ style, scaleTo = 0.96, onPressIn, onPressOut, ...rest }: Props) {
  const reduce = useReducedMotion();
  const s = useSharedValue(1);
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));
  return (
    <APressable
      {...rest}
      onPressIn={(e) => {
        if (!reduce) s.value = withSpring(scaleTo, PRESS);
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        s.value = withSpring(1, RELEASE);
        onPressOut?.(e);
      }}
      style={[style, anim]}
    />
  );
}
