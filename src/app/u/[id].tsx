import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useCallback } from 'react';
import { View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { AppText } from '@/components/AppText';
import { Avatar } from '@/components/Avatar';
import { BadeScore, LegendCard } from '@/components/BadeScore';
import { BadingPagedList } from '@/components/BadingPagedList';
import { Button } from '@/components/Button';
import { Flames } from '@/components/Flames';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Legend, Verified } from '@/components/Verified';
import { useStore } from '@/data/store';
import { ME_ID } from '@/data/seed';
import { colors, radius, space } from '@/theme/tokens';

/**
 * Profil public d'un Badeur (comme /@pseudo sur le site) : identité, flammes, BadeScore et ses badings signés —
 * jamais ses badings anonymes. `id` : identifiant ou pseudo (lien d'une @mention).
 */
export default function UserProfile() {
  const { id: raw } = useLocalSearchParams<{ id: string }>();
  const ref = String(raw ?? '').replace(/^@/, '');
  const { users, blocked, loadUserProfile } = useStore();
  const byPseudo = Object.values(users).find((u) => u.pseudo.toLowerCase() === ref.toLowerCase());
  const user = users[ref] ?? byPseudo;
  const load = useCallback((before?: number) => loadUserProfile(ref, before), [loadUserProfile, ref]);

  if (ref === ME_ID || user?.id === ME_ID) return <Redirect href="/(tabs)/profile" />;
  const isBlocked = !!user && blocked.includes(user.id);
  const joined = user ? new Date(user.joinedAt).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }) : '';

  const header = (
    <Animated.View entering={FadeIn.duration(300)} style={{ margin: space.md, marginBottom: space.lg, paddingVertical: space.xl, paddingHorizontal: space.lg, alignItems: 'center', gap: 4, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: 28 }}>
      <Avatar user={user ?? null} size={96} />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 }}>
        <AppText variant="title">{user?.pseudo ?? ref}</AppText>
        {user?.verified && <Verified size={20} />}
{user?.legend && <Legend size={20} />}
      </View>
      {user ? <AppText variant="meta" color={colors.text3}>@{user.pseudo} · Badeur depuis {joined}</AppText> : null}
      {!isBlocked ? <LegendCard user={user} /> : null}
      {!isBlocked && user?.flames ? <View style={{ alignSelf: 'stretch', marginTop: space.md }}><Flames flames={user.flames} /></View> : null}
      {!isBlocked && user?.badeScore ? <BadeScore score={user.badeScore} /> : null}
      {isBlocked ? (
        <View style={{ marginTop: space.md, padding: space.md, borderRadius: radius.lg, backgroundColor: colors.surface2 }}>
          <AppText variant="small" color={colors.text2}>Tu as bloqué ce compte : ses badings ne s’affichent plus. Tu peux le débloquer dans les paramètres.</AppText>
        </View>
      ) : null}
    </Animated.View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScreenHeader title={user ? `@${user.pseudo}` : 'Profil'} />
      {isBlocked ? header : (
        <BadingPagedList load={load} reloadKey={ref} header={header}
          empty={
            <View style={{ padding: space.xl, gap: space.md, alignItems: 'flex-start' }}>
              <AppText variant="body" color={colors.text2}>{user ? `@${user.pseudo} n’a pas encore publié de bading signé.` : 'Ce Badeur est introuvable.'}</AppText>
              {!user ? <Button label="Retour au fil" kind="secondary" onPress={() => router.navigate('/(tabs)')} /> : null}
            </View>
          } />
      )}
    </View>
  );
}
