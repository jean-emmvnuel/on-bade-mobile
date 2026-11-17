import type { ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

/**
 * Bulle de récit : l'identité visuelle d'On Bade (un bading = une bulle arrondie et sobre,
 * avec une petite queue sous l'auteur). Les badings anonymes ont une bulle un peu plus sombre.
 */
export const BUBBLE = {
  bg: '#222121', bgPressed: '#2B2929', border: '#333131',
  anonBg: '#1E1D1D', anonPressed: '#262424', anonBorder: '#333131',
  radius: 28,
};

export function bubbleStyle(anonymous: boolean, pressed = false): ViewStyle {
  return {
    backgroundColor: anonymous ? (pressed ? BUBBLE.anonPressed : BUBBLE.anonBg) : pressed ? BUBBLE.bgPressed : BUBBLE.bg,
    borderColor: anonymous ? BUBBLE.anonBorder : BUBBLE.border,
    borderWidth: 1,
    borderRadius: BUBBLE.radius,
  };
}

/** Petite pointe en bas à gauche de la bulle. */
export function BubbleTail({ anonymous, pressed = false, left = 28 }: { anonymous: boolean; pressed?: boolean; left?: number }) {
  const s = bubbleStyle(anonymous, pressed);
  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute', left, bottom: -9, width: 18, height: 18, transform: [{ rotate: '45deg' }],
        backgroundColor: s.backgroundColor, borderRightWidth: 1, borderBottomWidth: 1, borderColor: s.borderColor, borderBottomRightRadius: 5,
      }}
    />
  );
}

export function Bubble({ anonymous, children, style }: { anonymous: boolean; children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[bubbleStyle(anonymous), style]}>
      {children}
      <BubbleTail anonymous={anonymous} />
    </View>
  );
}
