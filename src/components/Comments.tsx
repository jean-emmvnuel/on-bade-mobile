import { router } from 'expo-router';
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { FlatList, Pressable, ScrollView, TextInput, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, LinearTransition } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { compact, descendantIds, MAX_MY_STICKERS, RULES, timeAgo, useStore, type CommentNode } from '@/data/store';
import { STICKERS, getSticker } from '@/data/stickers';
import { errorMessage } from '@/lib/api';
import { pickImage, type PickedImage } from '@/lib/pickImage';
import { useAudioRecorder } from 'expo-audio';
import { barFromDb, clock, currentVoiceMax, MIN_VOICE_MS, prepareMic, releaseMic, toRecording, VOICE_OPTIONS, voiceMaxSeconds } from '@/lib/voice';
import type { Comment } from '@/data/types';
import { colors, fonts, radius, space } from '@/theme/tokens';

import { AppText } from './AppText';
import { Avatar } from './Avatar';
import { tap } from './haptics';
import { Button } from './Button';
import { ImageCropper } from './ImageCropper';
import { ArrowUp, BookmarkPlus, ChevronDown, Laugh, Mic, Plus, StickerIcon, Trash2, X } from './icons';
import { VoiceNote } from './VoiceNote';
import { Sticker } from './Sticker';
import { PressableScale } from './PressableScale';
import { RichText } from './RichText';
import { Sheet, SheetItem } from './Sheet';
import { useToast } from './Toast';
import { Verified } from './Verified';

const PREVIEW_REPLIES = 2;

type RowProps = {
  c: Comment; reply?: boolean; showReplyTo?: boolean; replyCount?: number; collapsed?: boolean; onToggle?: () => void;
  onReply: (c: Comment) => void; onMore: (c: Comment) => void; onDelete: (c: Comment) => void; onSticker: (id: string) => void;
};

function CommentRow({ c, reply, showReplyTo, replyCount = 0, collapsed, onToggle, onReply, onMore, onDelete, onSticker }: RowProps) {
  const { users, toggleCommentLike, session } = useStore();
  const mine = c.authorId === session?.user.id;
  const u = users[c.authorId];
  return (
    <Animated.View entering={FadeIn.duration(240)} layout={LinearTransition} style={{ flexDirection: 'row', gap: space.md }}>
      <Pressable onPress={() => onMore(c)} onLongPress={() => onMore(c)} accessibilityLabel={`Profil de ${u?.pseudo}`}>
        <Avatar user={u ?? null} size={reply ? 28 : 36} />
      </Pressable>
      <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <AppText variant="label" style={{ fontSize: 14, flexShrink: 1 }} numberOfLines={1}>{u?.pseudo ?? 'Badeur'}</AppText>
          {u?.verified && <Verified size={13} />}
          <AppText variant="small" color={colors.text3}>· {timeAgo(c.createdAt)}</AppText>
        </View>
        {showReplyTo && c.replyTo && <AppText variant="small" color={colors.text3}>en réponse à <AppText variant="small" color={colors.brandInk}>@{c.replyTo}</AppText></AppText>}
        {c.audio ? (
          <VoiceNote audio={c.audio} />
        ) : c.sticker ? (
          <Pressable onPress={() => onSticker(c.sticker!)} accessibilityHint="Ajouter ce sticker à tes stickers" style={{ alignSelf: 'flex-start', paddingVertical: 8, paddingHorizontal: 4 }}>
            <Sticker id={c.sticker} size={reply ? 100 : 116} />
          </Pressable>
        ) : (
          <RichText variant="body">{c.text}</RichText>
        )}
        <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', columnGap: space.lg, marginTop: 2 }}>
          <Pressable onPress={() => { tap(); toggleCommentLike(c.id); }} hitSlop={10} accessibilityRole="button" accessibilityLabel={c.likedByMe ? 'Retirer mon rire' : 'Rire à ce commentaire'} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 36, minWidth: 32 }}>
            <Laugh size={15} color={c.likedByMe ? colors.brandInk : colors.text3} fill={c.likedByMe ? colors.brandSoft : 'transparent'} />
            {c.likes > 0 && <AppText variant="small" color={c.likedByMe ? colors.brandInk : colors.text3}>{c.likes}</AppText>}
          </Pressable>
          <Pressable onPress={() => onReply(c)} hitSlop={10} accessibilityRole="button" style={{ minHeight: 36, justifyContent: 'center' }}>
            <AppText variant="small" color={colors.text2}>Répondre</AppText>
          </Pressable>
          {replyCount > 0 && onToggle && (
            <Pressable onPress={onToggle} hitSlop={10} accessibilityRole="button" accessibilityState={{ expanded: !collapsed }}
              accessibilityLabel={collapsed ? `Afficher les réponses (${replyCount})` : `Masquer les réponses (${replyCount})`}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 3, minHeight: 36 }}>
              <View style={{ transform: [{ rotate: collapsed ? '-90deg' : '0deg' }] }}><ChevronDown size={15} color={colors.text3} /></View>
              <AppText variant="small" color={colors.text3}>{replyCount}</AppText>
            </Pressable>
          )}
          {mine && (
            <Pressable onPress={() => onDelete(c)} hitSlop={10} accessibilityRole="button" accessibilityLabel="Supprimer mon commentaire" style={{ flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 36 }}>
              <Trash2 size={14} color={colors.text3} />
              <AppText variant="small" color={colors.text3}>Supprimer</AppText>
            </Pressable>
          )}
          <Pressable onPress={() => onMore(c)} hitSlop={10} accessibilityRole="button" accessibilityLabel="Options du commentaire" style={{ minHeight: 36, minWidth: 28, justifyContent: 'center' }}>
            <AppText variant="small" color={colors.text3}>•••</AppText>
          </Pressable>
        </View>
      </View>
    </Animated.View>
  );
}

