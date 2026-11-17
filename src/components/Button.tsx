import { ActivityIndicator, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, radius } from '@/theme/tokens';

import { AppText } from './AppText';
import { PressableScale } from './PressableScale';

type Kind = 'primary' | 'secondary' | 'ghost' | 'light';

const kinds: Record<Kind, { bg: string; fg: string; border?: string }> = {
  primary: { bg: colors.brand, fg: colors.onBrand },
  secondary: { bg: colors.surface2, fg: colors.text, border: colors.line },
  ghost: { bg: 'transparent', fg: colors.text },
  light: { bg: colors.text, fg: colors.bg },
};

type Props = {
  label: string;
  onPress?: () => void;
  kind?: Kind;
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  size?: 'md' | 'lg';
};

export function Button({ label, onPress, kind = 'primary', disabled, loading, icon, style, size = 'lg' }: Props) {
  const k = kinds[kind];
  const inactive = disabled || loading;
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!inactive, busy: !!loading }}
      disabled={inactive}
      onPress={onPress}
      style={[
        {
          height: size === 'lg' ? 56 : 44,
          paddingHorizontal: size === 'lg' ? 24 : 18,
          borderRadius: radius.pill,
          backgroundColor: k.bg,
          borderWidth: k.border ? 1 : 0,
          borderColor: k.border,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: disabled ? 0.45 : 1,
        },
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={k.fg} />
      ) : (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {icon}
          <AppText variant="label" color={k.fg} style={size === 'lg' ? { fontSize: 16 } : undefined}>
            {label}
          </AppText>
        </View>
      )}
    </PressableScale>
  );
}
