import { useState } from 'react';
import { TextInput, View, type TextInputProps } from 'react-native';

import { colors, fonts, radius } from '@/theme/tokens';

import { AppText } from './AppText';

type Props = TextInputProps & { label: string; error?: string | null; hint?: string; prefix?: string; right?: React.ReactNode };

export function Field({ label, error, hint, prefix, right, style, onFocus, onBlur, ...rest }: Props) {
  const [focused, setFocused] = useState(false);
  const border = error ? colors.danger : focused ? colors.brandInk : colors.line;
  return (
    <View style={{ gap: 8 }}>
      <AppText variant="label" color={colors.text2} nativeID={`${label}-label`}>{label}</AppText>
      <View style={{ flexDirection: 'row', alignItems: 'center', height: 56, borderRadius: radius.md, borderWidth: focused || error ? 2 : 1, borderColor: border, backgroundColor: colors.surface, paddingHorizontal: focused || error ? 15 : 16, gap: 10 }}>
        {prefix && <AppText variant="bodyStrong" color={colors.text2}>{prefix}</AppText>}
        <TextInput
          {...rest}
          aria-labelledby={`${label}-label`}
          placeholderTextColor={colors.text3}
          selectionColor={colors.brandInk}
          cursorColor={colors.brandInk}
          onFocus={(e) => { setFocused(true); onFocus?.(e); }}
          onBlur={(e) => { setFocused(false); onBlur?.(e); }}
          style={[{ flex: 1, height: '100%', color: colors.text, fontFamily: fonts.bodyMedium, fontSize: 17 }, style]}
        />
        {right}
      </View>
      {error ? (
        <AppText variant="small" color={colors.danger} accessibilityLiveRegion="polite">{error}</AppText>
      ) : hint ? (
        <AppText variant="small" color={colors.text3}>{hint}</AppText>
      ) : null}
    </View>
  );
}
