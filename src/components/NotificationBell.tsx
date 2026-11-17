import { router } from 'expo-router';
import { View } from 'react-native';

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
  if (!session) return null;
  return (
    <PressableScale
      onPress={() => { tap(); router.push('/notifications'); }}
      accessibilityRole="button"
      accessibilityLabel={unread ? `Notifications, ${unread} non lue${unread > 1 ? 's' : ''}` : 'Notifications'}
      hitSlop={8}
      style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
      <View>
        <Bell size={24} color={colors.text} strokeWidth={2} />
        {unread > 0 && (
          <View style={{ position: 'absolute', top: -6, left: 13, minWidth: 18, height: 18, paddingHorizontal: 4, borderRadius: 9, backgroundColor: colors.brand, borderWidth: 2, borderColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
            <AppText style={{ fontSize: 10, lineHeight: 12, fontFamily: 'Figtree_700Bold' }} color="#fff">{unread > 99 ? '99+' : unread}</AppText>
          </View>
        )}
      </View>
    </PressableScale>
  );
}
