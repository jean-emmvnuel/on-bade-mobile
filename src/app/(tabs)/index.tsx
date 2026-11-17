import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import Animated, {
  FadeInDown,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';

import { AppText } from '@/components/AppText';
import { BadingCard } from '@/components/BadingCard';
import { useBadingActions } from '@/components/BadingActions';
import { Button } from '@/components/Button';
import { LogoMark } from '@/components/Logo';
import { PullToRefresh } from '@/components/PullToRefresh';
import { useToast } from '@/components/Toast';
import { useStore, withPinsFirst } from '@/data/store';
import { errorMessage } from '@/lib/api';
import type { Bading } from '@/data/types';
import { useReduceTransparency } from '@/lib/motion';
import { colors, space } from '@/theme/tokens';

const HEADER = 56;

function Skeleton() {
  return (
    <View accessibilityLabel="Chargement du fil" style={{ padding: space.lg, gap: space.xxl }}>
      {[0, 1, 2].map((i) => (
        <View key={i} style={{ flexDirection: 'row', gap: space.md, opacity: 1 - i * 0.25 }}>
          <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.surface2 }} />
          <View style={{ flex: 1, gap: 10 }}>
            <View style={{ width: '40%', height: 12, borderRadius: 6, backgroundColor: colors.surface2 }} />
            <View style={{ width: '100%', height: 12, borderRadius: 6, backgroundColor: colors.surface }} />
            <View style={{ width: '85%', height: 12, borderRadius: 6, backgroundColor: colors.surface }} />
          </View>
        </View>
      ))}
    </View>
  );
}

export default function Feed() {
  const insets = useSafeAreaInsets();
  const reduce = useReducedMotion();
  const { feed, pins, loadFeed, refreshFeed } = useStore();
  // Badings épinglés par l'équipe : tout en haut du fil.
  const data = useMemo(() => withPinsFirst(feed, pins), [feed, pins]);
  const pinLabel = useMemo(() => new Map(pins.map((p) => [p.id, p.label ?? ''])), [pins]);
  const toast = useToast();
  const { open, sheet } = useBadingActions();
  // Le squelette ne s'affiche que si rien n'est encore en cache.
  const [loading, setLoading] = useState(feed.length === 0);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let alive = true;
    setLoadError(null);
    loadFeed()
      .catch((e) => { if (alive) setLoadError(errorMessage(e, 'Le fil n’a pas pu être chargé.')); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [loadFeed, attempt]);

  // X-style header: slides away when scrolling down, returns on the slightest scroll up.
  const offset = useSharedValue(0);
  const last = useSharedValue(0);
  const scrollY = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((e) => {
    const y = e.contentOffset.y;
    scrollY.value = y;
    const dy = y - last.value;
    last.value = y;
    if (y <= 0) offset.value = 0;
    else offset.value = Math.min(HEADER, Math.max(0, offset.value + dy));
  });
  const headerStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -offset.value }],
  }));
  // Bord de défilement : la séparation n'apparaît que quand du contenu passe sous la barre.
  const headerEdge = useAnimatedStyle(() => ({ opacity: withTiming(scrollY.value > 4 ? 1 : 0, { duration: 160 }) }));
  const solid = useReduceTransparency();
  const headerInner = useAnimatedStyle(() => ({ opacity: withTiming(offset.value > HEADER / 2 ? 0 : 1, { duration: 120 }) }));

  const refresh = useCallback(async () => {
    try {
      const n = await refreshFeed();
      setLoadError(null);
      if (n > 0) setTimeout(() => toast(n > 1 ? `${n} nouveaux badings` : '1 nouveau bading'), 500);
      return n;
    } catch (e) {
      toast(errorMessage(e, 'Le fil n’a pas pu être actualisé.'));
      return 0;
    }
  }, [refreshFeed, toast]);

  const renderItem = useCallback(
    ({ item, index }: { item: Bading; index: number }) =>
      index < 6 && !reduce ? (
        <Animated.View entering={FadeInDown.duration(380).delay(index * 45)}>
          <BadingCard b={item} onMore={open} pin={pinLabel.get(item.id)} />
        </Animated.View>
      ) : (
        <BadingCard b={item} onMore={open} pin={pinLabel.get(item.id)} />
      ),
    [open, reduce, pinLabel],
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      {loading ? (
        <View style={{ paddingTop: insets.top + HEADER }}>
          <Skeleton />
        </View>
      ) : (
        <PullToRefresh onRefresh={refresh} scrollY={scrollY} top={insets.top + HEADER}>
        <Animated.FlatList
          data={data}
          keyExtractor={(b) => b.id}
          renderItem={renderItem}
          onScroll={onScroll}
          scrollEventThrottle={16}
          contentContainerStyle={{ paddingTop: insets.top + HEADER, paddingBottom: 24 }}
          bounces={false}
          overScrollMode="never"
          initialNumToRender={8}
          windowSize={7}
          ListEmptyComponent={
            loadError ? (
              <View style={{ padding: space.xxl, gap: space.lg, alignItems: 'flex-start' }}>
                <AppText variant="title">Le fil n’a pas pu se charger.</AppText>
                <AppText variant="body" color={colors.text2}>{loadError}</AppText>
                <Button label="Réessayer" kind="secondary" onPress={() => { setLoading(true); setAttempt((n) => n + 1); }} />
              </View>
            ) : (
            <View style={{ padding: space.xxl, gap: space.lg, alignItems: 'flex-start' }}>
              <AppText variant="title">Le fil est calme… trop calme.</AppText>
              <AppText variant="body" color={colors.text2}>Sois le premier à raconter ta galère du jour.</AppText>
              <Button label="Écrire un bading" onPress={() => router.push('/compose')} />
            </View>
            )
          }
        />
        </PullToRefresh>
      )}

      <Animated.View style={[{ position: 'absolute', top: 0, left: 0, right: 0, paddingTop: insets.top, overflow: 'hidden', backgroundColor: solid ? colors.bg : 'rgba(26,25,25,0.55)' }, headerStyle]}>
        {/* Matière translucide : le fil défile dessous, flouté. */}
        {!solid && <BlurView intensity={40} tint="dark" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />}
        <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 1, backgroundColor: 'rgba(255,255,255,0.07)' }, headerEdge]} />
        <Animated.View style={[{ height: HEADER, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: space.lg }, headerInner]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <LogoMark size={28} />
            <AppText variant="heading" style={{ fontSize: 22 }} accessibilityRole="header">On Bade</AppText>
          </View>
        </Animated.View>
      </Animated.View>
      {sheet}
    </View>
  );
}
