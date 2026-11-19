// Fil de commentaires d'un bading : arbre sur 4 niveaux, repli des réponses, menus (signaler, supprimer, stickers).
import { router } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import Animated, { FadeIn, LinearTransition } from 'react-native-reanimated';

import { compact, descendantIds, MAX_MY_STICKERS, timeAgo, useStore, type CommentNode } from '@/data/store';
import { getSticker } from '@/data/stickers';
import { errorMessage } from '@/lib/api';
import type { Comment } from '@/data/types';

/** Élément affiché (sa position à l'écran sert à défiler jusqu'au commentaire ciblé). */
export type HostView = React.ComponentRef<typeof View>;
import { colors, fonts, radius, space } from '@/theme/tokens';

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
  /** Commentaire ouvert depuis une notification : encadré, et sa position est donnée à l'écran pour y défiler. */
  highlighted?: boolean; onTargetLayout?: (view: HostView) => void;
  /** Premier commentaire du bading : médaille « 🥇 Premier commentaire ». */
  first?: boolean;
  c: Comment; reply?: boolean; showReplyTo?: boolean; replyCount?: number; collapsed?: boolean; onToggle?: () => void;
  onReply: (c: Comment) => void; onMore: (c: Comment) => void; onDelete: (c: Comment) => void; onSticker: (id: string) => void;
};

