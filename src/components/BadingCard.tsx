import { router } from 'expo-router';
import { Bookmark, Ellipsis, MessageCircle, Pin, Repeat2, Share2 } from '@/components/icons';
import { memo } from 'react';
import { Pressable, View } from 'react-native';

import { compact, displayName, timeAgo, useStore } from '@/data/store';
import type { Bading } from '@/data/types';
import { colors, radius, space } from '@/theme/tokens';

import { AppText } from './AppText';
import { BadingImage } from './BadingImage';
import { BubbleTail, bubbleStyle } from './Bubble';
import { Avatar } from './Avatar';
import { LaughButton } from './LaughButton';
import { PressableScale } from './PressableScale';
import { RichText } from './RichText';
import { useShare } from './ShareSheet';
import { useToast } from './Toast';
import { Verified } from './Verified';

function Author({ b, size = 'md' }: { b: Bading; size?: 'md' | 'sm' }) {
  const { users } = useStore();
  const { name, handle, user } = displayName(b, users);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 }}>
      {size === 'sm' && <Avatar user={b.anonymous ? null : user} size={22} />}
      <AppText variant="label" numberOfLines={1} style={{ flexShrink: 1 }} color={b.anonymous ? colors.text2 : colors.text}>
        {name}
      </AppText>
      {user?.verified && !b.anonymous && <Verified size={15} />}
      {handle && size === 'md' && (
        <AppText variant="meta" color={colors.text3} numberOfLines={1} style={{ flexShrink: 2 }}>
          {handle}
        </AppText>
      )}
      <AppText variant="meta" color={colors.text3}>· {timeAgo(b.createdAt)}</AppText>
    </View>
  );
}

/** The original bading, framed inside a rebade (RG2) — or the "no longer available" notice (RG4). */
export function QuotedBading({ id }: { id: string }) {
  const { getBading } = useStore();
  const q = getBading(id);
  if (!q || q.deleted) {
    return (
      <View style={{ borderWidth: 1, borderColor: colors.line, borderRadius: radius.lg, padding: space.lg, marginTop: space.sm }}>
        <AppText variant="meta" color={colors.text2}>Ce bading n'est plus disponible.</AppText>
      </View>
    );
  }
  return (
    <Pressable
      onPress={() => router.push(`/bading/${q.id}`)}
      accessibilityRole="link"
      accessibilityLabel="Ouvrir le bading d'origine"
      style={({ pressed }) => ({ borderWidth: 1, borderColor: colors.line, borderRadius: radius.lg, padding: space.md, marginTop: space.sm, backgroundColor: pressed ? colors.surface : 'rgba(26,25,25,0.6)', gap: 6 })}>
      <Author b={q} size="sm" />
      {!!q.text && <RichText variant="body" numberOfLines={6}>{q.text}</RichText>}
      {q.image && <BadingImage image={q.image} maxHeight={220} marginTop={2} />}
    </Pressable>
  );
}

/** Favourite toggle: private bookmark list shown in Profil → Favoris. */
export function FavoriteButton({ id, size = 20 }: { id: string; size?: number }) {
  const { favorites, toggleFavorite } = useStore();
  const toast = useToast();
  const on = favorites.includes(id);
  return (
    <PressableScale
      onPress={() => toast(toggleFavorite(id) ? 'Ajouté à tes favoris' : 'Retiré de tes favoris')}
      scaleTo={0.85}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={on ? 'Retirer des favoris' : 'Ajouter aux favoris'}
      accessibilityState={{ selected: on }}
      style={{ minHeight: 44, minWidth: 44, alignItems: 'center', justifyContent: 'center' }}>
      <Bookmark size={size} color={on ? colors.brandInk : colors.text2} fill={on ? colors.brandInk : 'transparent'} strokeWidth={1.8} />
    </PressableScale>
  );
}

function ActionIcon({ icon, label, count, onPress }: { icon: React.ReactNode; label: string; count?: number; onPress: () => void }) {
  return (
    <PressableScale onPress={onPress} hitSlop={8} accessibilityRole="button" accessibilityLabel={label} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 44, minWidth: 48 }}>
      {icon}
      {count !== undefined && <AppText variant="meta" color={colors.text2} style={{ fontVariant: ['tabular-nums'] }}>{compact(count)}</AppText>}
    </PressableScale>
  );
}

