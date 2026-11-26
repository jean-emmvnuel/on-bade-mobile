import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/AppText';
import { LEVEL_EMOJI } from '@/components/BadeScore';
import { SeasonCountdown } from '@/components/SeasonCountdown';
import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { NotificationBell } from '@/components/NotificationBell';
import { Legend, Verified } from '@/components/Verified';
import { useStore, type LeaderRow, type ScoreRow, type SeasonInfo, type SeasonReward } from '@/data/store';
import { ME_ID } from '@/data/seed';
import { errorMessage } from '@/lib/api';
import { colors, fonts, radius, space } from '@/theme/tokens';

const MEDALS = ['🥇', '🥈', '🥉'];
const fmt = (n: number) => n.toLocaleString('fr-FR');

type Kind = 'flames' | 'badescore';
type ScoreData = { badeurs: ScoreRow[]; me: { rank: number; score: number; level: string; levelIndex: number } | null | undefined };

/** Bascule Flammes / BadeScore en haut du classement. */
function Switch({ kind, onChange }: { kind: Kind; onChange: (k: Kind) => void }) {
  const opts: [Kind, string][] = [['flames', '🔥 Flammes'], ['badescore', '⭐ BadeScore']];
  return (
    <View accessibilityRole="tablist" style={{ flexDirection: 'row', marginHorizontal: space.lg, marginTop: space.md, padding: 4, borderRadius: radius.pill, backgroundColor: colors.surface }}>
      {opts.map(([k, label]) => (
        <Pressable key={k} accessibilityRole="tab" accessibilityState={{ selected: kind === k }} onPress={() => onChange(k)}
          style={{ flex: 1, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: radius.pill, backgroundColor: kind === k ? colors.surface2 : 'transparent' }}>
          <AppText variant="label" color={kind === k ? colors.text : colors.text2}>{label}</AppText>
        </Pressable>
      ))}
    </View>
  );
}

/** Classement par BadeScore : score cumulé depuis l'inscription, les 30 premiers et mon rang. */
function ScoreBoard() {
  const { loadScoreBoard, users } = useStore();
  const [data, setData] = useState<ScoreData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(() => {
    setError(null);
    loadScoreBoard().then(setData, (e) => setError(errorMessage(e, 'Le classement n’a pas pu être chargé.')));
  }, [loadScoreBoard]);
  useEffect(() => { load(); }, [load]);

  if (error) return (
    <View style={{ padding: space.xl, gap: space.lg, alignItems: 'flex-start' }}>
      <AppText variant="body" color={colors.text2}>{error}</AppText>
      <Button label="Réessayer" kind="secondary" onPress={load} />
    </View>
  );
  if (!data) return <ActivityIndicator color={colors.brandInk} style={{ marginTop: space.xxl }} />;
  const inTop = data.badeurs.some((b) => b.userId === ME_ID);
  const header = (
    <View style={{ paddingHorizontal: space.lg, paddingTop: space.md, gap: space.md }}>
      <View style={{ padding: space.md, gap: 6, borderRadius: radius.lg, borderWidth: 1, borderColor: 'rgba(183,107,255,0.35)', backgroundColor: 'rgba(152,16,230,0.14)' }}>
        <AppText style={{ fontFamily: fonts.display, fontSize: 18 }}>BadeScore</AppText>
        <AppText variant="small" color={colors.text2}>L’engouement autour de tes badings signés : rires, commentaires, partages, rebades. Monte de rang en rang, de 🌱 Petit Badeur à 👑 Légende du Bade.</AppText>
      </View>
      {data.me && !inTop ? (
        <Pressable onPress={() => router.push('/(tabs)/profile')} accessibilityRole="button"
          style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md, borderRadius: radius.lg, backgroundColor: colors.brandSoft, borderWidth: 1, borderColor: 'rgba(183,107,255,0.4)' }}>
          <AppText style={{ fontFamily: fonts.display, fontSize: 26, color: colors.brandInk }}>{data.me.rank}e</AppText>
          <View style={{ flex: 1 }}>
            <AppText variant="label">Ton rang · {fmt(data.me.score)} pts · {LEVEL_EMOJI[data.me.levelIndex]} {data.me.level}</AppText>
            <AppText variant="small" color={colors.text2}>Fais réagir avec tes badings pour entrer dans le top 30 !</AppText>
          </View>
        </Pressable>
      ) : null}
      {data.me === null ? <AppText variant="small" color={colors.text2}>Pas encore de BadeScore : publie un bading signé et fais rire la communauté ⭐</AppText> : null}
    </View>
  );
  const row = ({ item: b, index }: { item: ScoreRow; index: number }) => {
    const u = users[b.userId];
    const me = b.userId === ME_ID;
    const top = b.rank <= 3;
    return (
      <Animated.View entering={index < 8 ? FadeInDown.duration(300).delay(index * 45) : undefined}>
        <Pressable onPress={() => (me ? router.push('/(tabs)/profile') : router.push({ pathname: '/u/[id]', params: { id: b.userId } }))}
          accessibilityLabel={`${b.rank}e, @${u?.pseudo ?? 'Badeur'}, ${b.score} points, ${b.level}`}
          style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, marginHorizontal: space.sm, paddingVertical: 10, paddingHorizontal: 10, borderRadius: radius.lg,
            ...(top ? { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line } : {}),
            ...(me ? { backgroundColor: colors.brandSoft, borderWidth: 1.5, borderColor: colors.brandInk } : {}) }}>
          <AppText style={{ width: 30, textAlign: 'center', fontSize: top ? 22 : 15, fontFamily: fonts.bodyBold, color: colors.text2 }}>{MEDALS[b.rank - 1] ?? b.rank}</AppText>
          <Avatar user={u ?? null} size={top ? 48 : 40} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <AppText variant="label" numberOfLines={1} style={{ flexShrink: 1 }}>@{u?.pseudo ?? 'Badeur'}</AppText>
              {u?.verified && <Verified size={13} />}
{u?.legend && <Legend size={13} />}
              {me && <View style={{ paddingHorizontal: 7, borderRadius: radius.pill, backgroundColor: colors.brand }}><AppText variant="small" color="#fff">Toi</AppText></View>}
            </View>
            <AppText variant="small" color={colors.text3}>{LEVEL_EMOJI[b.levelIndex] ?? '⭐'} {b.level}</AppText>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <AppText style={{ fontFamily: fonts.display, fontSize: 18, color: colors.brandInk }}>{fmt(b.score)}</AppText>
            <AppText variant="small" color={colors.text3} style={{ fontSize: 11 }}>pts</AppText>
          </View>
        </Pressable>
      </Animated.View>
    );
  };
  return (
    <FlatList
      data={data.badeurs}
      keyExtractor={(b) => b.userId}
      renderItem={row}
      ListHeaderComponent={header}
      ItemSeparatorComponent={() => <View style={{ height: 4 }} />}
      contentContainerStyle={{ gap: space.md, paddingBottom: space.xxl }}
      ListEmptyComponent={
        <View style={{ padding: space.xl, gap: space.md, alignItems: 'flex-start' }}>
          <AppText variant="heading">Personne n’a encore de BadeScore</AppText>
          <AppText variant="body" color={colors.text2}>Publie un bading signé et fais réagir : tu prendras la tête !</AppText>
          <Button label="Bader maintenant" onPress={() => router.push('/compose')} />
        </View>
      }
    />
  );
}