const countAll = (nodes: CommentNode[]): number => nodes.reduce((n, x) => n + 1 + countAll(x.children), 0);
const involves = (nodes: CommentNode[], me?: string): boolean => !!me && nodes.some((x) => x.comment.authorId === me || involves(x.children, me));

type TreeCtx = {
  open: Record<string, boolean>; setOpen: (id: string, v: boolean) => void; me?: string; pseudoOf: (id: string) => string | undefined;
  row: Pick<RowProps, 'onReply' | 'onMore' | 'onDelete' | 'onSticker'>;
};

/** Un commentaire et ses réponses (récursif) : chaque réponse est rangée sous le commentaire auquel elle répond. */
function Node({ node, depth, parent, ctx }: { node: CommentNode; depth: number; parent: Comment | null; ctx: TreeCtx }) {
  const c = node.comment;
  const kids = node.children;
  const state = ctx.open[c.id]; // true = ouvert, false = replié, undefined = automatique
  const collapsed = state === false;
  const expanded = state ?? (c.authorId === ctx.me || involves(kids, ctx.me));
  const shown = collapsed ? [] : expanded ? kids : kids.slice(0, PREVIEW_REPLIES);
  const hidden = collapsed ? 0 : kids.length - shown.length;
  const showReplyTo = !!parent && (c.parentId !== parent.id || c.replyTo !== ctx.pseudoOf(parent.authorId));
  return (
    <View>
      <CommentRow c={c} reply={depth > 0} showReplyTo={showReplyTo} replyCount={countAll(kids)} collapsed={collapsed}
        onToggle={() => ctx.setOpen(c.id, collapsed)} {...ctx.row} />
      {(shown.length > 0 || hidden > 0) && (
        // Trait de rattachement : il descend sous l'avatar du commentaire, le long de ses réponses.
        <View style={{ marginLeft: depth === 0 ? 17 : 13, paddingLeft: 12, borderLeftWidth: 2, borderLeftColor: colors.line, marginTop: space.sm, gap: space.md }}>
          {shown.map((n) => <Node key={n.comment.id} node={n} depth={depth + 1} parent={c} ctx={ctx} />)}
          {hidden > 0 && (
            <Pressable onPress={() => ctx.setOpen(c.id, true)} hitSlop={6} accessibilityRole="button" style={{ minHeight: 32, justifyContent: 'center' }}>
              <AppText variant="small" color={colors.brandInk}>{hidden > 1 ? `Voir les ${hidden} autres réponses` : 'Voir 1 autre réponse'}</AppText>
            </Pressable>
          )}
        </View>
      )}
    </View>
  );
}

