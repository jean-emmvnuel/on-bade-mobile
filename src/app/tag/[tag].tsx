import { useLocalSearchParams } from 'expo-router';
import { useCallback } from 'react';
import { View } from 'react-native';

import { AppText } from '@/components/AppText';
import { BadingPagedList } from '@/components/BadingPagedList';
import { ScreenHeader } from '@/components/ScreenHeader';
import { useStore } from '@/data/store';
import { colors, space } from '@/theme/tokens';

/** Page d'un hashtag (comme #/tag/… sur le site) : les badings qui le contiennent, du plus récent au plus ancien. */
export default function HashtagScreen() {
  const { tag: raw } = useLocalSearchParams<{ tag: string }>();
  const tag = String(raw ?? '').replace(/^#/, '').toLowerCase();
  const { loadHashtag } = useStore();
  const load = useCallback((before?: number) => loadHashtag(tag, before), [loadHashtag, tag]);
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScreenHeader title={`#${tag}`} />
      <BadingPagedList load={load} reloadKey={tag}
        header={<AppText variant="meta" color={colors.text2} style={{ paddingHorizontal: space.lg, paddingVertical: space.md }}>Les badings avec #{tag}, du plus récent au plus ancien.</AppText>}
        empty={<AppText variant="body" color={colors.text2} style={{ padding: space.xl }}>Aucun bading avec #{tag} pour l’instant.</AppText>} />
    </View>
  );
}