/** `pin` : bading épinglé par l'équipe en tête du fil ; la chaîne est son étiquette (vide : « Épinglé »). */
export const BadingCard = memo(function BadingCard({ b, onMore, pin }: { b: Bading; onMore?: (b: Bading) => void; pin?: string }) {
  const { users, toggleLike, getBading, session, commentCount } = useStore();
  const openShare = useShare();
  const { user } = displayName(b, users);
  const isRebade = !!b.rebadeOf;
  const plainRebade = isRebade && !b.text;
  const origin = isRebade ? getBading(b.rebadeOf!) : b;
  const actionTarget = plainRebade && origin ? origin : b;
  const rebaderName = b.anonymous ? 'Un Badeur anonyme' : b.authorId === session?.user.id ? 'Tu' : `@${user?.pseudo}`;

  const n = displayName(actionTarget, users);
  const author = actionTarget.anonymous ? null : users[actionTarget.authorId] ?? null;
  const anon = !!actionTarget.anonymous;

  // Carte « bulle » : le récit dans une bulle arrondie, l'auteur en tête, le texte sur toute la largeur.
  return (
    <Pressable
      onPress={() => router.push(`/bading/${actionTarget.id}`)}
      accessibilityHint="Ouvre le bading"
      style={({ pressed }) => [bubbleStyle(anon, pressed), { marginHorizontal: space.md, marginBottom: space.lg + 2, paddingHorizontal: space.lg, paddingTop: space.md, paddingBottom: space.xs, gap: 10 }]}>
      {({ pressed }) => (
        <>
          {pin !== undefined && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }} accessibilityLabel={pin ? `Épinglé : ${pin}` : 'Épinglé'}>
              <Pin size={14} color={colors.brandInk} />
              <AppText variant="small" color={colors.brandInk}>{pin || 'Épinglé'}</AppText>
            </View>
          )}
          {plainRebade && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Repeat2 size={14} color={colors.text3} />
              <AppText variant="small" color={colors.text3}>{rebaderName} {b.authorId === session?.user.id ? 'as rebadé' : 'a rebadé'}</AppText>
            </View>
          )}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            {/* Auteur signé : son profil au toucher (jamais pour un bading anonyme) */}
            <Pressable disabled={anon || !author} onPress={() => author && router.push({ pathname: '/u/[id]', params: { id: author.id } })}
              accessibilityRole={anon ? undefined : 'link'} accessibilityLabel={anon ? undefined : `Profil de ${n.name}`}
              style={{ flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Avatar user={author} size={40} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <AppText variant="label" numberOfLines={1} style={{ flexShrink: 1 }} color={anon ? colors.text2 : colors.text}>{n.name}</AppText>
                {author?.verified && <Verified size={15} />}
              </View>
              <AppText variant="meta" color={colors.text3} numberOfLines={1}>{n.handle && !anon ? `${n.handle} · ` : ''}{timeAgo(actionTarget.createdAt)}</AppText>
            </View>
            </Pressable>
            {onMore && (
              <Pressable onPress={() => onMore(actionTarget)} hitSlop={12} accessibilityRole="button" accessibilityLabel="Plus d'options" style={{ width: 36, height: 36, alignItems: 'center', justifyContent: 'center' }}>
                <Ellipsis size={18} color={colors.text3} />
              </Pressable>
            )}
          </View>
          {plainRebade ? (
            origin && !origin.deleted ? (
              <>
                {!!origin.text && <RichText variant="story">{origin.text}</RichText>}
                {origin.image && <BadingImage image={origin.image} />}
              </>
            ) : <QuotedBading id={b.rebadeOf!} />
          ) : (
            <>
              {!!b.text && <RichText variant="story">{b.text}</RichText>}
              {b.image && <BadingImage image={b.image} />}
              {isRebade && <QuotedBading id={b.rebadeOf!} />}
            </>
          )}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingTop: space.sm, marginHorizontal: -4, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)' }}>
            <LaughButton active={actionTarget.likedByMe} count={actionTarget.likes} onToggle={() => toggleLike(actionTarget.id)} />
            <ActionIcon icon={<MessageCircle size={19} color={colors.text2} strokeWidth={1.8} />} label={`Commenter, ${commentCount(actionTarget.id)} commentaires`} count={commentCount(actionTarget.id)} onPress={() => router.push({ pathname: '/bading/[id]', params: { id: actionTarget.id, focus: 'comment' } })} />
            <ActionIcon icon={<Repeat2 size={21} color={colors.text2} strokeWidth={1.8} />} label={`Rebader, ${actionTarget.rebades} rebades`} count={actionTarget.rebades} onPress={() => router.push(`/rebade/${actionTarget.id}`)} />
            <ActionIcon icon={<Share2 size={19} color={colors.text2} strokeWidth={1.8} />} label="Partager" onPress={() => openShare(actionTarget)} />
            <View style={{ flex: 1 }} />
            <FavoriteButton id={actionTarget.id} />
          </View>
          <BubbleTail anonymous={anon} pressed={pressed} />
        </>
      )}
    </Pressable>
  );
});
