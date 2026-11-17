import * as Sharing from 'expo-sharing';
import { createContext, useCallback, useContext, useRef, useState } from 'react';
import { Image, Platform, Share as RNShare, View } from 'react-native';
import { captureRef } from 'react-native-view-shot';

import { displayName, useStore } from '@/data/store';
import type { Bading } from '@/data/types';
import { badingLink, shareMessage } from '@/lib/links';
import { colors, fonts, radius, space } from '@/theme/tokens';

import { AppText } from './AppText';
import { Avatar } from './Avatar';
import { tap } from './haptics';
import { Button } from './Button';
import { ImageIcon } from './icons';
import { LogoMark } from './Logo';
import { PressableScale } from './PressableScale';
import { Sheet } from './Sheet';
import { useToast } from './Toast';

type Ctx = (b: Bading) => void;
const ShareCtx = createContext<Ctx>(() => {});
export const useShare = () => useContext(ShareCtx);

/** The visual exported by "Partager en image" (F3 RG3). Anonymous stays anonymous (RG4). */
function ShareCard({ b }: { b: Bading }) {
  const { users } = useStore();
  const { name, user } = displayName(b, users);
  return (
    <View style={{ backgroundColor: colors.brand, padding: 14, borderRadius: radius.lg }}>
      <View style={{ backgroundColor: colors.bg, borderRadius: radius.md, padding: space.lg, gap: space.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Avatar user={b.anonymous ? null : user} size={30} />
          <AppText variant="label" color={b.anonymous ? colors.text2 : colors.text}>{name}</AppText>
        </View>
        {!!b.text && (
          <AppText style={{ fontFamily: fonts.bodySemi, fontSize: 18, lineHeight: 25 }} numberOfLines={b.image ? 3 : 9}>
            {b.text}
          </AppText>
        )}
        {b.image && <Image source={{ uri: b.image.uri }} style={{ width: '100%', aspectRatio: b.image.width / b.image.height, maxHeight: 260, borderRadius: radius.md }} resizeMode="cover" />}
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 12, paddingHorizontal: 4 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <LogoMark size={22} color="#FFFFFF" />
          <AppText style={{ fontFamily: fonts.display, fontSize: 17 }} color="#FFFFFF">on bade</AppText>
        </View>
        <AppText variant="small" color="#F1E4FF">onbade.com</AppText>
      </View>
    </View>
  );
}

export function ShareProvider({ children }: { children: React.ReactNode }) {
  const { share, getBading } = useStore();
  const toast = useToast();
  const [target, setTarget] = useState<Bading | null>(null);
  const card = useRef<React.ComponentRef<typeof View>>(null);

  const open = useCallback<Ctx>((b) => setTarget(b), []);
  const close = () => setTarget(null);

  // Always share the original bading, never the rebade wrapper.
  const b = target?.rebadeOf ? getBading(target.rebadeOf) ?? target : target;
  const link = b ? badingLink(b.id) : null;
  const msg = b && link ? shareMessage(b.text, link.share) : '';

  const done = (what: string) => {
    if (b) share(b.id); // RG5: count every share
    tap();
    close();
    setTimeout(() => toast(what), 250);
  };

  // Comme sur le site : une seule action, « Partager en story » (image du bading) ; sans partage d'image possible, le lien.
  const story = async () => {
    if (Platform.OS === 'web' || !(await Sharing.isAvailableAsync())) {
      await more();
      return;
    }
    try {
      const uri = await captureRef(card, { format: 'png', quality: 1, result: 'tmpfile' });
      await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'Partager en story', UTI: 'public.png' });
      done('Image partagée');
    } catch {
      toast("L'image n'a pas pu être créée. Réessaie.");
    }
  };
  const more = async () => {
    if (!link) return;
    try {
      const res = await RNShare.share({ message: msg, url: link.share });
      if (res.action !== RNShare.dismissedAction) done('Partagé');
    } catch {
      toast('Partage indisponible ici');
    }
  };

  return (
    <ShareCtx.Provider value={open}>
      {children}
      <Sheet visible={!!target} onClose={close} title="Partager ce bading">
        {b && (
          <View style={{ paddingHorizontal: space.xl, gap: space.lg }}>
            <View ref={card} collapsable={false}>
              <ShareCard b={b} />
            </View>
            <Button label="Partager en story" icon={<ImageIcon size={18} color={colors.onBrand} />} onPress={story} />
            <AppText variant="small" color={colors.text3} style={{ textAlign: 'center' }}>Statut WhatsApp, story Snapchat, Facebook, Instagram…</AppText>
          </View>
        )}
      </Sheet>
    </ShareCtx.Provider>
  );
}