/** Fils de commentaires en arbre sur 4 niveaux (comme le site) ; plus bas, les réponses se rangent au 4ᵉ niveau. */
export function CommentThreads({ badingId, onReply }: { badingId: string; onReply: (c: Comment) => void }) {
  const { commentTree, comments, session, removeComment, reportComment, myStickers, saveSticker, customStickers, users } = useStore();
  const toast = useToast();
  const [stickerMenu, setStickerMenu] = useState<string | null>(null);
  const stickerOwner = stickerMenu ? customStickers[stickerMenu]?.ownerId : undefined;
  const [open, setOpenState] = useState<Record<string, boolean>>({});
  const [menu, setMenu] = useState<Comment | null>(null);
  const [confirm, setConfirm] = useState<Comment | null>(null);
  const tree = commentTree(badingId);
  const confirmHasReplies = !!confirm && [...descendantIds(comments, confirm.id)].some((id) => comments.some((c) => c.id === id && !c.deleted));


  const ctx: TreeCtx = {
    open, setOpen: (id, v) => setOpenState((o) => ({ ...o, [id]: v })), me: session?.user.id,
    pseudoOf: (id) => users[id]?.pseudo,
    row: { onReply, onMore: setMenu, onDelete: setConfirm, onSticker: setStickerMenu },
  };

  if (tree.length === 0) {
    return (
      <View style={{ padding: space.xl, alignItems: 'center', gap: 6 }}>
        <AppText variant="heading">Pas encore de commentaire</AppText>
        <AppText variant="body" color={colors.text2} style={{ textAlign: 'center' }}>Lance la discussion, dis ce que ça t'a fait.</AppText>
      </View>
    );
  }

  return (
    <View style={{ padding: space.lg, gap: space.xl }}>
      {tree.map((n) => <Node key={n.comment.id} node={n} depth={0} parent={null} ctx={ctx} />)}
      <Sheet visible={!!menu} onClose={() => setMenu(null)}>
        {menu?.authorId === session?.user.id ? (
          <SheetItem label="Supprimer mon commentaire" danger onPress={() => { const m = menu; setMenu(null); setTimeout(() => setConfirm(m), 250); }} />
        ) : (
          <>
            <SheetItem label="Voir le profil" onPress={() => { setMenu(null); router.push('/(tabs)/profile'); }} />
            <SheetItem label="Signaler ce commentaire" detail="Haine, harcèlement, spam…" onPress={() => {
              const target = menu;
              setMenu(null);
              if (target) reportComment(target.id, 'Signalé depuis l’app').then(() => toast('Merci, la modération va regarder ça.')).catch((e) => toast(errorMessage(e)));
            }} />
          </>
        )}
      </Sheet>
      {/* Comme sur TikTok : toucher un sticker pour l'ajouter à sa collection. */}
      <Sheet visible={!!stickerMenu} onClose={() => setStickerMenu(null)}>
        {stickerMenu && (
          <View style={{ alignItems: 'center', gap: space.lg, paddingHorizontal: space.xl, paddingBottom: space.md }}>
            <Sticker id={stickerMenu} size={150} />
            <AppText variant="small" color={colors.text3}>
              {getSticker(stickerMenu) ? 'Sticker On Bade' : stickerOwner === session?.user.id ? 'Ton sticker' : `Sticker créé par @${users[stickerOwner ?? '']?.pseudo ?? 'un Badeur'}`}
            </AppText>
            {getSticker(stickerMenu) ? (
              <AppText variant="body" color={colors.text2} style={{ textAlign: 'center' }}>Il est déjà dans ta bibliothèque de stickers.</AppText>
            ) : myStickers.includes(stickerMenu) ? (
              <AppText variant="body" color={colors.text2} style={{ textAlign: 'center' }}>Il est déjà dans tes stickers.</AppText>
            ) : customStickers[stickerMenu]?.removed ? null : (
              <Button
                label="Ajouter à mes stickers"
                icon={<BookmarkPlus size={18} color={colors.onBrand} />}
                style={{ alignSelf: 'stretch' }}
                onPress={async () => {
                  if (myStickers.length >= MAX_MY_STICKERS) { toast(`${compact(MAX_MY_STICKERS)} stickers maximum : retire-en un d'abord.`); return; }
                  const id = stickerMenu;
                  setStickerMenu(null);
                  try {
                    toast((await saveSticker(id)) ? 'Ajouté à tes stickers' : `${compact(MAX_MY_STICKERS)} stickers maximum : retire-en un d'abord.`);
                  } catch (e) { toast(errorMessage(e)); }
                }}
              />
            )}
          </View>
        )}
      </Sheet>
      <Sheet visible={!!confirm} onClose={() => setConfirm(null)} title="Supprimer ce commentaire ?">
        <View style={{ paddingHorizontal: space.xl, gap: space.lg }}>
          <AppText variant="body" color={colors.text2}>
            {confirm?.audio
              ? `Il disparaît pour tout le monde${confirmHasReplies ? ', avec ses réponses' : ''}. L'équipe de modération peut encore l'écouter pendant 90 jours, puis il est effacé.`
              : `${confirmHasReplies ? 'Les réponses à ce commentaire seront aussi supprimées. ' : ''}C'est définitif.`}
          </AppText>
          <View style={{ flexDirection: 'row', gap: space.md }}>
            <Button label="Annuler" kind="secondary" size="md" style={{ flex: 1 }} onPress={() => setConfirm(null)} />
            <Button label="Supprimer" size="md" style={{ flex: 1, backgroundColor: colors.danger }} onPress={() => {
              const target = confirm;
              setConfirm(null);
              if (target) removeComment(target.id).then(() => toast('Commentaire supprimé')).catch((e) => toast(errorMessage(e)));
            }} />
          </View>
        </View>
      </Sheet>
    </View>
  );
}

