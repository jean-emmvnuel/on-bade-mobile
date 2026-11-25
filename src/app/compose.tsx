import { router } from 'expo-router';
import { Crop, ImageIcon, VenetianMask, X } from '@/components/icons';
import { useEffect, useRef, useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, TextInput, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeOut, LinearTransition } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/AppText';
import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { CharMeter } from '@/components/CharMeter';
import { IMAGE_RATIO, ImageCropper, type CropSettings } from '@/components/ImageCropper';
import { success } from '@/components/haptics';
import { useToast } from '@/components/Toast';
import { Toggle } from '@/components/Toggle';
import { Verified } from '@/components/Verified';
import { countMentions, RULES, useStore, type PublishError } from '@/data/store';
import type { BadingImage, User } from '@/data/types';
import { errorMessage } from '@/lib/api';
import { pickImage, type PickedImage } from '@/lib/pickImage';
import { colors, fonts, radius, space } from '@/theme/tokens';

const ERRORS: Record<PublishError, string> = {
  too_short: `Encore un peu : un bading fait au moins ${RULES.minLength} caractères.`,
  too_long: `Trop long : ${RULES.maxLength} caractères maximum.`,
  caption_too_long: `Avec une image, la légende fait ${RULES.captionMax} caractères maximum.`,
  blocked_word: 'Un mot de ton bading n’est pas accepté par la charte. Reformule-le.',
  too_many_mentions: `${RULES.maxMentions} mentions maximum par bading.`,
};

/** Message quand la flamme du jour est gagnée (même texte que le site). */
export function flameMessage({ streak, seasonDays }: { streak: number; seasonDays: number }) {
  if (streak > 1) return `🔥 Félicitations ! Tu as conservé ta série. Tu possèdes maintenant ${streak} flammes consécutives !`;
  if (seasonDays <= 1) return '🔥 Première flamme de la saison ! Reviens demain pour la garder.';
  return '🔥 Nouvelle flamme ! Ta série repart : reviens demain pour la faire grandir.';
}

