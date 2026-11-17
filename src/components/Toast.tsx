import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { setStoreErrorReporter } from '@/data/store';
import { errorMessage } from '@/lib/api';
import { colors, radius } from '@/theme/tokens';

import { AppText } from './AppText';

const Ctx = createContext<(msg: string) => void>(() => {});

/** Snackbar-style transient feedback. */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  const [msg, setMsg] = useState<{ id: number; text: string } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const show = useCallback((text: string) => {
    clearTimeout(timer.current);
    setMsg({ id: Date.now(), text });
    timer.current = setTimeout(() => setMsg(null), 2600);
  }, []);
  // Les actions du store qui échouent en arrière-plan (rire, favori…) s'affichent ici.
  useEffect(() => setStoreErrorReporter((e) => show(errorMessage(e))), [show]);
  return (
    <Ctx.Provider value={show}>
      {children}
      <View pointerEvents="none" style={{ position: 'absolute', left: 16, right: 16, bottom: insets.bottom + 92, alignItems: 'center' }}>
        {msg && (
          <Animated.View key={msg.id} entering={FadeInDown.duration(260)} exiting={FadeOutDown.duration(180)} accessibilityLiveRegion="polite" style={{ backgroundColor: colors.text, borderRadius: radius.md, paddingHorizontal: 16, paddingVertical: 12, maxWidth: 440 }}>
            <AppText variant="label" color={colors.bg}>{msg.text}</AppText>
          </Animated.View>
        )}
      </View>
    </Ctx.Provider>
  );
}

export const useToast = () => useContext(Ctx);
