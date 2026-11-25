import { router } from 'expo-router';
import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { cancelAnimation, Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withRepeat, withSequence, withTiming } from 'react-native-reanimated';

import { AppText } from '@/components/AppText';
import { tap } from '@/components/haptics';
import { Bell } from '@/components/icons';
import { PressableScale } from '@/components/PressableScale';
import { useStore } from '@/data/store';
import { colors } from '@/theme/tokens';

/** Cloche des notifications, en haut à droite de chaque écran, avec le nombre de non lues (« 99+ » au-delà). Rien sans compte. */
export function NotificationBell() {
  const { notifications, session } = useStore();
  const unread = notifications.filter((n) => !n.read).length;
  const reduce = useReducedMotion();
  // Non lues : la cloche remue (un petit « dring » toutes les 4 s) ; elle repart à chaque nouvelle notification.
  const angle = useSharedValue(0);
  useEffect(() => {
    if (!unread || reduce) { cancelAnimation(angle); angle.value = withTiming(0, { duration: 120 }); return; }
    const step = (deg: number) => withTiming(deg, { duration: 110, easing: Easing.inOut(Easing.quad) });
    angle.value = withRepeat(withSequence(step(18), step(-16), step(13), step(-10), step(6), step(-3), step(0), withDelay(3200, withTiming(0, { duration: 1 }))), -1);
  }, [unread, reduce, angle]);
  const ring = useAnimatedStyle(() => ({ transform: [{ translateY: -10 }, { rotate: `${angle.value}deg` }, { translateY: 10 }] }));
  if (!session) return null;
  return (
    <PressableScale
      onPress={() => { tap(); router.push('/notifications'); }}
      accessibilityRole="button"
      accessibilityLabel={unread ? `Notifications, ${unread} non lue${unread > 1 ? 's' : ''}` : 'Notifications'}
      hitSlop={8}
      style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
      <View>
        <Animated.View style={ring}><Bell size={24} color={colors.text} strokeWidth={2} /></Animated.View>
        {unread > 0 && (
          <View style={{ position: 'absolute', top: -6, left: 13, minWidth: 18, height: 18, paddingHorizontal: 4, borderRadius: 9, backgroundColor: colors.brand, borderWidth: 2, borderColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
            <AppText style={{ fontSize: 10, lineHeight: 12, fontFamily: 'Figtree_700Bold' }} color="#fff">{unread > 99 ? '99+' : unread}</AppText>
          </View>
        )}
      </View>
    </PressableScale>
  );
}
