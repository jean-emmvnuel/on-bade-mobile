import { router, useFocusEffect } from 'expo-router';
import { AtSign, BadgeCheck, Laugh, MessageCircle, Repeat2 } from '@/components/icons';
import { useCallback } from 'react';
import { FlatList, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { AppText } from '@/components/AppText';
import { Avatar } from '@/components/Avatar';
import { timeAgo, useStore } from '@/data/store';
import type { AppNotification } from '@/data/types';
import { colors, space } from '@/theme/tokens';

export default function Notifications() {
  const { notifications, users, getBading, markAllRead, loadNotifications, badge } = useStore();
  const insets = useSafeAreaInsets();
  // À chaque ouverture de l'onglet : liste à jour, puis tout passe en « lu » peu après.
  useFocusEffect(
    useCallback(() => {
      let t: ReturnType<typeof setTimeout> | undefined;
      let alive = true;
      loadNotifications()
        .catch(() => {})
        .finally(() => { if (alive) t = setTimeout(markAllRead, 1200); });
      return () => { alive = false; clearTimeout(t); };
    }, [loadNotifications, markAllRead]),
  );

  const describe = (n: AppNotification) => {
    const actor = n.actorId ? users[n.actorId]?.pseudo : null;
    switch (n.kind) {
      case 'like':
        return { Icon: Laugh, text: `${actor}${n.others ? ` et ${n.others} autres ont` : ' a'} ri à ton bading` };
      case 'rebade':
        return { Icon: Repeat2, text: `${actor ?? 'Un Badeur anonyme'} a rebadé ton bading` };
      case 'mention':
        // RG6 (F4): anonymous mention never reveals the author.
        return { Icon: AtSign, text: `${actor ?? 'Un Badeur anonyme'} t'a mentionné` };
      case 'comment':
        return { Icon: MessageCircle, text: `${actor} a commenté ton bading` };
      case 'reply':
        return { Icon: MessageCircle, text: `${actor} a répondu à ton commentaire` };
      case 'badge':
        return { Icon: BadgeCheck, text: n.badgeStatus === 'granted' ? 'L’équipe On Bade t’a attribué le badge vérifié' : n.badgeStatus === 'accepted' ? 'Ta demande de badge vérifié est acceptée' : `Ta demande de badge vérifié est refusée${badge.reason ? ` : ${badge.reason}` : ''}.` };
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* Onglet de la barre du bas : un titre simple, sans bouton retour */}
      <View style={{ paddingTop: insets.top, borderBottomWidth: 1, borderBottomColor: colors.line }}>
        <View style={{ height: 56, justifyContent: 'center', paddingHorizontal: space.lg }}>
          <AppText variant="heading" style={{ fontSize: 22 }} accessibilityRole="header">Notifications</AppText>
        </View>
      </View>
      <FlatList
        data={notifications}
        keyExtractor={(n) => n.id}
        renderItem={({ item: n, index }) => {
          const { Icon, text } = describe(n);
          const b = n.badingId ? getBading(n.badingId) : undefined;
          return (
            <Animated.View entering={FadeInDown.duration(300).delay(index * 40)}>
              <Pressable
                onPress={() => (n.badingId ? router.push(`/bading/${n.badingId}`) : router.push('/settings'))}
                style={({ pressed }) => ({ flexDirection: 'row', gap: space.md, padding: space.lg, borderBottomWidth: 1, borderBottomColor: colors.line, backgroundColor: pressed ? colors.surface : n.read ? colors.bg : 'rgba(152,16,230,0.07)' })}>
                <View style={{ width: 44, alignItems: 'flex-end' }}>
                  <Icon size={26} color={n.kind === 'badge' && n.badgeStatus === 'refused' ? colors.text2 : colors.brandInk} />
                </View>
                <View style={{ flex: 1, gap: 6 }}>
                  {n.kind !== 'badge' && <Avatar user={n.actorId ? users[n.actorId] ?? null : null} size={32} />}
                  <AppText variant="body">
                    {text} <AppText variant="meta" color={colors.text3}>· {timeAgo(n.createdAt)}</AppText>
                  </AppText>
                  {b && <AppText variant="meta" color={colors.text2} numberOfLines={2}>{b.text}</AppText>}
                </View>
                {!n.read && <View accessibilityLabel="Non lue" style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.brand, marginTop: 8 }} />}
              </Pressable>
            </Animated.View>
          );
        }}
        ListEmptyComponent={<AppText variant="body" color={colors.text2} style={{ padding: space.xl }}>Rien de neuf. Quand quelqu'un rit à tes badings, tu le verras ici.</AppText>}
      />
    </View>
  );
}
