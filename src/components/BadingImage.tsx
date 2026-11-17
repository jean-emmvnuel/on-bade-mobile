import { Image, Pressable } from 'react-native';

import type { BadingImage as Img } from '@/data/types';
import { colors, radius } from '@/theme/tokens';

/**
 * Image d'un bading, au ratio choisi au recadrage. `maxHeight` limite les images en hauteur dans le fil :
 * c'est la largeur qui est réduite (maxWidth = maxHeight × ratio), pour ne jamais rogner l'image recadrée par son auteur.
 */
export function BadingImage({ image, maxHeight = 460, onPress, marginTop = 8 }: { image: Img; maxHeight?: number; onPress?: () => void; marginTop?: number }) {
  const ratio = image.width / image.height;
  return (
    <Pressable
      disabled={!onPress}
      onPress={onPress}
      accessibilityRole={onPress ? 'imagebutton' : 'image'}
      accessibilityLabel="Image du bading"
      style={{ marginTop, borderRadius: radius.lg, overflow: 'hidden', backgroundColor: colors.surface2, borderWidth: 1, borderColor: colors.line, width: '100%', maxWidth: maxHeight * ratio, alignSelf: 'flex-start', aspectRatio: ratio }}>
      <Image source={{ uri: image.uri }} resizeMode="cover" style={{ width: '100%', height: '100%' }} />
    </Pressable>
  );
}
