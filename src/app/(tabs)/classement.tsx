import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/AppText';
import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { NotificationBell } from '@/components/NotificationBell';
import { Verified } from '@/components/Verified';
import { useStore, type LeaderRow, type SeasonInfo } from '@/data/store';
import { ME_ID } from '@/data/seed';
import { errorMessage } from '@/lib/api';
import { colors, fonts, radius, space } from '@/theme/tokens';

const MEDALS = ['🥇', '🥈', '🥉'];
const fmt = (n: number) => n.toLocaleString('fr-FR');

/**
 * Onglet Classement : la saison en cours (30 jours) par flammes — la série de jours actifs consécutifs en cours.
 * 1 jour où l'on publie = 1 flamme. Les 30 premiers, et mon rang.
 */
export default function Classement() {
  const insets = useSafeAreaInsets();
  const { loadLeaderboard, users } = useStore();
  const [data, setData] = useState<{ season: SeasonInfo; badeurs: LeaderRow[]; me: { rank: number; streak: number } | null | undefined } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setError(null);
    loadLeaderboard().then(setData, (e) => setError(errorMessage(e, 'Le classement n’a pas pu être chargé.')));
  }, [loadLeaderboard]);
  useEffect(() => { load(); }, [load]);

  const inTop = !!data?.badeurs.some((b) => b.userId === ME_ID);
  const season = data?.season;
  const left = season ? season.length - season.day : 0;
  const header = (
    <View style={{ paddingHorizontal: space.lg, paddingTop: space.md, gap: space.md }}>
      {season && (
        <View style={{ padding: space.md, gap: 8, borderRadius: radius.lg, borderWidth: 1, borderColor: 'rgba(255,140,50,0.3)', backgroundColor: 'rgba(255,122,26,0.12)' }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <AppText style={{ fontFamily: fonts.display, fontSize: 18 }}>Saison {season.number}</AppText>
            <AppText variant="small" color={colors.text2}>jour {season.day}/{season.length} · {left > 0 ? `fin dans ${left} jour${left > 1 ? 's' : ''}` : 'dernier jour !'}</AppText>
          </View>
          <View style={{ flexDirection: 'row', gap: 3 }}>
            {Array.from({ length: season.length }, (_, i) => (
              <View key={i} style={{ flex: 1, height: 8, borderRadius: 2, backgroundColor: i < season.day - 1 ? 'rgba(255,140,50,0.55)' : i === season.day - 1 ? '#FF8C32' : 'rgba(255,255,255,0.08)' }} />
            ))}
          </View>
          <AppText variant="small" color={colors.text2}>1 jour où tu publies = 1 flamme 🔥. Un jour sans bading, et la série repart de zéro. Nouvelle saison, tout le monde repart à égalité.</AppText>
        </View>
      )}
      {data?.me && !inTop ? (
        <Pressable onPress={() => router.push('/(tabs)/profile')} accessibilityRole="button"
          style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md, borderRadius: radius.lg, backgroundColor: colors.brandSoft, borderWidth: 1, borderColor: 'rgba(183,107,255,0.4)' }}>
          <AppText style={{ fontFamily: fonts.display, fontSize: 26, color: colors.brandInk }}>{data.me.rank}e</AppText>
          <View style={{ flex: 1 }}>
            <AppText variant="label">Ton rang · {fmt(data.me.streak)} 🔥</AppText>
            <AppText variant="small" color={colors.text2}>Publie chaque jour pour entrer dans le top 30 !</AppText>
          </View>
        </Pressable>
      ) : null}
      {data?.me === null ? <AppText variant="small" color={colors.text2}>Pas encore de flamme cette saison : publie un bading aujourd’hui pour entrer dans la course 🔥</AppText> : null}
    </View>
  );

  const row = ({ item: b, index }: { item: LeaderRow; index: number }) => {
    const u = users[b.userId];
    const me = b.userId === ME_ID;
    const top = b.rank <= 3;
    return (
      <Animated.View entering={index < 8 ? FadeInDown.duration(300).delay(index * 45) : undefined}>
        <Pressable onPress={() => (me ? router.push('/(tabs)/profile') : undefined)} disabled={!me}
          accessibilityLabel={`${b.rank}e, @${u?.pseudo ?? 'Badeur'}, ${b.streak} flamme${b.streak > 1 ? 's' : ''}`}
          style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, marginHorizontal: space.sm, paddingVertical: 10, paddingHorizontal: 10, borderRadius: radius.lg,
            ...(top ? { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line } : {}),
            ...(me ? { backgroundColor: colors.brandSoft, borderWidth: 1.5, borderColor: colors.brandInk } : {}) }}>
          <AppText style={{ width: 30, textAlign: 'center', fontSize: top ? 22 : 15, fontFamily: fonts.bodyBold, color: colors.text2 }}>{MEDALS[b.rank - 1] ?? b.rank}</AppText>
          <Avatar user={u ?? null} size={top ? 48 : 40} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <AppText variant="label" numberOfLines={1} style={{ flexShrink: 1 }}>@{u?.pseudo ?? 'Badeur'}</AppText>
              {u?.verified && <Verified size={13} />}
              {me && <View style={{ paddingHorizontal: 7, borderRadius: radius.pill, backgroundColor: colors.brand }}><AppText variant="small" color="#fff">Toi</AppText></View>}
            </View>
            <AppText variant="small" color={colors.text3}>{b.seasonDays} jour{b.seasonDays > 1 ? 's' : ''} actif{b.seasonDays > 1 ? 's' : ''} cette saison</AppText>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <AppText style={{ fontFamily: fonts.display, fontSize: 18, color: '#FF9A4A' }}>{fmt(b.streak)}</AppText>
            <AppText variant="small" color={colors.text3} style={{ fontSize: 11 }}>🔥 flamme{b.streak > 1 ? 's' : ''}</AppText>
          </View>
        </Pressable>
      </Animated.View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ paddingTop: insets.top, borderBottomWidth: 1, borderBottomColor: colors.line }}>
        <View style={{ height: 56, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: space.lg }}>
          <AppText variant="heading" style={{ fontSize: 22, flex: 1 }} accessibilityRole="header">Classement</AppText>
          <NotificationBell />
        </View>
      </View>
      {error ? (
        <View style={{ padding: space.xl, gap: space.lg, alignItems: 'flex-start' }}>
          <AppText variant="body" color={colors.text2}>{error}</AppText>
          <Button label="Réessayer" kind="secondary" onPress={load} />
        </View>
      ) : !data ? (
        <ActivityIndicator color={colors.brandInk} style={{ marginTop: space.xxl }} />
      ) : (
        <FlatList
          data={data.badeurs}
          keyExtractor={(b) => b.userId}
          renderItem={row}
          ListHeaderComponent={header}
          ItemSeparatorComponent={() => <View style={{ height: 4 }} />}
          contentContainerStyle={{ gap: space.md, paddingBottom: space.xxl }}
          ListEmptyComponent={
            <View style={{ padding: space.xl, gap: space.md, alignItems: 'flex-start' }}>
              <AppText variant="heading">Personne n’a encore de flamme</AppText>
              <AppText variant="body" color={colors.text2}>La saison vient de commencer : publie un bading aujourd’hui et prends la tête !</AppText>
              <Button label="Bader maintenant" onPress={() => router.push('/compose')} />
            </View>
          }
        />
      )}
    </View>
  );
}
