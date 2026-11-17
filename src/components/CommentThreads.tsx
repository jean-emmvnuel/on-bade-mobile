// Fil de commentaires d'un bading : arbre sur 4 niveaux, repli des réponses, menus (signaler, supprimer, stickers).
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import Animated, { FadeIn, LinearTransition } from 'react-native-reanimated';

import { compact, descendantIds, MAX_MY_STICKERS, timeAgo, useStore, type CommentNode } from '@/data/store';
import { getSticker } from '@/data/stickers';
import { errorMessage } from '@/lib/api';
import type { Comment } from '@/data/types';
import { colors, space } from '@/theme/tokens';

import { AppText } from './AppText';
import { Avatar } from './Avatar';
import { tap } from './haptics';
import { Button } from './Button';
import { BookmarkPlus, ChevronDown, Laugh, Trash2 } from './icons';
import { VoiceNote } from './VoiceNote';
import { Sticker } from './Sticker';
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