/**
 * Onglet Classement : deux classements au choix (bascule en haut) — Flammes (par défaut) ou BadeScore.
 * Flammes : la saison en cours (30 jours) par flammes — la série de jours actifs consécutifs en cours.
 * 1 jour où l'on publie = 1 flamme. Les 30 premiers, et mon rang.
 */
export default function Classement() {
  const insets = useSafeAreaInsets();
  const [kind, setKind] = useState<Kind>('flames');
  const { loadLeaderboard, users } = useStore();
  const [data, setData] = useState<{ season: SeasonInfo; reward: SeasonReward | null; champion: { userId: string; season: number; streak: number } | null; badeurs: LeaderRow[]; me: { rank: number; streak: number } | null | undefined } | null>(null);
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
      {season && data?.reward ? (
        <View accessibilityLabel="À gagner" style={{ flexDirection: 'row', gap: space.md, padding: space.md, borderRadius: radius.lg, borderWidth: 1, borderColor: 'rgba(255,201,60,0.4)', backgroundColor: 'rgba(255,201,60,0.14)' }}>
          <AppText style={{ fontSize: 32 }}>🏆</AppText>
          <View style={{ flex: 1, gap: 3 }}>
            <AppText style={{ fontFamily: fonts.display, fontSize: 16, color: '#FFD166' }}>À gagner : le 1er de la saison {season.number}</AppText>
            <AppText variant="small">👑 le badge {data.reward.badge.replace(/^👑\s*/, '')} sur son profil pendant {data.reward.badgeDays} jours</AppText>
            {data.reward.prize === 'surprise' ? <AppText variant="small">🎁 un lot surprise remis par l’équipe On Bade</AppText> : null}
            <AppText variant="small" color={colors.text2} style={{ marginTop: 4 }}>{left > 0 ? 'Fin de la saison dans' : 'Dernier jour : tout se joue avant minuit !'}</AppText>
            <SeasonCountdown season={season} />
          </View>
        </View>
      ) : null}
      {data?.champion ? (
        <Pressable onPress={() => router.push({ pathname: '/u/[id]', params: { id: data.champion!.userId } })} accessibilityRole="button" style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md, borderRadius: radius.lg, borderWidth: 1, borderColor: 'rgba(255,201,60,0.35)', backgroundColor: colors.surface }}>
          <Avatar user={users[data.champion.userId] ?? null} size={40} />
          <View style={{ flex: 1 }}>
            <AppText variant="label">👑 @{users[data.champion.userId]?.pseudo ?? 'Badeur'}</AppText>
            <AppText variant="small" color={colors.text2}>Champion de la saison {data.champion.season} · {data.champion.streak} flamme{data.champion.streak > 1 ? 's' : ''} d’affilée</AppText>
          </View>
        </Pressable>
      ) : null}
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
        <Pressable onPress={() => (me ? router.push('/(tabs)/profile') : router.push({ pathname: '/u/[id]', params: { id: b.userId } }))}
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
{u?.legend && <Legend size={13} />}
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
      <Switch kind={kind} onChange={setKind} />
      {kind === 'badescore' ? <ScoreBoard /> : error ? (
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
