// Champ de commentaire : texte, réponse à un commentaire, stickers, note vocale (rester appuyé sur le micro).
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { FlatList, Pressable, ScrollView, TextInput, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { compact, MAX_MY_STICKERS, RULES, useStore } from '@/data/store';
import { STICKERS } from '@/data/stickers';
import { errorMessage } from '@/lib/api';
import { pickStickerImage, type PickedImage } from '@/lib/pickImage';
import { useAudioRecorder } from 'expo-audio';
import { barFromDb, clock, currentVoiceMax, MIN_VOICE_MS, prepareMic, releaseMic, toRecording, VOICE_OPTIONS, voiceMaxSeconds } from '@/lib/voice';
import type { Comment } from '@/data/types';
import { colors, fonts, radius, space } from '@/theme/tokens';

import { AppText } from './AppText';
import { Avatar } from './Avatar';
import { tap } from './haptics';
import { ImageCropper } from './ImageCropper';
import { ArrowUp, Mic, Plus, StickerIcon, Trash2, X } from './icons';
import { Sticker } from './Sticker';
import { PressableScale } from './PressableScale';
import { useToast } from './Toast';

export type ComposerHandle = { replyTo: (c: Comment) => void; focus: () => void };

/** Bottom composer: "Ajoute un commentaire…", with a dismissible « Réponse à @x » chip. */
export const CommentComposer = forwardRef<ComposerHandle, { badingId: string; onSent?: (c: Comment) => void }>(function CommentComposer({ badingId, onSent }, ref) {
  const insets = useSafeAreaInsets();
  const { session, addComment, commentCount, users, recentStickers, myStickers, createSticker, unsaveSticker, customStickers } = useStore();
  const toast = useToast();
  const [text, setText] = useState('');
  const [picker, setPicker] = useState(false);
  const [stTab, setStTab] = useState<string>(recentStickers.length ? 'recent' : 'mine');
  const [creating, setCreating] = useState<PickedImage | null>(null);
  const [parent, setParent] = useState<Comment | null>(null);
  const input = useRef<React.ComponentRef<typeof TextInput>>(null);

  // ─── Note vocale : rester appuyé sur le micro, relâcher pour envoyer, glisser à gauche pour annuler, en haut pour verrouiller ───
  const recorder = useAudioRecorder(VOICE_OPTIONS);
  const [rec, setRec] = useState<{ ms: number; bars: number[]; locked: boolean; cancelling: boolean } | null>(null);
  const voice = useRef<{ x0: number; y0: number; locked: boolean; levels: number[]; started: number; timer?: ReturnType<typeof setInterval>; ready: boolean; released: boolean } | null>(null);
  const [maxSec, setMaxSec] = useState(currentVoiceMax());
  useEffect(() => { voiceMaxSeconds().then(setMaxSec); }, []);
  useEffect(() => () => { const v = voice.current; if (v?.timer) clearInterval(v.timer); if (v?.ready) recorder.stop().catch(() => {}); }, [recorder]);

  const stopVoice = async (send: boolean) => {
    const v = voice.current;
    voice.current = null;
    setRec(null);
    if (!v) return;
    if (v.timer) clearInterval(v.timer);
    if (!v.ready) return;
    const durationMs = Math.min(maxSec * 1000, Date.now() - v.started);
    try { await recorder.stop(); } catch { /* déjà arrêté */ }
    await releaseMic();
    if (!send) return;
    if (durationMs < MIN_VOICE_MS || !recorder.uri) { toast('Vocal trop court : reste appuyé sur le micro pour parler.'); return; }
    if (sending) return;
    setSending(true);
    try {
      const note = await toRecording(recorder.uri, durationMs, v.levels);
      const c = await addComment(badingId, '', parent ?? undefined, undefined, note);
      if (c) { tap(); setParent(null); onSent?.(c); }
    } catch (e) {
      toast(errorMessage(e, "Ton vocal n'a pas pu être envoyé. Réessaie."));
    } finally {
      setSending(false);
    }
  };

  const beginVoice = async (x: number, y: number, locked = false) => {
    if (voice.current || sending) return;
    setPicker(false);
    voice.current = { x0: x, y0: y, locked, levels: [], started: Date.now(), ready: false, released: false };
    setRec({ ms: 0, bars: [], locked, cancelling: false });
    try {
      if ((await prepareMic()) === 'denied') {
        voice.current = null; setRec(null);
        toast('Accès au micro refusé : autorise-le dans les réglages du téléphone pour envoyer un vocal.');
        return;
      }
      await recorder.prepareToRecordAsync();
      recorder.record();
    } catch {
      voice.current = null; setRec(null); await releaseMic();
      toast("Le micro n'a pas pu démarrer.");
      return;
    }
    const v = voice.current;
    if (!v) { recorder.stop().catch(() => {}); releaseMic(); return; } // annulé pendant la demande d'accès
    v.ready = true;
    v.started = Date.now();
    // Doigt relevé pendant la demande d'accès (première fois) : on n'enregistre pas par surprise.
    if (v.released && !v.locked) { stopVoice(false); toast('C’est bon, le micro est prêt : reste appuyé pour parler.'); return; }
    tap();
    v.timer = setInterval(() => {
      const st = recorder.getStatus();
      const db = typeof st.metering === 'number' ? st.metering : -160;
      v.levels.push(db);
      const ms = Date.now() - v.started;
      setRec((r) => (r ? { ...r, ms, bars: [...r.bars, barFromDb(db)].slice(-24) } : r));
      if (ms >= maxSec * 1000) stopVoice(true);
    }, 80);
  };

  const onMicMove = (x: number, y: number) => {
    const v = voice.current;
    if (!v || v.locked) return;
    const dx = x - v.x0, dy = y - v.y0;
    if (dx < -80) { stopVoice(false); return; }
    if (dy < -60) { v.locked = true; setRec((r) => (r ? { ...r, locked: true } : r)); return; }
    setRec((r) => (r ? { ...r, cancelling: dx < -40 } : r));
  };
  const onMicUp = () => {
    const v = voice.current;
    if (!v || v.locked) return;
    if (!v.ready) { v.released = true; return; }
    stopVoice(true);
  };

  useImperativeHandle(ref, () => ({
    replyTo: (c) => {
      setParent(c);
      input.current?.focus();
    },
    focus: () => input.current?.focus(),
  }));

  const [sending, setSending] = useState(false);
  const sendSticker = async (id: string) => {
    if (sending) return;
    setSending(true);
    let c: Comment | null;
    try {
      c = await addComment(badingId, '', parent ?? undefined, id);
    } catch (e) {
      toast(errorMessage(e, "Le sticker n'a pas pu être envoyé. Réessaie."));
      return;
    } finally {
      setSending(false);
    }
    if (!c) return;
    tap();
    setPicker(false);
    setParent(null);
    onSent?.(c);
  };
  const saveNewSticker = async (uri: string) => {
    if (myStickers.length >= MAX_MY_STICKERS) { toast(`${compact(MAX_MY_STICKERS)} stickers maximum : retire-en un d'abord.`); return; }
    try {
      const id = await createSticker(uri);
      if (!id) { toast(`${compact(MAX_MY_STICKERS)} stickers maximum : retire-en un d'abord.`); return; }
      setStTab('mine'); setPicker(true); toast('Sticker ajouté à tes stickers');
    } catch (e) {
      toast(errorMessage(e, "Le sticker n'a pas pu être créé (WebP, PNG ou GIF, 1,5 Mo max.). Réessaie."));
    }
  };
  // Sticker : GIF ou WebP (stickers WhatsApp) envoyé tel quel ; image fixe recadrée puis enregistrée en PNG transparent.
  const newSticker = async () => {
    const r = await pickStickerImage();
    if (!r.ok) { if (r.error) toast(r.error); return; }
    if (r.asIs) await saveNewSticker(r.image.uri);
    else setCreating(r.image);
  };
  const tabIds = stTab === 'recent' ? recentStickers : stTab === 'mine' ? myStickers : STICKERS.map((x) => x.id);

  const send = async () => {
    if (sending) return;
    setSending(true);
    let c: Comment | null;
    try {
      c = await addComment(badingId, text, parent ?? undefined);
    } catch (e) {
      toast(errorMessage(e, "Ton commentaire n'a pas pu être publié. Réessaie."));
      return;
    } finally {
      setSending(false);
    }
    if (!c) { toast('Ce commentaire contient un mot refusé par la charte.'); return; }
    tap();
    setText('');
    setParent(null);
    onSent?.(c);
  };
  const tooLong = text.length > RULES.commentMax;

  return (
    <View style={{ borderTopWidth: 1, borderTopColor: colors.line, backgroundColor: colors.bg, paddingHorizontal: space.md, paddingTop: space.sm, paddingBottom: Math.max(insets.bottom, space.sm), gap: 6 }}>
      {parent && (
        <Animated.View entering={FadeInDown.duration(180)} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 4 }}>
          <AppText variant="small" color={colors.text2} style={{ flex: 1 }}>
            Réponse à <AppText variant="small" color={colors.brandInk}>@{users[parent.authorId]?.pseudo}</AppText>
          </AppText>
          <Pressable onPress={() => setParent(null)} hitSlop={10} accessibilityRole="button" accessibilityLabel="Annuler la réponse">
            <X size={16} color={colors.text2} />
          </Pressable>
        </Animated.View>
      )}
      {picker && (
        <Animated.View entering={FadeInDown.duration(200)} style={{ backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.line, overflow: 'hidden' }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 4, padding: 6 }} style={{ borderBottomWidth: 1, borderBottomColor: colors.line }}>
            {/* Réactions et Nouchi réunis en un seul onglet « Réactions », comme sur le site. */}
            {[['recent', 'Récents'], ['mine', 'Mes stickers'], ['all', 'Réactions']].map(([k, l]) => (
              <Pressable key={k} onPress={() => setStTab(k)} accessibilityRole="tab" accessibilityState={{ selected: stTab === k }} style={{ height: 32, paddingHorizontal: 12, borderRadius: radius.pill, justifyContent: 'center', backgroundColor: stTab === k ? colors.surface2 : 'transparent' }}>
                <AppText variant="small" color={stTab === k ? colors.text : colors.text2}>{k === 'mine' && myStickers.length ? `${l} · ${compact(myStickers.length)}` : l}</AppText>
              </Pressable>
            ))}
          </ScrollView>
          {/* Grille virtualisée : seules les cases visibles sont dessinées, même avec 1 000 stickers. */}
          <FlatList
            key={stTab}
            data={[...(stTab === 'mine' ? ['__create'] : []), ...tabIds.filter((sid) => !customStickers[sid]?.removed)]}
            keyExtractor={(sid) => sid}
            numColumns={4}
            style={{ maxHeight: 250 }}
            contentContainerStyle={{ padding: 10, gap: 10 }}
            initialNumToRender={16}
            maxToRenderPerBatch={16}
            windowSize={5}
            removeClippedSubviews
            nestedScrollEnabled
            keyboardShouldPersistTaps="handled"
            renderItem={({ item: sid }) =>
              sid === '__create' ? (
                <View style={{ width: '25%', alignItems: 'center' }}>
                  <Pressable onPress={newSticker} accessibilityRole="button" accessibilityLabel="Créer un sticker à partir d'une photo" style={{ width: 76, height: 76, borderRadius: 18, borderWidth: 2, borderStyle: 'dashed', borderColor: colors.brandInk, alignItems: 'center', justifyContent: 'center', gap: 2 }}>
                    <Plus size={22} color={colors.brandInk} />
                    <AppText variant="small" color={colors.brandInk}>Créer</AppText>
                  </Pressable>
                </View>
              ) : (
                <PressableScale
                  onPress={() => sendSticker(sid)}
                  onLongPress={stTab === 'mine' ? () => { unsaveSticker(sid).then(() => toast('Retiré de tes stickers')).catch((e) => toast(errorMessage(e))); } : undefined}
                  accessibilityRole="button"
                  accessibilityHint={stTab === 'mine' ? 'Appui long pour le retirer de tes stickers' : undefined}
                  style={{ width: '25%', alignItems: 'center' }}>
                  <Sticker id={sid} size={72} />
                </PressableScale>
              )
            }
            ListFooterComponent={
              !tabIds.length ? (
                <AppText variant="small" color={colors.text3} style={{ paddingHorizontal: 4 }}>
                  {stTab === 'mine' ? "Crée un sticker avec une photo, ou touche le sticker d'un Badeur dans les commentaires pour l'ajouter ici." : 'Tes stickers récents apparaîtront ici.'}
                </AppText>
              ) : undefined
            }
          />
        </Animated.View>
      )}
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: space.sm }}>
        <Avatar user={session?.user ?? null} size={32} />
        <TextInput
          ref={input}
          value={text}
          onChangeText={setText}
          multiline
          placeholder={parent ? 'Ta réponse…' : commentCount(badingId) ? 'Ton commentaire…' : 'Écris le 1er commentaire 🥇'}
          placeholderTextColor={colors.text3}
          selectionColor={colors.brandInk}
          accessibilityLabel={parent ? 'Ta réponse' : 'Ton commentaire'}
          style={{ flex: 1, maxHeight: 110, minHeight: 40, color: colors.text, fontFamily: fonts.body, fontSize: 16, backgroundColor: colors.surface, borderRadius: radius.lg, paddingHorizontal: 14, paddingTop: 10, paddingBottom: 10, borderWidth: tooLong ? 1 : 0, borderColor: colors.danger }}
        />
        <Pressable onPress={() => setPicker((p) => !p)} accessibilityRole="button" accessibilityLabel="Envoyer un sticker" accessibilityState={{ expanded: picker }} hitSlop={6} style={{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: picker ? colors.brandSoft : 'transparent' }}>
          <StickerIcon size={22} color={picker ? colors.brandInk : colors.text2} />
        </Pressable>
        {!text.trim() ? (
          <View
            onTouchStart={(e) => beginVoice(e.nativeEvent.pageX, e.nativeEvent.pageY)}
            onTouchMove={(e) => onMicMove(e.nativeEvent.pageX, e.nativeEvent.pageY)}
            onTouchEnd={onMicUp}
            onTouchCancel={() => stopVoice(false)}
            accessible
            accessibilityRole="button"
            accessibilityLabel="Note vocale : reste appuyé pour enregistrer"
            accessibilityActions={[{ name: 'activate', label: 'Enregistrer en mains libres' }]}
            onAccessibilityAction={() => beginVoice(0, 0, true)}
            style={{ width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: rec ? colors.danger : colors.brand, transform: [{ scale: rec ? 1.15 : 1 }], opacity: sending ? 0.5 : 1 }}>
            <Mic size={20} color="#fff" />
          </View>
        ) : (
          <PressableScale
            onPress={send}
            disabled={tooLong || sending}
            accessibilityRole="button"
            accessibilityLabel={parent ? 'Envoyer la réponse' : 'Envoyer le commentaire'}
            style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: colors.brand, alignItems: 'center', justifyContent: 'center', opacity: tooLong ? 0.4 : 1 }}>
            <ArrowUp size={20} color={colors.onBrand} strokeWidth={2.6} />
          </PressableScale>
        )}
      </View>
      {rec && (
        <View accessibilityRole="text" accessibilityLiveRegion="polite" style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44, paddingLeft: 12, paddingRight: 6, borderRadius: radius.pill, backgroundColor: colors.surface2, opacity: rec.cancelling ? 0.55 : 1 }}>
          <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: colors.danger }} />
          <AppText variant="label" style={{ fontVariant: ['tabular-nums'] }}>{clock(rec.ms)}<AppText variant="small" color={colors.text3}> / {clock(maxSec * 1000)}</AppText></AppText>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2, height: 24, flexShrink: 1, overflow: 'hidden' }}>
            {rec.bars.map((h, i) => <View key={i} style={{ width: 3, height: `${Math.max(10, h)}%`, borderRadius: 2, backgroundColor: colors.danger }} />)}
          </View>
          <View style={{ flex: 1 }} />
          {rec.locked ? (
            <>
              <Pressable onPress={() => stopVoice(false)} accessibilityRole="button" accessibilityLabel="Annuler le vocal" hitSlop={6} style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }}>
                <Trash2 size={18} color={colors.text2} />
              </Pressable>
              <Pressable onPress={() => stopVoice(true)} accessibilityRole="button" accessibilityLabel="Envoyer le vocal" style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: colors.brand, alignItems: 'center', justifyContent: 'center' }}>
                <ArrowUp size={18} color={colors.onBrand} strokeWidth={2.6} />
              </Pressable>
            </>
          ) : (
            <AppText variant="small" color={colors.text2} numberOfLines={1} style={{ flexShrink: 1 }}>‹ Glisse pour annuler · ↑ verrouiller</AppText>
          )}
        </View>
      )}
      {tooLong && <AppText variant="small" color={colors.danger}>{RULES.commentMax} caractères maximum ({text.length}).</AppText>}
      <ImageCropper
        source={creating}
        ratios={['libre', '1:1']}
        outMax={512}
        format="png"
        title="Créer un sticker"
        onCancel={() => setCreating(null)}
        onDone={(img) => { setCreating(null); void saveNewSticker(img.uri); }}
      />
    </View>
  );
});