function CommentRow({ c, reply, showReplyTo, replyCount = 0, collapsed, onToggle, onReply, onMore, onDelete, onSticker, highlighted, onTargetLayout, first }: RowProps) {
  const rowRef = useRef<HostView>(null);
  const { users, toggleCommentLike, session } = useStore();
  const mine = c.authorId === session?.user.id;
  const u = users[c.authorId];
  return (
    <Animated.View ref={rowRef} entering={FadeIn.duration(240)} layout={LinearTransition}
      onLayout={highlighted && onTargetLayout ? () => { if (rowRef.current) onTargetLayout(rowRef.current); } : undefined}
      style={[{ flexDirection: 'row', gap: space.md }, highlighted && { margin: -6, padding: 6, borderRadius: radius.md, borderWidth: 2, borderColor: colors.brandInk, backgroundColor: colors.brandSoft }]}>
      <Pressable onPress={() => onMore(c)} onLongPress={() => onMore(c)} accessibilityLabel={`Profil de ${u?.pseudo}`}>
        <Avatar user={u ?? null} size={reply ? 28 : 36} />
      </Pressable>
      <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <AppText variant="label" style={{ fontSize: 14, flexShrink: 1 }} numberOfLines={1}>{u?.pseudo ?? 'Badeur'}</AppText>
          {u?.verified && <Verified size={13} />}
          <AppText variant="small" color={colors.text3}>· {timeAgo(c.createdAt)}</AppText>
          {first && (
            <View accessibilityLabel="Premier commentaire" style={{ paddingHorizontal: 8, paddingVertical: 1, borderRadius: radius.pill, backgroundColor: 'rgba(255,201,60,0.14)' }}>
              <AppText variant="small" color="#FFC93C" style={{ fontSize: 11.5, fontFamily: fonts.bodyBold }}>🥇 Premier commentaire</AppText>
            </View>
          )}
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
  highlight: string | null; onTargetLayout?: (view: HostView) => void; firstId: string | null;
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
        onToggle={() => ctx.setOpen(c.id, collapsed)} {...ctx.row}
        highlighted={ctx.highlight === c.id} onTargetLayout={ctx.onTargetLayout} first={ctx.firstId === c.id} />
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
/**
 * `target` : commentaire ouvert depuis une notification. Ses commentaires parents sont dépliés, il est encadré quelques
 * secondes et `onTarget(view)` permet à l'écran d'y défiler. Introuvable une fois la liste chargée (`loaded`) :
 * `onTargetMissing()` (commentaire supprimé ou masqué).
 */
export function CommentThreads({ badingId, onReply, target, loaded = true, onTarget, onTargetMissing, onFirstComment }: {
  badingId: string; onReply: (c: Comment) => void;
  /** Bouton de l'état vide (pas encore de commentaire) : ouvre la saisie. */
  onFirstComment?: () => void;
  target?: string; loaded?: boolean; onTarget?: (view: HostView) => void; onTargetMissing?: () => void;
}) {
  const { commentTree, comments, session, removeComment, reportComment, myStickers, saveSticker, customStickers, users } = useStore();
  const toast = useToast();
  const [stickerMenu, setStickerMenu] = useState<string | null>(null);
  const stickerOwner = stickerMenu ? customStickers[stickerMenu]?.ownerId : undefined;
  const [open, setOpenState] = useState<Record<string, boolean>>({});
  const [menu, setMenu] = useState<Comment | null>(null);
  const [confirm, setConfirm] = useState<Comment | null>(null);
  const tree = commentTree(badingId);
  // Premier commentaire encore visible (le plus ancien, réponses comprises) : il porte la médaille.
  const firstId = useMemo(() => {
    let first: Comment | null = null;
    const walk = (nodes: CommentNode[]) => nodes.forEach((n) => { if (!first || n.comment.createdAt < first.createdAt) first = n.comment; walk(n.children); });
    walk(tree);
    return (first as Comment | null)?.id ?? null;
  }, [tree]);
  const [highlight, setHighlight] = useState<string | null>(null);
  const targetDone = useRef(false);
  const scrolled = useRef(false);
  useEffect(() => {
    if (!target || targetDone.current) return;
    const byId = new Map(comments.filter((x) => x.badingId === badingId && !x.deleted).map((x) => [x.id, x]));
    const found = byId.get(target);
    if (!found) {
      if (loaded) { targetDone.current = true; onTargetMissing?.(); }
      return;
    }
    targetDone.current = true;
    const ancestors: string[] = [];
    for (let p = found.parentId ? byId.get(found.parentId) : undefined; p; p = p.parentId ? byId.get(p.parentId) : undefined) ancestors.push(p.id);
    setOpenState((o) => ({ ...o, ...Object.fromEntries(ancestors.map((a) => [a, true])) }));
    setHighlight(target);
  }, [target, comments, badingId, loaded, onTargetMissing]);
  // L'encadré s'efface après quelques secondes.
  useEffect(() => {
    if (!highlight) return;
    const t = setTimeout(() => setHighlight(null), 4000);
    return () => clearTimeout(t);
  }, [highlight]);
  const confirmHasReplies = !!confirm && [...descendantIds(comments, confirm.id)].some((id) => comments.some((c) => c.id === id && !c.deleted));


  const ctx: TreeCtx = {
    highlight, firstId,
    // Une seule fois : défiler jusqu'au commentaire ciblé quand il est en place.
    onTargetLayout: (view) => { if (!scrolled.current) { scrolled.current = true; onTarget?.(view); } },
    open, setOpen: (id, v) => setOpenState((o) => ({ ...o, [id]: v })), me: session?.user.id,
    pseudoOf: (id) => users[id]?.pseudo,
    row: { onReply, onMore: setMenu, onDelete: setConfirm, onSticker: setStickerMenu },
  };

  if (tree.length === 0) {
    return (
      <View style={{ padding: space.xl, alignItems: 'center', gap: 8 }}>
        <AppText style={{ fontSize: 34, lineHeight: 40 }} accessibilityElementsHidden>🥇</AppText>
        <AppText variant="heading" style={{ textAlign: 'center' }}>Personne n'a encore commenté</AppText>
        <AppText variant="body" color={colors.text2} style={{ textAlign: 'center' }}>Sois le premier à réagir : le premier commentaire porte la médaille.</AppText>
        {onFirstComment && <Button label="Écrire le premier commentaire" size="md" onPress={onFirstComment} style={{ marginTop: space.sm }} />}
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
