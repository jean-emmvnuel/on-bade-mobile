import { Image, Text, View } from 'react-native';
import { SvgXml } from 'react-native-svg';

import { useStore } from '@/data/store';
import { getSticker } from '@/data/stickers';
import { fonts } from '@/theme/tokens';

const shadow = { shadowColor: '#000', shadowOpacity: 0.35, shadowRadius: 9, shadowOffset: { width: 0, height: 6 }, elevation: 6 } as const;

/**
 * Un sticker On Bade. Intégré : pastille colorée, contour blanc, légère inclinaison.
 * Personnel (créé par un Badeur) : image carrée à coins arrondis, contour blanc.
 */
export function Sticker({ id, size = 120 }: { id: string; size?: number }) {
  const { customStickers } = useStore();
  const custom = customStickers[id];
  if (custom) {
    if (custom.removed) {
      return (
        <View style={{ width: size, height: size * 0.6, borderRadius: size * 0.16, borderWidth: 1, borderColor: '#333131', alignItems: 'center', justifyContent: 'center', padding: 8 }}>
          <Text style={{ color: '#817d7d', fontSize: 12, textAlign: 'center' }}>Sticker retiré par la modération</Text>
        </View>
      );
    }
    return (
      <View accessible accessibilityRole="image" accessibilityLabel={custom.label ? `Sticker ${custom.label}` : 'Sticker personnel'} style={{ width: size, height: size, borderRadius: size * 0.2, borderWidth: Math.max(3, size * 0.035), borderColor: '#FFFFFF', overflow: 'hidden', backgroundColor: '#2b2929', ...shadow }}>
        {custom.svg ? <SvgXml xml={custom.svg} width="100%" height="100%" /> : <Image source={{ uri: custom.uri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />}
      </View>
    );
  }
  const s = getSticker(id);
  if (!s) return null;
  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={`Sticker ${s.label}`}
      style={{
        width: size,
        minHeight: size * 0.78,
        paddingVertical: size * 0.08,
        paddingHorizontal: size * 0.06,
        borderRadius: size * 0.2,
        backgroundColor: s.bg,
        borderWidth: Math.max(3, size * 0.035),
        borderColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
        gap: size * 0.03,
        transform: [{ rotate: `${s.rot}deg` }],
        ...shadow,
      }}>
      <Text style={{ fontSize: size * 0.34, lineHeight: size * 0.4 }}>{s.emoji}</Text>
      <Text numberOfLines={2} style={{ fontFamily: fonts.display, fontSize: size * 0.135, lineHeight: size * 0.15, color: s.fg, textAlign: 'center', letterSpacing: -0.2 }}>
        {s.label}
      </Text>
    </View>
  );
}
