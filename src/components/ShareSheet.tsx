import * as Clipboard from 'expo-clipboard';
import * as Linking from 'expo-linking';
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
import { Copy, Ellipsis, ImageIcon, MessageCircle } from './icons';
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
        <AppText variant="small" color="#F1E4FF">onbade.vercel.app</AppText>
      </View>
    </View>
  );
}

function Target({ label, bg, icon, onPress }: { label: string; bg: string; icon: React.ReactNode; onPress: () => void }) {
  return (
    <PressableScale onPress={onPress} accessibilityRole="button" accessibilityLabel={label} style={{ alignItems: 'center', gap: 6, width: 60 }}>
      <View style={{ width: 54, height: 54, borderRadius: 27, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>{icon}</View>
      <AppText variant="small" color={colors.text2} style={{ textAlign: 'center' }} numberOfLines={2}>{label}</AppText>
    </PressableScale>
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

  const whatsapp = async () => {
    const url = `whatsapp://send?text=${encodeURIComponent(msg)}`;
    const ok = Platform.OS !== 'web' && (await Linking.canOpenURL(url).catch(() => false));
    await Linking.openURL(ok ? url : `https://wa.me/?text=${encodeURIComponent(msg)}`);
    done('Envoyé vers WhatsApp');
  };
  const facebook = async () => {
    if (!link) return;
    // Facebook only accepts a URL: it builds its own preview from the page.
    await Linking.openURL(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(link.web)}`);
    done('Ouvert dans Facebook');
  };
  const copy = async () => {
    if (!link) return;
    await Clipboard.setStringAsync(link.share);
    done('Lien copié');
  };
  const image = async () => {
    if (Platform.OS === 'web' || !(await Sharing.isAvailableAsync())) {
      toast("Le partage en image marche sur téléphone");
      return;
    }
    try {
      const uri = await captureRef(card, { format: 'png', quality: 1, result: 'tmpfile' });
      await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'Partager le bading', UTI: 'public.png' });
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
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Target label="WhatsApp" bg="#25D366" icon={<MessageCircle size={26} color="#fff" fill="#fff" />} onPress={whatsapp} />
              <Target label="Facebook" bg="#1877F2" icon={<AppText style={{ fontFamily: fonts.display, fontSize: 28, lineHeight: 32 }} color="#fff">f</AppText>} onPress={facebook} />
              <Target label="En image" bg={colors.brand} icon={<ImageIcon size={24} color="#fff" />} onPress={image} />
              <Target label="Copier le lien" bg={colors.surface2} icon={<Copy size={22} color={colors.text} />} onPress={copy} />
              <Target label="Autres" bg={colors.surface2} icon={<Ellipsis size={22} color={colors.text} />} onPress={more} />
            </View>
            <AppText variant="small" color={colors.text3} numberOfLines={1} selectable>
              {link?.share}
            </AppText>
          </View>
        )}
      </Sheet>
    </ShareCtx.Provider>
  );
}
