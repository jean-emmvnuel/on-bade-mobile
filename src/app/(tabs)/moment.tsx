import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, View, Pressable } from 'react-native';
import Animated, { FadeInDown, useAnimatedScrollHandler, useReducedMotion, useSharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/AppText';
import { NotificationBell } from '@/components/NotificationBell';
import { BadingCard } from '@/components/BadingCard';
import { useBadingActions } from '@/components/BadingActions';
import { Button } from '@/components/Button';
import { Flame, Search } from '@/components/icons';
import { PullToRefresh } from '@/components/PullToRefresh';
import { useToast } from '@/components/Toast';
import { momentOf, useStore } from '@/data/store';
import type { Bading } from '@/data/types';
import { errorMessage } from '@/lib/api';
import { colors, space } from '@/theme/tokens';

const HEADER = 56;
const LIMIT = 20;

/**
 * Onglet « Du moment » (comme #/trending sur le site) : les badings les plus drôles du fil,
 * classés par rires. Même chargement que le fil ; le classement est fait dans l'app.
 */
export default function Moment() {
  const insets = useSafeAreaInsets();
  const reduce = useReducedMotion();
  const { feed, loadFeed, refreshFeed } = useStore();
  const toast = useToast();
  const { open, sheet } = useBadingActions();
  const list = useMemo(() => momentOf(feed, LIMIT), [feed]);
  const [loading, setLoading] = useState(feed.length === 0);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let alive = true;
    loadFeed()
      .catch((e) => { if (alive) setLoadError(errorMessage(e, 'Les badings du moment n’ont pas pu être chargés.')); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [loadFeed, attempt]);

  const scrollY = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((e) => { scrollY.value = e.contentOffset.y; });

  const refresh = useCallback(async () => {
    try {
      const n = await refreshFeed();
      setLoadError(null);
      return n;
    } catch (e) {
      toast(errorMessage(e, 'Le classement n’a pas pu être actualisé.'));
      return 0;
    }
  }, [refreshFeed, toast]);

  const renderItem = useCallback(
    ({ item, index }: { item: Bading; index: number }) =>
      index < 6 && !reduce ? (
        <Animated.View entering={FadeInDown.duration(350).delay(index * 40)}>
          <BadingCard b={item} onMore={open} />
        </Animated.View>
      ) : (
        <BadingCard b={item} onMore={open} />
      ),
    [open, reduce],
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      {loading ? (
        <View style={{ paddingTop: insets.top + HEADER + space.xxl, alignItems: 'center' }}>
          <ActivityIndicator color={colors.text2} accessibilityLabel="Chargement des badings du moment" />
        </View>
      ) : (
        <PullToRefresh onRefresh={refresh} scrollY={scrollY} top={insets.top + HEADER}>
          <Animated.FlatList
            data={list}
            keyExtractor={(b) => b.id}
            renderItem={renderItem}
            onScroll={onScroll}
            scrollEventThrottle={16}
            contentContainerStyle={{ paddingTop: insets.top + HEADER, paddingBottom: 24 }}
            bounces={false}
            overScrollMode="never"
            initialNumToRender={8}
            ListHeaderComponent={list.length ? (
              <AppText variant="meta" color={colors.text2} style={{ paddingHorizontal: space.lg, paddingTop: space.md }}>
                Les plus drôles du fil, classés par rires.
              </AppText>
            ) : undefined}
            ListEmptyComponent={
              loadError ? (
                <View style={{ padding: space.xxl, gap: space.lg, alignItems: 'flex-start' }}>
                  <AppText variant="title">Le classement n’a pas pu se charger.</AppText>
                  <AppText variant="body" color={colors.text2}>{loadError}</AppText>
                  <Button label="Réessayer" kind="secondary" onPress={() => { setLoadError(null); setLoading(true); setAttempt((n) => n + 1); }} />
                </View>
              ) : (
                <View style={{ padding: space.xxl, gap: space.lg, alignItems: 'flex-start' }}>
                  <AppText variant="title">Rien qui fait rire pour l’instant</AppText>
                  <AppText variant="body" color={colors.text2}>Les badings qui reçoivent le plus de rires apparaîtront ici.</AppText>
                  <Button label="Voir le fil" kind="secondary" onPress={() => router.navigate('/(tabs)')} />
                </View>
              )
            }
          />
        </PullToRefresh>
      )}

      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, paddingTop: insets.top, backgroundColor: colors.bg, borderBottomWidth: 1, borderBottomColor: colors.line }}>
        <View style={{ height: HEADER, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: space.lg }}>
          <Flame size={22} color={colors.brandInk} strokeWidth={2.2} />
          <AppText variant="heading" style={{ fontSize: 22, flex: 1 }} accessibilityRole="header">Badings du moment</AppText>
          <Pressable onPress={() => router.push('/search')} accessibilityRole="button" accessibilityLabel="Rechercher" hitSlop={6} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
            <Search size={22} color={colors.text} />
          </Pressable>
          <NotificationBell />
        </View>
      </View>
      {sheet}
    </View>
  );
}
