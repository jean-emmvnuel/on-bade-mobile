import { VenetianMask } from '@/components/icons';
import { Image, View } from 'react-native';

import type { User } from '@/data/types';
import { colors, fonts } from '@/theme/tokens';

import { AppText } from './AppText';

/** Photo de profil importée (carrée, affichée en rond) ; sinon l'initiale sur une couleur. */
export function Avatar({ user, size = 44 }: { user: User | null; size?: number }) {
  const r = size / 2;
  if (!user) {
    return (
      <View
        accessibilityLabel="Badeur anonyme"
        style={{ width: size, height: size, borderRadius: r, backgroundColor: colors.surface2, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.line }}>
        <VenetianMask size={size * 0.5} color={colors.text2} strokeWidth={1.75} />
      </View>
    );
  }
  if (user.photo) {
    return <Image source={{ uri: user.photo }} accessibilityLabel={user.pseudo} style={{ width: size, height: size, borderRadius: r, backgroundColor: colors.surface2 }} />;
  }
  return (
    <View
      accessibilityLabel={user.pseudo}
      style={{ width: size, height: size, borderRadius: r, backgroundColor: `hsl(${user.hue}, 38%, 30%)`, alignItems: 'center', justifyContent: 'center' }}>
      <AppText style={{ fontFamily: fonts.display, fontSize: size * 0.42, lineHeight: size * 0.5 }} color={`hsl(${user.hue}, 80%, 86%)`}>
        {user.pseudo.charAt(0).toUpperCase()}
      </AppText>
    </View>
  );
}
