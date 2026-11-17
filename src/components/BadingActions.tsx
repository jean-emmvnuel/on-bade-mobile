import * as Clipboard from 'expo-clipboard';
import * as Sharing from 'expo-sharing';
import { Directory, File, Paths } from 'expo-file-system';
import { Ban, Download, Flag, Link2, Trash2 } from '@/components/icons';
import { useState } from 'react';
import { Linking, Platform, View } from 'react-native';

import { useStore } from '@/data/store';
import { errorMessage } from '@/lib/api';
import { badingLink } from '@/lib/links';
import type { Bading } from '@/data/types';
import { colors, space } from '@/theme/tokens';

import { AppText } from './AppText';
import { Button } from './Button';
import { Sheet, SheetItem } from './Sheet';
import { useToast } from './Toast';

const REASONS = ['Haine', 'Harcèlement', 'Contenu choquant', 'Spam', 'Usurpation', 'Autre'];

/**
 * « Télécharger l'image » (comme sur le site) : l'image est copiée sur le téléphone puis la feuille de partage du système
 * s'ouvre, avec « Enregistrer l'image » (iPhone) ou « Enregistrer dans Photos / Fichiers » (Android). Web : elle s'ouvre dans un onglet.
 */
async function downloadImage(b: Bading) {
  const src = b.image?.uri;
  if (!src) return;
  if (Platform.OS === 'web' || !(await Sharing.isAvailableAsync())) { await Linking.openURL(src); return; }
  const dir = new Directory(Paths.cache, 'images');
  if (!dir.exists) dir.create();
  const file = new File(dir, `onbade-${b.id}.jpg`);
  if (file.exists) file.delete();
  const saved = await File.downloadFileAsync(src, file);
  await Sharing.shareAsync(saved.uri, { mimeType: 'image/jpeg', UTI: 'public.jpeg', dialogTitle: "Télécharger l'image" });
}

/** "…" menu for a bading: copy link, download its image, report (with reason), delete own (with confirmation). */
export function useBadingActions() {
  const { session, remove, block, report, users } = useStore();
  const toast = useToast();
  const [target, setTarget] = useState<Bading | null>(null);
  const [view, setView] = useState<'menu' | 'report' | 'delete' | 'block'>('menu');
  const [busy, setBusy] = useState(false);

  /** Envoie l'action au serveur ; le menu reste ouvert (bouton occupé) jusqu'à sa réponse. */
  const run = async (action: () => Promise<unknown>, done: string) => {
    if (busy) return;
    setBusy(true);
    try {
      await action();
      setTarget(null);
      toast(done);
    } catch (e) {
      toast(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const open = (b: Bading) => { setView('menu'); setTarget(b); };
  const close = () => setTarget(null);
  const mine = target?.authorId === session?.user.id;
  // Only signed authors can be blocked: an anonymous author is never revealed (F4 RG2).
  const authorPseudo = target && !target.anonymous ? users[target.authorId]?.pseudo : undefined;

  const sheet = (
    <Sheet visible={!!target} onClose={close} title={view === 'report' ? 'Pourquoi tu signales ?' : view === 'delete' ? 'Supprimer ce bading ?' : view === 'block' ? `Bloquer @${authorPseudo} ?` : undefined}>
      {view === 'menu' && (
        <View>
          <SheetItem icon={<Link2 size={22} color={colors.text} />} label="Copier le lien" onPress={async () => { await Clipboard.setStringAsync(badingLink(target?.id ?? '').share).catch(() => {}); close(); toast('Lien copié'); }} />
          {target?.image && <SheetItem icon={<Download size={22} color={colors.text} />} label="Télécharger l'image" onPress={() => { const t = target; close(); if (t) downloadImage(t).catch(() => toast("L'image n'a pas pu être téléchargée. Réessaie.")); }} />}
          {mine ? (
            <SheetItem icon={<Trash2 size={22} color={colors.danger} />} label="Supprimer" danger onPress={() => setView('delete')} />
          ) : (
            <>
              <SheetItem icon={<Flag size={22} color={colors.text} />} label="Signaler" detail="La modération vérifie chaque signalement" onPress={() => setView('report')} />
              {authorPseudo && <SheetItem icon={<Ban size={22} color={colors.danger} />} label={`Bloquer @${authorPseudo}`} danger onPress={() => setView('block')} />}
            </>
          )}
        </View>
      )}
      {view === 'report' && (
        <View>
          {REASONS.map((r) => (
            <SheetItem key={r} label={r} onPress={() => { if (target) run(() => report(target.id, r), 'Merci, la modération va regarder ça.'); }} />
          ))}
        </View>
      )}
      {view === 'block' && (
        <View style={{ paddingHorizontal: space.xl, gap: space.lg }}>
          <AppText variant="body" color={colors.text2}>Tu ne verras plus ses badings, et il ne pourra plus te mentionner. Tu peux le débloquer dans Paramètres.</AppText>
          <View style={{ flexDirection: 'row', gap: space.md }}>
            <Button label="Annuler" kind="secondary" size="md" style={{ flex: 1 }} onPress={close} />
            <Button label="Bloquer" size="md" loading={busy} style={{ flex: 1, backgroundColor: colors.danger }} onPress={() => { if (target) run(() => block(target.authorId), `@${authorPseudo} est bloqué`); }} />
          </View>
        </View>
      )}
      {view === 'delete' && (
        <View style={{ paddingHorizontal: space.xl, gap: space.lg }}>
          <AppText variant="body" color={colors.text2}>Il disparaît du fil et de ton profil, avec toutes ses rebades. C'est définitif.</AppText>
          <View style={{ flexDirection: 'row', gap: space.md }}>
            <Button label="Annuler" kind="secondary" size="md" style={{ flex: 1 }} onPress={close} />
            <Button label="Supprimer" size="md" loading={busy} style={{ flex: 1, backgroundColor: colors.danger }} onPress={() => { if (target) run(() => remove(target.id), 'Bading supprimé'); }} />
          </View>
        </View>
      )}
    </Sheet>
  );

  return { open, sheet };
}
