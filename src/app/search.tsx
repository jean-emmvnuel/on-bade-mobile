import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Avatar } from '@/components/Avatar';
import { BadingPagedList } from '@/components/BadingPagedList';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Verified } from '@/components/Verified';
import { Search, X } from '@/components/icons';
import { useStore } from '@/data/store';
import { colors, fonts, radius, space } from '@/theme/tokens';

const TABS = [['all', 'Tout'], ['badings', 'Badings'], ['users', 'Comptes']] as const;
type Kind = (typeof TABS)[number][0];

/** Recherche (comme #/search sur le site) : badings (texte) et comptes (pseudo). Lance la recherche après une pause. */
export default function SearchScreen() {
  const { users, searchAll } = useStore();
  const [text, setText] = useState('');
  const [q, setQ] = useState('');
  const [kind, setKind] = useState<Kind>('all');
  const [accounts, setAccounts] = useState<string[]>([]);

  useEffect(() => {
    const t = setTimeout(() => setQ(text.trim()), 350);
    return () => clearTimeout(t);
  }, [text]);

  const load = useCallback(async (before?: number) => {
    if (q.length < 2) { setAccounts([]); return { badingIds: [], hasMore: false }; }
    const r = await searchAll(q, kind, before);
    if (!before) setAccounts(r.accounts);
    return r;
  }, [q, kind, searchAll]);

  const header = (
    <View style={{ gap: space.md, paddingTop: space.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: space.md, paddingHorizontal: space.md, height: 48, borderRadius: radius.pill, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line }}>
        <Search size={18} color={colors.text2} />
        <TextInput value={text} onChangeText={setText} placeholder="Un bading, un @pseudo, un #hashtag…" placeholderTextColor={colors.text3}
          autoFocus autoCapitalize="none" autoCorrect={false} returnKeyType="search" accessibilityLabel="Rechercher"
          style={{ flex: 1, color: colors.text, fontFamily: fonts.body, fontSize: 16 }} />
        {text ? <Pressable onPress={() => setText('')} accessibilityRole="button" accessibilityLabel="Effacer" hitSlop={8}><X size={18} color={colors.text2} /></Pressable> : null}
      </View>
      <View accessibilityRole="tablist" style={{ flexDirection: 'row', gap: 4, marginHorizontal: space.md, padding: 4, backgroundColor: colors.surface, borderRadius: radius.pill }}>
        {TABS.map(([k, label]) => (
          <Pressable key={k} onPress={() => setKind(k)} accessibilityRole="tab" accessibilityState={{ selected: kind === k }}
            style={{ flex: 1, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: radius.pill, backgroundColor: kind === k ? colors.surface2 : 'transparent' }}>
            <AppText variant="label" color={kind === k ? colors.text : colors.text2}>{label}</AppText>
          </Pressable>
        ))}
      </View>
      {q.startsWith('#') && q.length > 2 ? (
        <Pressable onPress={() => router.push({ pathname: '/tag/[tag]', params: { tag: q.slice(1) } })} accessibilityRole="button"
          style={{ marginHorizontal: space.md, padding: space.md, borderRadius: radius.lg, backgroundColor: colors.brandSoft }}>
          <AppText variant="label" color={colors.brandInk}>Voir tous les badings avec {q} →</AppText>
        </Pressable>
      ) : null}
      {kind !== 'badings' && accounts.length ? (
        <View style={{ marginHorizontal: space.md, gap: 4 }}>
          <AppText variant="small" color={colors.text3}>Comptes</AppText>
          {accounts.map((id) => {
            const u = users[id];
            return (
              <Pressable key={id} onPress={() => router.push(`/u/${id}`)} accessibilityRole="button" accessibilityLabel={`Profil de @${u?.pseudo ?? 'Badeur'}`}
                style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: 8 }}>
                <Avatar user={u ?? null} size={40} />
                <AppText variant="label">@{u?.pseudo ?? 'Badeur'}</AppText>
                {u?.verified && <Verified size={14} />}
              </Pressable>
            );
          })}
        </View>
      ) : null}
      {kind !== 'users' && q.length >= 2 ? <AppText variant="small" color={colors.text3} style={{ marginHorizontal: space.md }}>Badings</AppText> : null}
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScreenHeader title="Rechercher" bell={false} />
      <BadingPagedList load={load} reloadKey={`${kind}:${q}`} header={header}
        empty={<AppText variant="body" color={colors.text2} style={{ padding: space.xl }}>
          {q.length < 2 ? 'Tape au moins 2 caractères.' : kind === 'users' ? (accounts.length ? '' : 'Aucun compte trouvé.') : 'Aucun bading trouvé.'}
        </AppText>} />
    </View>
  );
}