export type ComposerHandle = { replyTo: (c: Comment) => void; focus: () => void };

/** Bottom composer: "Ajoute un commentaire…", with a dismissible « Réponse à @x » chip. */
export const CommentComposer = forwardRef<ComposerHandle, { badingId: string; onSent?: (c: Comment) => void }>(function CommentComposer({ badingId, onSent }, ref) {
  const insets = useSafeAreaInsets();
  const { session, addComment, users, recentStickers, myStickers, createSticker, unsaveSticker, customStickers } = useStore();
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
  const newSticker = async () => {
    const r = await pickImage();
    if (!r.ok) { if (r.error) toast(r.error); return; }
    setCreating(r.image);
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
          placeholder={parent ? 'Ta réponse…' : 'Ton commentaire…'}
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
        ratios={['1:1']}
        outMax={512}
        title="Créer un sticker"
        onCancel={() => setCreating(null)}
        onDone={async (img) => {
          setCreating(null);
          if (myStickers.length >= MAX_MY_STICKERS) { toast(`${compact(MAX_MY_STICKERS)} stickers maximum : retire-en un d'abord.`); return; }
          try {
            const id = await createSticker(img.uri);
            if (!id) { toast(`${compact(MAX_MY_STICKERS)} stickers maximum : retire-en un d'abord.`); return; }
            setStTab('mine'); setPicker(true); toast('Sticker créé et ajouté à tes stickers');
          } catch (e) {
            toast(errorMessage(e, "Le sticker n'a pas pu être créé. Réessaie."));
          }
        }}
      />
    </View>
  );
});
