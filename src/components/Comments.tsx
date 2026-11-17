import { router } from 'expo-router';
import { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { FlatList, Pressable, ScrollView, TextInput, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, LinearTransition } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { compact, descendantIds, MAX_MY_STICKERS, RULES, timeAgo, useStore } from '@/data/store';
import { STICKER_THEMES, STICKERS, getSticker } from '@/data/stickers';
import { errorMessage } from '@/lib/api';
import { pickImage, type PickedImage } from '@/lib/pickImage';
import type { Comment } from '@/data/types';
import { colors, fonts, radius, space } from '@/theme/tokens';

import { AppText } from './AppText';
import { Avatar } from './Avatar';
import { tap } from './haptics';
import { Button } from './Button';
import { ImageCropper } from './ImageCropper';
import { BookmarkPlus, Laugh, Plus, StickerIcon, Trash2, X } from './icons';
import { Sticker } from './Sticker';
import { PressableScale } from './PressableScale';
import { RichText } from './RichText';
import { Sheet, SheetItem } from './Sheet';
import { useToast } from './Toast';
import { Verified } from './Verified';

function CommentRow({ c, reply, onReply, onMore, onDelete, onSticker }: { c: Comment; reply?: boolean; onReply: (c: Comment) => void; onMore: (c: Comment) => void; onDelete: (c: Comment) => void; onSticker: (id: string) => void }) {
  const { users, toggleCommentLike, session } = useStore();
  const mine = c.authorId === session?.user.id;
  const u = users[c.authorId];
  return (
    <Animated.View entering={FadeIn.duration(240)} layout={LinearTransition} style={{ flexDirection: 'row', gap: space.md, paddingLeft: reply ? 52 : 0 }}>
      <Pressable onPress={() => onMore(c)} onLongPress={() => onMore(c)} accessibilityLabel={`Profil de ${u?.pseudo}`}>
        <Avatar user={u ?? null} size={reply ? 28 : 36} />
      </Pressable>
      <View style={{ flex: 1, gap: 3 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <AppText variant="label" style={{ fontSize: 14 }}>{u?.pseudo ?? 'Badeur'}</AppText>
          {u?.verified && <Verified size={13} />}
          <AppText variant="small" color={colors.text3}>· {timeAgo(c.createdAt)}</AppText>
        </View>
        {c.replyTo && <AppText variant="small" color={colors.text3}>en réponse à <AppText variant="small" color={colors.brandInk}>@{c.replyTo}</AppText></AppText>}
        {c.sticker ? (
          <Pressable onPress={() => onSticker(c.sticker!)} accessibilityHint="Ajouter ce sticker à tes stickers" style={{ alignSelf: 'flex-start', paddingVertical: 8, paddingHorizontal: 4 }}>
            <Sticker id={c.sticker} size={reply ? 100 : 116} />
          </Pressable>
        ) : (
          <RichText variant="body">{c.text}</RichText>
        )}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.lg, marginTop: 2 }}>
          <Pressable onPress={() => { tap(); toggleCommentLike(c.id); }} hitSlop={10} accessibilityRole="button" accessibilityLabel={c.likedByMe ? 'Retirer mon rire' : 'Rire à ce commentaire'} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 32 }}>
            <Laugh size={15} color={c.likedByMe ? colors.brandInk : colors.text3} fill={c.likedByMe ? colors.brandSoft : 'transparent'} />
            {c.likes > 0 && <AppText variant="small" color={c.likedByMe ? colors.brandInk : colors.text3}>{c.likes}</AppText>}
          </Pressable>
          <Pressable onPress={() => onReply(c)} hitSlop={10} accessibilityRole="button" style={{ minHeight: 32, justifyContent: 'center' }}>
            <AppText variant="small" color={colors.text2}>Répondre</AppText>
          </Pressable>
          {mine && (
            <Pressable onPress={() => onDelete(c)} hitSlop={10} accessibilityRole="button" accessibilityLabel="Supprimer mon commentaire" style={{ flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 32 }}>
              <Trash2 size={14} color={colors.text3} />
              <AppText variant="small" color={colors.text3}>Supprimer</AppText>
            </Pressable>
          )}
          <Pressable onPress={() => onMore(c)} hitSlop={10} accessibilityRole="button" accessibilityLabel="Options du commentaire" style={{ minHeight: 32, justifyContent: 'center' }}>
            <AppText variant="small" color={colors.text3}>•••</AppText>
          </Pressable>
        </View>
      </View>
    </Animated.View>
  );
}

// Tree lines: a rail drops from the root avatar (36 px, centre x = 18) and curves
// into every reply avatar (28 px, at x = 52). Geometry is measured, not guessed.
const RAIL_X = 17;
const ROOT_AVATAR = 36;
const ELBOW_R = 12;