export default function Compose() {
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { session, draft, setDraft, publish, searchPseudos, simulateEngagement } = useStore();
  const [text, setText] = useState(draft.text);
  const [anonymous, setAnonymous] = useState(draft.anonymous);
  const [error, setError] = useState<string | null>(null);
  const [sel, setSel] = useState(0);
  const [sending, setSending] = useState(false);
  const [suggestions, setSuggestions] = useState<User[]>([]);
  // Image recadrée + original gardé pour pouvoir recadrer à nouveau.
  const [image, setImage] = useState<BadingImage | null>(draft.image ?? null);
  const [original, setOriginal] = useState<PickedImage | null>(null);
  const [cropping, setCropping] = useState<PickedImage | null>(null);
  const [cropSettings, setCropSettings] = useState<Partial<CropSettings>>({});
  const latest = useRef({ text, anonymous, image, published: false });
  latest.current = { ...latest.current, text, anonymous, image };

  // RG7: keep a draft if the user leaves before publishing.
  useEffect(
    () => () => {
      if (!latest.current.published) setDraft({ text: latest.current.text, anonymous: latest.current.anonymous, image: latest.current.image });
    },
    [setDraft],
  );

  const me = session?.user ?? null;
  const len = text.trim().length;
  const max = image ? RULES.captionMax : RULES.maxLength;
  const tooLong = len > max;
  const canPublish = image ? !tooLong : len >= RULES.minLength && !tooLong;

  // @mention suggestions for the word being typed at the caret.
  const before = text.slice(0, sel);
  const m = before.match(/@([\w.]*)$/);
  const query = m && countMentions(text) <= RULES.maxMentions ? m[1] : null;
  useEffect(() => {
    if (query === null) { setSuggestions([]); return; }
    // Courte pause dans la frappe avant de demander au serveur ; seule la dernière réponse compte.
    let current = true;
    const t = setTimeout(() => {
      searchPseudos(query).then((list) => { if (current) setSuggestions(list); }).catch(() => { if (current) setSuggestions([]); });
    }, 200);
    return () => { current = false; clearTimeout(t); };
  }, [query, searchPseudos]);

  const insertMention = (pseudo: string) => {
    const start = sel - (m?.[0].length ?? 0);
    const next = `${text.slice(0, start)}@${pseudo} ${text.slice(sel)}`;
    setText(next);
    setSel(start + pseudo.length + 2);
  };

  const submit = async () => {
    if (sending) return;
    setSending(true);
    let res: Awaited<ReturnType<typeof publish>>;
    try {
      res = await publish(text, anonymous, image);
    } catch (e) {
      setError(errorMessage(e, "Ton bading n'a pas pu être publié. Réessaie."));
      return;
    } finally {
      setSending(false);
    }
    if (!res.ok) {
      setError(ERRORS[res.error]);
      return;
    }
    latest.current.published = true;
    setTimeout(() => simulateEngagement(res.id), 1500);
    success();
    router.back();
    setTimeout(() => toast(anonymous ? 'Publié en Badeur anonyme' : 'Ton bading est en ligne'), 250);
    // Flamme du jour gagnée (une seule par jour, décidée par le serveur) : on félicite.
    const flame = res.flame;
    if (flame?.gained) setTimeout(() => toast(flameMessage(flame)), 2200);
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ paddingTop: Platform.OS === 'ios' ? 12 : insets.top + 8, paddingHorizontal: space.md, height: (Platform.OS === 'ios' ? 12 : insets.top + 8) + 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel={text ? 'Fermer, le brouillon est gardé' : 'Fermer'} hitSlop={8} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
          <X size={24} color={colors.text} />
        </Pressable>
        <Button label="Publier" size="md" disabled={!canPublish} loading={sending} onPress={submit} />
      </View>

      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: space.lg, paddingBottom: space.xl }}>
        <View style={{ flexDirection: 'row', gap: space.md }}>
          <Avatar user={anonymous ? null : me} size={44} />
          <View style={{ flex: 1, gap: 6 }}>
            <Animated.View key={anonymous ? 'anon' : 'me'} entering={FadeIn.duration(200)} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, height: 22 }}>
              <AppText variant="label" color={anonymous ? colors.text2 : colors.text}>{anonymous ? 'Badeur anonyme' : me?.pseudo}</AppText>
              {!anonymous && me?.verified && <Verified size={15} />}
            </Animated.View>
            <TextInput
              autoFocus
              multiline
              value={text}
              onChangeText={(t) => { setText(t); setError(null); }}
              onSelectionChange={(e) => setSel(e.nativeEvent.selection.end)}
              placeholder={image ? 'Ajoute une légende (facultatif)…' : "Qu'est-ce qui t'est arrivé ?"}
              placeholderTextColor={colors.text3}
              selectionColor={colors.brandInk}
              cursorColor={colors.brandInk}
              accessibilityLabel="Ton bading"
              style={{ color: colors.text, fontFamily: fonts.bodyMedium, fontSize: 20, lineHeight: 28, minHeight: image ? 56 : 160, textAlignVertical: 'top', padding: 0 }}
            />
            <CharMeter length={len} max={max} min={RULES.minLength} caption={!!image} />
            {image && (
              <Animated.View entering={FadeIn.duration(220)} style={{ marginTop: space.sm, borderRadius: radius.lg, overflow: 'hidden', aspectRatio: image.width / image.height, backgroundColor: colors.surface2 }}>
                <Image source={{ uri: image.uri }} style={{ width: '100%', height: '100%' }} accessibilityLabel="Image du bading" />
                <View style={{ position: 'absolute', top: 10, right: 10, flexDirection: 'row', gap: 8 }}>
                  <Pressable onPress={() => setCropping(original ?? { uri: image.uri, width: image.width, height: image.height })} accessibilityRole="button" style={{ flexDirection: 'row', alignItems: 'center', gap: 6, height: 36, paddingHorizontal: 12, borderRadius: radius.pill, backgroundColor: 'rgba(26,25,25,0.85)' }}>
                    <Crop size={16} color="#fff" />
                    <AppText variant="label" color="#fff">Recadrer</AppText>
                  </Pressable>
                  <Pressable onPress={() => { setImage(null); setOriginal(null); }} accessibilityRole="button" accessibilityLabel="Retirer l'image" style={{ width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(26,25,25,0.85)' }}>
                    <X size={18} color="#fff" />
                  </Pressable>
                </View>
              </Animated.View>
            )}
          </View>
        </View>

        {suggestions.length > 0 && (
          <Animated.View entering={FadeInDown.duration(220)} exiting={FadeOut.duration(120)} style={{ marginTop: space.md, backgroundColor: colors.surface, borderRadius: radius.lg, overflow: 'hidden', borderWidth: 1, borderColor: colors.line }}>
            {suggestions.map((u) => (
              <Pressable key={u.id} onPress={() => insertMention(u.pseudo)} accessibilityRole="button" accessibilityLabel={`Mentionner ${u.pseudo}`} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.lg, minHeight: 56, backgroundColor: pressed ? colors.surface2 : 'transparent' })}>
                <Avatar user={u} size={32} />
                <AppText variant="label">{u.pseudo}</AppText>
                {u.verified && <Verified size={14} />}
              </Pressable>
            ))}
          </Animated.View>
        )}
        {error && (
          <Animated.View entering={FadeInDown.duration(220)} style={{ marginTop: space.md }}>
            <AppText variant="meta" color={colors.danger} accessibilityLiveRegion="polite">{error}</AppText>
          </Animated.View>
        )}
      </ScrollView>

      <Animated.View layout={LinearTransition} style={{ borderTopWidth: 1, borderTopColor: colors.line, paddingHorizontal: space.lg, paddingTop: space.sm, paddingBottom: Math.max(insets.bottom, space.md), gap: 4 }}>
        <Pressable
          onPress={async () => {
            const r = await pickImage();
            if (!r.ok) { if (r.error) setError(r.error); return; }
            setOriginal(r.image); setCropSettings({}); setCropping(r.image);
          }}
          accessibilityRole="button"
          accessibilityLabel={image ? "Changer l'image" : 'Ajouter une image'}
          style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start', height: 40, paddingHorizontal: 14, borderRadius: radius.pill, backgroundColor: pressed ? colors.line : colors.surface2, marginBottom: 6 })}>
          <ImageIcon size={18} color={colors.brandInk} />
          <AppText variant="label" color={colors.brandInk}>{image ? "Changer l'image" : 'Image'}</AppText>
        </Pressable>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
          <View style={{ width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: anonymous ? colors.brandSoft : colors.surface }}>
            <VenetianMask size={20} color={anonymous ? colors.brandInk : colors.text2} />
          </View>
          <View style={{ flex: 1 }}>
            <AppText variant="label">Publier en anonyme</AppText>
            <AppText variant="small" color={colors.text3}>Ne pourra plus être changé après publication</AppText>
          </View>
          <Toggle value={anonymous} onChange={setAnonymous} label="Publier en anonyme" />
        </View>
        <View style={{ paddingTop: 4 }}>
          <AppText variant="small" color={colors.text3}>Tape @ pour mentionner quelqu’un</AppText>
        </View>
      </Animated.View>
      <ImageCropper
        source={cropping}
        initial={cropSettings}
        // Forme libre par défaut (portrait et carré restent proposés), entre 1:2 et 2:1 comme l'accepte le serveur.
        ratios={['libre', '4:5', '1:1']}
        minRatio={IMAGE_RATIO.min}
        maxRatio={IMAGE_RATIO.max}
        onCancel={() => setCropping(null)}
        onDone={(img, settings) => { setImage(img); setCropSettings(settings); setCropping(null); setError(null); }}
      />
    </KeyboardAvoidingView>
  );
}
