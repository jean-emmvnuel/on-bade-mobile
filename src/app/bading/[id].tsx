import { router, useLocalSearchParams } from 'expo-router';
import { Ellipsis, MessageCircle, Repeat2, Share2 } from '@/components/icons';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { AppText } from '@/components/AppText';
import { Avatar } from '@/components/Avatar';
import { BadingCard, FavoriteButton } from '@/components/BadingCard';
import { useShare } from '@/components/ShareSheet';
import { useBadingActions } from '@/components/BadingActions';
import { Button } from '@/components/Button';
import { ImageViewer } from '@/components/ImageViewer';
import { Bubble } from '@/components/Bubble';
import { CommentComposer, CommentThreads, type ComposerHandle } from '@/components/Comments';
import type { HostView } from '@/components/CommentThreads';
import { LaughButton } from '@/components/LaughButton';
import { RichText } from '@/components/RichText';
import { BadingImage } from '@/components/BadingImage';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Verified } from '@/components/Verified';
import { useToast } from '@/components/Toast';
import { compact, displayName, useStore } from '@/data/store';
import { errorMessage } from '@/lib/api';
import { colors, space } from '@/theme/tokens';

export default function BadingDetail() {
  // `comment` : ouvert depuis une notification de commentaire, de réponse ou de mention → on montre ce commentaire.
  const { id, focus, comment } = useLocalSearchParams<{ id: string; focus?: string; comment?: string }>();
  const { getBading, loadBading, users, feed, toggleLike, pendingLink, setPendingLink, commentCount, simulateReply, addView, session } = useStore();
  // Le bading, ses commentaires et ses rebades viennent du serveur ; la version en cache s'affiche en attendant.
  const [load, setLoad] = useState<{ state: 'loading' | 'ok' | 'missing' | 'error'; message?: string }>({ state: 'loading' });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let alive = true;
    setLoad({ state: 'loading' });
    loadBading(id)
      .then((r) => { if (alive) setLoad({ state: r }); })
      .catch((e) => { if (alive) setLoad({ state: 'error', message: errorMessage(e) }); });
    return () => { alive = false; };
  }, [id, loadBading, attempt]);
  // Une vue par ouverture (les siennes ne comptent pas).
  const viewed = useRef(false);
  useEffect(() => {
    const x = getBading(id);
    if (!viewed.current && x && !x.deleted && x.authorId !== session?.user.id) { viewed.current = true; addView(id); }
  }, [id, getBading, addView, session]);
  const composer = useRef<ComposerHandle>(null);
  const scroller = useRef<React.ComponentRef<typeof ScrollView>>(null);
  const scrollY = useRef(0);
  const toast = useToast();
  /** Défile jusqu'au commentaire ciblé (un peu sous le haut de l'écran), une fois les réponses dépliées. */
  const scrollToComment = useCallback((view: HostView) => {
    setTimeout(() => {
      view.measure((_x, _y, _w, _h, _px, rowY) => {
        (scroller.current as unknown as HostView | null)?.measure((_a, _b, _c, _d, _e, top) => {
          scroller.current?.scrollTo({ y: Math.max(0, scrollY.current + rowY - top - 140), animated: true });
        });
      });
    }, 250);
  }, []);
  const onCommentMissing = useCallback(() => toast('Ce commentaire a été supprimé.'), [toast]);
  const [tab, setTab] = useState<'comments' | 'rebades'>('comments');
  const [zoom, setZoom] = useState(false);
  useEffect(() => {
    if (focus === 'comment') setTimeout(() => composer.current?.focus(), 400);
  }, [focus]);
  const openShare = useShare();
  useEffect(() => {
    if (pendingLink === id) setPendingLink(null);
  }, [pendingLink, id, setPendingLink]);
  const { open, sheet } = useBadingActions();
  const b = getBading(id);

  if (!b && load.state === 'loading') {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <ScreenHeader title="Bading" />
        <ActivityIndicator color={colors.text2} style={{ marginTop: space.xxl }} accessibilityLabel="Chargement du bading" />
      </View>
    );
  }

  if (!b && load.state === 'error') {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <ScreenHeader title="Bading" />
        <View style={{ padding: space.xl, gap: space.lg }}>
          <AppText variant="title">Impossible de charger ce bading.</AppText>
          <AppText variant="body" color={colors.text2}>{load.message}</AppText>
          <Button label="Réessayer" kind="secondary" onPress={() => setAttempt((n) => n + 1)} />
        </View>
      </View>
    );
  }

  if (!b || b.deleted) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <ScreenHeader title="Bading" />
        <View style={{ padding: space.xl, gap: space.lg }}>
          <AppText variant="title">Ce bading n'est plus disponible.</AppText>
          <AppText variant="body" color={colors.text2}>Son auteur l'a supprimé, ou il a été retiré par la modération.</AppText>
          <Button label="Retour au fil" kind="secondary" onPress={() => router.replace('/(tabs)')} />
        </View>
      </View>
    );
  }

  const { name, handle, user } = displayName(b, users);
  const rebades = feed.filter((r) => r.rebadeOf === b.id && r.text);
  const date = new Date(b.createdAt).toLocaleString('fr-FR', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' });

  const nComments = commentCount(b.id);
  const Tab = ({ k, label }: { k: typeof tab; label: string }) => (
    <Pressable onPress={() => setTab(k)} accessibilityRole="tab" accessibilityState={{ selected: tab === k }} style={{ flex: 1, height: 48, alignItems: 'center', justifyContent: 'center', borderBottomWidth: 2, borderBottomColor: tab === k ? colors.brand : 'transparent' }}>
      <AppText variant="label" color={tab === k ? colors.text : colors.text3}>{label}</AppText>
    </Pressable>
  );

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScreenHeader title="Bading" right={<Pressable onPress={() => open(b)} accessibilityRole="button" accessibilityLabel="Plus d'options" style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}><Ellipsis size={20} color={colors.text2} /></Pressable>} />
      <ScrollView ref={scroller} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: space.xl }}
        scrollEventThrottle={64} onScroll={(e) => { scrollY.current = e.nativeEvent.contentOffset.y; }}>
        <Animated.View entering={FadeIn.duration(260)} style={{ padding: space.md, paddingBottom: space.xl }}>
         <Bubble anonymous={!!b.anonymous} style={{ padding: space.lg, paddingBottom: space.sm, gap: space.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
            <Avatar user={b.anonymous ? null : user} size={48} />
            <View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <AppText variant="bodyStrong" color={b.anonymous ? colors.text2 : colors.text}>{name}</AppText>
                {user?.verified && !b.anonymous && <Verified />}
              </View>
              {handle && <AppText variant="meta" color={colors.text3}>{handle}</AppText>}
            </View>
          </View>
          {!!b.text && <RichText variant="story">{b.text}</RichText>}
          {b.image && <BadingImage image={b.image} maxHeight={2000} onPress={() => setZoom(true)} />}
          {/* Comme sur le site : rires, commentaires et rebades comptés une seule fois, sur les boutons ; les vues seulement pour l'auteur. */}
          <AppText variant="meta" color={colors.text3}>{date}{b.authorId === session?.user.id ? ` · ${compact(b.views ?? 0)} vue${(b.views ?? 0) > 1 ? 's' : ''}` : ''}</AppText>
          <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
            <LaughButton active={b.likedByMe} count={b.likes} onToggle={() => toggleLike(b.id)} />
            <Pressable onPress={() => composer.current?.focus()} accessibilityRole="button" accessibilityLabel={`Commenter, ${nComments} commentaires`} style={{ minHeight: 44, minWidth: 44, flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center' }}><MessageCircle size={21} color={colors.text2} />{nComments > 0 && <AppText variant="meta" color={colors.text2}>{compact(nComments)}</AppText>}</Pressable>
            <Pressable onPress={() => router.push(`/rebade/${b.id}`)} accessibilityRole="button" accessibilityLabel={`Rebader, ${b.rebades} rebades`} style={{ minHeight: 44, minWidth: 44, flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center' }}><Repeat2 size={22} color={colors.text2} />{b.rebades > 0 && <AppText variant="meta" color={colors.text2}>{compact(b.rebades)}</AppText>}</Pressable>
            <Pressable onPress={() => openShare(b)} accessibilityRole="button" accessibilityLabel="Partager" style={{ minHeight: 44, minWidth: 44, alignItems: 'center', justifyContent: 'center' }}><Share2 size={20} color={colors.text2} /></Pressable>
            <FavoriteButton id={b.id} size={21} />
          </View>
         </Bubble>
        </Animated.View>
        <View accessibilityRole="tablist" style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: colors.line }}>
          <Tab k="comments" label={`Commentaires${nComments ? ` · ${nComments}` : ''}`} />
          <Tab k="rebades" label={`Rebades avec avis${rebades.length ? ` · ${rebades.length}` : ''}`} />
        </View>
        {tab === 'comments' ? (
          <CommentThreads badingId={b.id} onReply={(c) => composer.current?.replyTo(c)}
            target={comment} loaded={load.state !== 'loading'} onTarget={scrollToComment} onTargetMissing={onCommentMissing} />
        ) : rebades.length ? (
          rebades.map((r) => <BadingCard key={r.id} b={r} onMore={open} />)
        ) : (
          <AppText variant="body" color={colors.text2} style={{ padding: space.lg }}>Pas encore de rebade avec avis. Sois le premier à donner le tien.</AppText>
        )}
      </ScrollView>
      <CommentComposer ref={composer} badingId={b.id} onSent={(c) => { simulateReply(c); setTab('comments'); setTimeout(() => scroller.current?.scrollToEnd({ animated: true }), 150); }} />
      {sheet}
      {b.image && (
        <ImageViewer image={b.image} visible={zoom} onClose={() => setZoom(false)} />
      )}
    </KeyboardAvoidingView>
  );
}
