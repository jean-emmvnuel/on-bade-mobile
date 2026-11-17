import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { Redirect, router, Tabs } from 'expo-router';
import { Flame, House, Plus, Trophy, UserRound } from '@/components/icons';
import { useEffect } from 'react';
import { Platform, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/AppText';
import { tap } from '@/components/haptics';
import { PressableScale } from '@/components/PressableScale';
import { useStore } from '@/data/store';
import { listenToIncomingNotifications } from '@/lib/notifications';
import { colors, radius } from '@/theme/tokens';

// Les notifications ne sont plus un onglet : cloche en haut à droite du fil (NotificationBell).
function TabBar({ state, navigateToTab }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const current = state.routes[state.index]?.name;

  const Item = ({ name, label, Icon, badge = 0 }: { name: string; label: string; Icon: typeof House; badge?: number }) => {
    const active = current === name;
    return (
      <PressableScale
        accessibilityRole="tab"
        accessibilityLabel={badge ? `${label}, ${badge} non lues` : label}
        accessibilityState={{ selected: active }}
        onPress={() => { tap(); const r = state.routes.find((x) => x.name === name); if (r) navigateToTab(r.key); }}
        style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3, minHeight: 52 }}>
        <View>
          <Icon size={24} color={active ? colors.text : colors.text3} strokeWidth={active ? 2.4 : 1.8} />
          {badge > 0 && (
            <View style={{ position: 'absolute', top: -5, left: 14, minWidth: 18, height: 18, paddingHorizontal: 4, borderRadius: 9, backgroundColor: colors.brand, borderWidth: 2, borderColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
              <AppText style={{ fontSize: 10, lineHeight: 12, fontFamily: 'Figtree_700Bold' }} color="#fff">{badge}</AppText>
            </View>
          )}
        </View>
        <AppText variant="small" color={active ? colors.text : colors.text3}>{label}</AppText>
      </PressableScale>
    );
  };

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.bg, borderTopWidth: 1, borderTopColor: colors.line, paddingBottom: Math.max(insets.bottom, 8), paddingTop: 6, paddingHorizontal: 6 }}>
      <Item name="index" label="Fil" Icon={House} />
      <Item name="moment" label="Du moment" Icon={Flame} />
      <View style={{ flex: 1.3, alignItems: 'center' }}>
        <PressableScale
          scaleTo={0.92}
          accessibilityRole="button"
          accessibilityLabel="Bader : écrire un bading"
          onPress={() => { tap(); router.push('/compose'); }}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 6, height: 46, paddingHorizontal: 16, borderRadius: radius.pill, backgroundColor: colors.brand, shadowColor: colors.brand, shadowOpacity: 0.45, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 6 }}>
          <Plus size={20} color={colors.onBrand} strokeWidth={2.6} />
          <AppText variant="label" color={colors.onBrand}>Bader</AppText>
        </PressableScale>
      </View>
      <Item name="classement" label="Classement" Icon={Trophy} />
      <Item name="profile" label="Profil" Icon={UserRound} />
    </View>
  );
}

export default function TabsLayout() {
  const { session, loadNotifications, loadSettings, loadStickers, enablePush } = useStore();
  const signedIn = !!session;
  // First arrival in the app after sign-up: ask for notifications (likes, comments, replies, mentions).
  useEffect(() => {
    if (signedIn && Platform.OS !== 'web') void enablePush();
  }, [signedIn, enablePush]);
  // Push reçu pendant que l'app est ouverte : la liste et la pastille se mettent à jour.
  useEffect(() => {
    if (!signedIn || Platform.OS === 'web') return;
    return listenToIncomingNotifications(() => { loadNotifications().catch(() => {}); });
  }, [signedIn, loadNotifications]);
  // Une fois connecté : notifications (pastille « non lues »), réglages (comptes bloqués) et stickers.
  // Un échec ici ne gêne pas : chaque écran recharge ce dont il a besoin.
  useEffect(() => {
    if (!signedIn) return;
    loadNotifications().catch(() => {});
    loadSettings().catch(() => {});
    loadStickers().catch(() => {});
  }, [signedIn, loadNotifications, loadSettings, loadStickers]);
  if (!session) return <Redirect href="/" />;
  return (
    <Tabs tabBar={(p) => <TabBar {...p} />} screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.bg }, animation: 'fade' }}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="moment" />
      <Tabs.Screen name="classement" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}
