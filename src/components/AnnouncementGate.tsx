// Annonce de l'équipe non lue : affichée en grand dès l'arrivée dans l'app (ou dès qu'elle arrive), et ne se ferme que
// par « J'ai compris ». Ainsi une annonce ne passe pas inaperçue, même si la notification push a été balayée.
// Plusieurs annonces non lues : l'une après l'autre, de la plus ancienne à la plus récente.
import { Modal, ScrollView, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Megaphone } from '@/components/icons';
import { useStore } from '@/data/store';
import { colors, radius, space } from '@/theme/tokens';

export function AnnouncementGate() {
  const { notifications, markRead } = useStore();
  const pending = notifications.filter((n) => n.kind === 'announcement' && !n.read).sort((a, b) => a.createdAt - b.createdAt);
  const current = pending[0];
  if (!current) return null;
  const left = pending.length - 1;

  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent onRequestClose={() => {}}>
      <View style={{ flex: 1, backgroundColor: colors.scrim, justifyContent: 'center', padding: space.lg }}>
        <View
          accessibilityRole="alert"
          accessibilityViewIsModal
          style={{ backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.line, padding: space.xl, gap: space.md, maxHeight: '85%' }}>
          <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: colors.brandSoft, alignItems: 'center', justifyContent: 'center', alignSelf: 'center' }}>
            <Megaphone size={28} color={colors.brandInk} />
          </View>
          <AppText variant="small" color={colors.brandInk} style={{ textAlign: 'center', textTransform: 'uppercase', letterSpacing: 1.2 }}>
            Annonce de l’équipe On Bade
          </AppText>
          <AppText variant="title" style={{ textAlign: 'center' }}>{current.title || 'Annonce'}</AppText>
          <ScrollView style={{ flexGrow: 0 }}>
            <AppText variant="story" color={colors.text}>{current.body}</AppText>
          </ScrollView>
          <Button label={left > 0 ? `J’ai compris · encore ${left}` : 'J’ai compris'} onPress={() => markRead(current.id)} />
        </View>
      </View>
    </Modal>
  );
}
