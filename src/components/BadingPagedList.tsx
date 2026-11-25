import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { BadingCard } from '@/components/BadingCard';
import { useBadingActions } from '@/components/BadingActions';
import { Button } from '@/components/Button';
import { useStore, type Page } from '@/data/store';
import { errorMessage } from '@/lib/api';
import { colors, space } from '@/theme/tokens';

/**
 * Liste de badings chargée page par page (profil d'un Badeur, recherche, hashtag) : la première page à l'ouverture
 * (et à chaque changement de `reloadKey`), la suite en arrivant en bas.
 */
export function BadingPagedList({ load, reloadKey, header, empty }: {
  load: (before?: number) => Promise<Page>;
  reloadKey: string;
  header?: React.ReactElement | null;
  empty: React.ReactElement;
}) {
  const { getBading } = useStore();
  const { open, sheet } = useBadingActions();
  const [ids, setIds] = useState<string[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [more, setMore] = useState<{ hasMore: boolean; nextBefore?: number }>({ hasMore: false });
  const [loadingMore, setLoadingMore] = useState(false);
  const run = useRef(0);

  const first = useCallback(() => {
    const id = ++run.current;
    setIds(null);
    setError(null);
    load().then(
      (p) => { if (id === run.current) { setIds(p.badingIds); setMore({ hasMore: p.hasMore, nextBefore: p.nextBefore }); } },
      (e) => { if (id === run.current) setError(errorMessage(e, 'Les badings n’ont pas pu être chargés.')); },
    );
  }, [load]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { first(); }, [reloadKey]);

  const next = useCallback(() => {
    if (!more.hasMore || loadingMore || !ids?.length) return;
    const id = run.current;
    const before = more.nextBefore ?? getBading(ids[ids.length - 1])?.createdAt;
    setLoadingMore(true);
    load(before).then(
      (p) => { if (id === run.current) { setIds((cur) => [...(cur ?? []), ...p.badingIds.filter((x) => !cur?.includes(x))]); setMore({ hasMore: p.hasMore, nextBefore: p.nextBefore }); } },
      () => { if (id === run.current) setMore((m) => ({ ...m, hasMore: false })); },
    ).finally(() => setLoadingMore(false));
  }, [more, loadingMore, ids, load, getBading]);

  const items = (ids ?? []).map((x) => getBading(x)).filter((b): b is NonNullable<typeof b> => !!b && !b.deleted);
  return (
    <>
      <FlatList
        data={items}
        keyExtractor={(b) => b.id}
        renderItem={({ item }) => <BadingCard b={item} onMore={open} />}
        ListHeaderComponent={header ?? undefined}
        onEndReached={next}
        onEndReachedThreshold={0.6}
        contentContainerStyle={{ paddingBottom: space.xxl }}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          error ? (
            <View style={{ padding: space.xl, gap: space.lg, alignItems: 'flex-start' }}>
              <AppText variant="body" color={colors.text2}>{error}</AppText>
              <Button label="Réessayer" kind="secondary" onPress={first} />
            </View>
          ) : ids === null ? <ActivityIndicator color={colors.brandInk} style={{ marginTop: space.xxl }} /> : empty
        }
        ListFooterComponent={loadingMore ? <ActivityIndicator color={colors.text2} style={{ margin: space.lg }} /> : undefined}
      />
      {sheet}
    </>
  );
}
