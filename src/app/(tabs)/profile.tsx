import { router } from 'expo-router';
import { Bookmark, ImageIcon, Lock, Pencil, Settings, Trash2, UserRoundPen } from '@/components/icons';
import { useEffect, useState } from 'react';
import { FlatList, Pressable, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/AppText';
import { NotificationBell } from '@/components/NotificationBell';
import { Avatar } from '@/components/Avatar';
import { BadingCard } from '@/components/BadingCard';
import { useBadingActions } from '@/components/BadingActions';
import { Button } from '@/components/Button';
import { ImageCropper } from '@/components/ImageCropper';
import { BadeScore, LegendCard } from '@/components/BadeScore';
import { Flames } from '@/components/Flames';
import { Sheet, SheetItem } from '@/components/Sheet';
import { PressableScale } from '@/components/PressableScale';
import { useToast } from '@/components/Toast';
import { Legend, Verified } from '@/components/Verified';
import { compact, useStore } from '@/data/store';
import { errorMessage } from '@/lib/api';
import { pickImage, type PickedImage } from '@/lib/pickImage';
import { colors, fonts, radius, space } from '@/theme/tokens';

type Tab = 'public' | 'fav' | 'anon';
const TABS: { key: Tab; label: string }[] = [
  { key: 'public', label: 'Badings' },
  { key: 'fav', label: 'Favoris' },
  { key: 'anon', label: 'Anonymes' },
];

const EMPTY: Record<Tab, { title: string; body: string }> = {
  public: { title: 'Aucun bading signé pour l’instant', body: 'Raconte ta dernière galère, on t’écoute.' },
  fav: { title: 'Pas encore de favoris', body: 'Touche le marque-page sous un bading pour le garder ici.' },
  anon: { title: 'Aucun bading anonyme', body: 'Active « Publier en anonyme » quand tu écris pour cacher ton pseudo.' },
};

export default function Profile() {
  const insets = useSafeAreaInsets();
  const { session, feed, setPhoto, favorites, getBading, loadProfile } = useStore();
  const toast = useToast();
  const [menu, setMenu] = useState(false);
  const [cropping, setCropping] = useState<PickedImage | null>(null);
  const { open, sheet } = useBadingActions();
  const [tab, setTab] = useState<Tab>('public');
  const me = session!.user;
  // Mes badings (signés et anonymes) et mes favoris viennent du serveur.
  useEffect(() => { loadProfile().catch((e) => toast(errorMessage(e, 'Ton profil n’a pas pu être actualisé.'))); }, [loadProfile, toast]);
  const savePhoto = async (uri: string | null, done: string) => {
    try {
      await setPhoto(uri);
      toast(done);
    } catch (e) {
      toast(errorMessage(e, "La photo n'a pas pu être enregistrée. Réessaie."));
    }
  };

  // Photo de profil : galerie → recadrage carré (aperçu rond) → affichée en rond partout.
  const choosePhoto = async () => {
    setMenu(false);
    const r = await pickImage();
    if (!r.ok) { if (r.error) toast(r.error); return; }
    setCropping(r.image);
  };
  const onPhotoPress = () => (me.photo ? setMenu(true) : choosePhoto());

  const mine = feed.filter((b) => b.authorId === me.id);
  // RG3: anonymous badings never show on the public profile — only here, privately.
  const publicOnes = mine.filter((b) => !b.anonymous);
  const anonOnes = mine.filter((b) => b.anonymous);
  const laughs = publicOnes.reduce((s, b) => s + b.likes, 0);
  const rebades = publicOnes.reduce((s, b) => s + b.rebades, 0);
  const shares = publicOnes.reduce((s, b) => s + b.shares, 0);
  const signedCount = publicOnes.filter((b) => !b.rebadeOf).length;
  const favOnes = favorites.map((id) => getBading(id)).filter((b): b is NonNullable<typeof b> => !!b && !b.deleted);
  const data = tab === 'public' ? publicOnes : tab === 'fav' ? favOnes : anonOnes;
  const joined = new Date(me.joinedAt).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <FlatList
        data={data}
        keyExtractor={(b) => b.id}
        renderItem={({ item }) => <BadingCard b={item} onMore={open} />}
        contentContainerStyle={{ paddingBottom: 24 }}
        ListHeaderComponent={
          <View style={{ paddingTop: insets.top }}>
            <View style={{ height: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: space.lg }}>
              <AppText variant="heading" style={{ fontSize: 22 }} accessibilityRole="header">Profil</AppText>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Pressable onPress={() => router.push('/settings')} accessibilityRole="button" accessibilityLabel="Paramètres" style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
                  <Settings size={22} color={colors.text} />
                </Pressable>
                <NotificationBell />
              </View>
            </View>
            {/* Carte d'identité : sobre, centrée, dans la même forme arrondie que les badings */}
            <Animated.View entering={FadeIn.duration(300)} style={{ marginHorizontal: space.md, marginTop: space.sm, marginBottom: space.lg, paddingTop: space.xl, paddingBottom: space.lg, paddingHorizontal: space.lg, alignItems: 'center', gap: 4, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: 28 }}>
              <PressableScale onPress={onPhotoPress} accessibilityRole="button" accessibilityLabel="Changer ma photo de profil" style={{ marginBottom: 8 }}>
                <Avatar user={me} size={96} />
                <View style={{ position: 'absolute', right: 0, bottom: 2, width: 30, height: 30, borderRadius: 15, backgroundColor: colors.surface2, borderWidth: 3, borderColor: colors.surface, alignItems: 'center', justifyContent: 'center' }}>
                  <Pencil size={13} color={colors.text} strokeWidth={2.4} />
                </View>
              </PressableScale>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <AppText variant="title">{me.pseudo}</AppText>
                {me.verified && <Verified size={20} />}
{me.legend && <Legend size={20} />}
              </View>
              <AppText variant="meta" color={colors.text3} style={{ textAlign: 'center' }}>@{me.pseudo} · Badeur depuis {joined}</AppText>
              <View style={{ flexDirection: 'row', alignSelf: 'stretch', marginTop: space.md, marginBottom: 6, paddingVertical: space.md, borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.line }}>
                {([[signedCount, 'badings'], [laughs, 'rires'], [rebades, 'rebades'], [shares, 'partages']] as const).map(([n, l], i) => (
                  <View key={l} style={{ flex: 1, alignItems: 'center', gap: 2, borderLeftWidth: i ? 1 : 0, borderLeftColor: colors.line }}>
                    <AppText style={{ fontFamily: fonts.display, fontSize: 22, lineHeight: 26, fontVariant: ['tabular-nums'] }}>{compact(n)}</AppText>
                    <AppText variant="small" color={colors.text2}>{l}</AppText>
                  </View>
                ))}
              </View>
              <LegendCard user={me} mine />
              <Flames flames={me.flames} mine />
              <BadeScore score={me.badeScore} mine />
              <View style={{ flexDirection: 'row', gap: space.sm, marginTop: space.sm }}>
                <PressableScale onPress={onPhotoPress} accessibilityRole="button" style={{ flexDirection: 'row', alignItems: 'center', gap: 6, height: 40, paddingHorizontal: 16, borderRadius: radius.pill, backgroundColor: colors.surface2 }}>
                  <ImageIcon size={15} color={colors.text} />
                  <AppText variant="label">{me.photo ? 'Changer ma photo' : 'Ajouter une photo'}</AppText>
                </PressableScale>
                {/* Pseudo (une fois tous les 2 jours), prénom et nom : dans les paramètres, section Compte. */}
                <PressableScale onPress={() => router.push('/settings')} accessibilityRole="button" accessibilityLabel="Modifier mon profil : pseudo, prénom et nom" style={{ flexDirection: 'row', alignItems: 'center', gap: 6, height: 40, paddingHorizontal: 16, borderRadius: radius.pill, backgroundColor: colors.surface2 }}>
                  <UserRoundPen size={15} color={colors.text} />
                  <AppText variant="label">Modifier</AppText>
                </PressableScale>
              </View>
            </Animated.View>
            {/* Onglets en segments */}
            <View accessibilityRole="tablist" style={{ flexDirection: 'row', gap: 4, marginHorizontal: space.md, marginBottom: space.md, padding: 4, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: radius.pill }}>
              {TABS.map(({ key, label }) => {
                const on = tab === key;
                return (
                  <Pressable key={key} onPress={() => setTab(key)} accessibilityRole="tab" accessibilityState={{ selected: on }} style={{ flex: 1, height: 40, borderRadius: radius.pill, backgroundColor: on ? colors.surface2 : 'transparent', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 }}>
                    {key !== 'public' && <Lock size={13} color={on ? colors.text : colors.text3} />}
                    <AppText variant="label" color={on ? colors.text : colors.text3}>{label}</AppText>
                    {key === 'fav' && favorites.length > 0 && <AppText variant="small" color={colors.text3}>{favorites.length}</AppText>}
                  </Pressable>
                );
              })}
            </View>
            {tab === 'fav' && (
              <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: space.lg, paddingBottom: space.md }}>
                <Bookmark size={16} color={colors.text3} style={{ marginTop: 2 }} />
                <AppText variant="meta" color={colors.text2} style={{ flex: 1 }}>Tes badings mis de côté. Visible par toi seul.</AppText>
              </View>
            )}
            {tab === 'anon' && (
              <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: space.lg, paddingBottom: space.md }}>
                <Lock size={16} color={colors.text3} style={{ marginTop: 2 }} />
                <AppText variant="meta" color={colors.text2} style={{ flex: 1 }}>Visible par toi seul. Sur ton profil public, personne ne peut relier ces badings à toi.</AppText>
              </View>
            )}
          </View>
        }
        ListEmptyComponent={
          <View style={{ padding: space.xl, gap: space.lg, alignItems: 'flex-start' }}>
            <AppText variant="heading">{EMPTY[tab].title}</AppText>
            <AppText variant="body" color={colors.text2}>{EMPTY[tab].body}</AppText>
            {tab === 'fav' ? (
              <Button label="Parcourir le fil" size="md" kind="secondary" onPress={() => router.navigate('/(tabs)')} />
            ) : (
              <Button label="Écrire un bading" size="md" onPress={() => router.push('/compose')} />
            )}
          </View>
        }
      />
      {sheet}
      <Sheet visible={menu} onClose={() => setMenu(false)} title="Photo de profil">
        <SheetItem icon={<ImageIcon size={20} color={colors.text} />} label="Choisir une autre photo" onPress={choosePhoto} />
        <SheetItem icon={<Trash2 size={20} color={colors.danger} />} label="Retirer la photo" danger onPress={() => { setMenu(false); savePhoto(null, 'Photo retirée'); }} />
      </Sheet>
      <ImageCropper
        source={cropping}
        ratios={['1:1']}
        outMax={256}
        round
        title="Photo de profil"
        onCancel={() => setCropping(null)}
        onDone={(img) => { setCropping(null); savePhoto(img.uri, 'Photo de profil enregistrée'); }}
      />
    </View>
  );
}