function Thread({ children }: { children: React.ReactNode }) {
  const items = (Array.isArray(children) ? children.flat() : [children]).filter(Boolean) as React.ReactElement[];
  const [root, ...branches] = items;
  const [ends, setEnds] = useState<Record<number, number>>({});
  const lastIndex = branches.length - 1;
  const railBottom = ends[lastIndex];
  return (
    <View style={{ gap: space.md }}>
      {root}
      {branches.length > 0 && railBottom !== undefined && (
        <View pointerEvents="none" style={{ position: 'absolute', left: RAIL_X, top: ROOT_AVATAR + 4, width: 2, height: Math.max(0, railBottom - (ROOT_AVATAR + 4)), backgroundColor: colors.line, borderRadius: 1 }} />
      )}
      {branches.map((child, i) => (
        <View key={child.key ?? i} onLayout={(e) => { const y = e.nativeEvent.layout.y + 2; setEnds((m) => (m[i] === y ? m : { ...m, [i]: y })); }}>
          <View pointerEvents="none" style={{ position: 'absolute', left: RAIL_X, top: 2, width: 52 - RAIL_X - 4, height: ELBOW_R, borderLeftWidth: 2, borderBottomWidth: 2, borderBottomLeftRadius: ELBOW_R, borderColor: colors.line }} />
          {child}
        </View>
      ))}
    </View>
  );
}

/** Comment threads: each root, then every reply below it (replies to replies included) in time order, folded after 2. */
export function CommentThreads({ badingId, onReply }: { badingId: string; onReply: (c: Comment) => void }) {
  const { commentsFor, comments, session, removeComment, reportComment, myStickers, saveSticker, customStickers, users } = useStore();
  const toast = useToast();
  const [stickerMenu, setStickerMenu] = useState<string | null>(null);
  const stickerOwner = stickerMenu ? customStickers[stickerMenu]?.ownerId : undefined;
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [menu, setMenu] = useState<Comment | null>(null);
  const [confirm, setConfirm] = useState<Comment | null>(null);
  const threads = commentsFor(badingId);
  const confirmHasReplies = !!confirm && [...descendantIds(comments, confirm.id)].some((id) => comments.some((c) => c.id === id && !c.deleted));

  if (threads.length === 0) {
    return (
      <View style={{ padding: space.xl, alignItems: 'center', gap: 6 }}>
        <AppText variant="heading">Pas encore de commentaire</AppText>
        <AppText variant="body" color={colors.text2} style={{ textAlign: 'center' }}>Lance la discussion, dis ce que ça t'a fait.</AppText>
      </View>
    );
  }

  return (
    <View style={{ padding: space.lg, gap: space.xl }}>
      {threads.map(({ root, replies }) => {
        // Threads I took part in stay unfolded, so answers to me are always visible.
        const mine = root.authorId === session?.user.id || replies.some((r) => r.authorId === session?.user.id);
        const state = open[root.id]; // true = open, false = collapsed, undefined = automatic
        const collapsed = state === false;
        const expanded = state ?? mine;
        const shown = collapsed ? [] : expanded ? replies : replies.slice(0, 2);
        const hidden = replies.length - shown.length;
        const toggle = (v: boolean) => setOpen((o) => ({ ...o, [root.id]: v }));
        return (
          <Thread key={root.id}>
            <CommentRow c={root} onReply={onReply} onMore={setMenu} onDelete={setConfirm} onSticker={setStickerMenu} />
            {shown.map((r) => (
              <CommentRow key={r.id} c={r} reply onReply={onReply} onMore={setMenu} onDelete={setConfirm} onSticker={setStickerMenu} />
            ))}
            {hidden > 0 && (
              <Pressable onPress={() => toggle(true)} hitSlop={6} style={{ paddingLeft: 52, minHeight: 28, justifyContent: 'center' }} accessibilityRole="button" accessibilityState={{ expanded: false }}>
                <AppText variant="small" color={colors.brandInk}>
                  {collapsed ? `▸ Afficher ${replies.length > 1 ? `les ${replies.length} réponses` : 'la réponse'}` : hidden > 1 ? `Voir les ${hidden} autres réponses` : 'Voir 1 autre réponse'}
                </AppText>
              </Pressable>
            )}
            {replies.length > 0 && !collapsed && hidden === 0 && (
              <Pressable onPress={() => toggle(false)} hitSlop={6} style={{ paddingLeft: 52, minHeight: 28, justifyContent: 'center' }} accessibilityRole="button" accessibilityState={{ expanded: true }}>
                <AppText variant="small" color={colors.text3}>▾ Masquer les réponses</AppText>
              </Pressable>
            )}
          </Thread>
        );
      })}
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
            {confirmHasReplies ? 'Les réponses à ce commentaire seront aussi supprimées. ' : ''}C'est définitif.
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
  const tabIds = stTab === 'recent' ? recentStickers : stTab === 'mine' ? myStickers : STICKERS.filter((x) => x.theme === stTab).map((x) => x.id);

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
            {[['recent', 'Récents'], ['mine', 'Mes stickers'], ...STICKER_THEMES.filter(([k]) => k !== 'recent')].map(([k, l]) => (
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
        <PressableScale
          onPress={send}
          disabled={!text.trim() || tooLong || sending}
          accessibilityRole="button"
          accessibilityLabel="Publier le commentaire"
          style={{ height: 40, paddingHorizontal: 16, borderRadius: radius.pill, backgroundColor: colors.brand, alignItems: 'center', justifyContent: 'center', opacity: !text.trim() || tooLong ? 0.4 : 1 }}>
          <AppText variant="label" color={colors.onBrand}>Publier</AppText>
        </PressableScale>
      </View>
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
