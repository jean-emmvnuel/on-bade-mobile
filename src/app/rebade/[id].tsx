import { router, useLocalSearchParams } from 'expo-router';
import { MessageSquareQuote, Repeat2, VenetianMask, X } from '@/components/icons';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, TextInput, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/AppText';
import { QuotedBading } from '@/components/BadingCard';
import { Button } from '@/components/Button';
import { success } from '@/components/haptics';
import { PressableScale } from '@/components/PressableScale';
import { useToast } from '@/components/Toast';
import { Toggle } from '@/components/Toggle';
import { RULES, useStore } from '@/data/store';
import { errorMessage } from '@/lib/api';
import { colors, fonts, radius, space } from '@/theme/tokens';

export default function Rebade() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { rebade, getBading } = useStore();
  const target = getBading(id);
  const originId = target?.rebadeOf ?? id; // RG5
  const [mode, setMode] = useState<'choose' | 'opinion'>('choose');
  const [opinion, setOpinion] = useState('');
  const [anonymous, setAnonymous] = useState(false);
  const top = Platform.OS === 'ios' ? 12 : insets.top + 8;

  const [sending, setSending] = useState(false);
  const done = async (text: string) => {
    if (sending) return;
    setSending(true);
    try {
      await rebade(originId, text, anonymous);
    } catch (e) {
      setSending(false);
      toast(errorMessage(e, "La rebade n'a pas pu être envoyée. Réessaie."));
      return;
    }
    success();
    router.back();
    setTimeout(() => toast('Rebadé ! L’auteur est prévenu.'), 250);
  };

  const Choice = ({ icon, title, detail, onPress }: { icon: React.ReactNode; title: string; detail: string; onPress: () => void }) => (
    <PressableScale onPress={onPress} accessibilityRole="button" accessibilityLabel={title} style={{ flexDirection: 'row', alignItems: 'center', gap: space.lg, padding: space.lg, borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line }}>
      <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.brandSoft, alignItems: 'center', justifyContent: 'center' }}>{icon}</View>
      <View style={{ flex: 1, gap: 2 }}>
        <AppText variant="label">{title}</AppText>
        <AppText variant="small" color={colors.text2}>{detail}</AppText>
      </View>
    </PressableScale>
  );

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ paddingTop: top, height: top + 56, paddingHorizontal: space.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Fermer" style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
          <X size={24} color={colors.text} />
        </Pressable>
        <AppText variant="heading">Rebade</AppText>
        {mode === 'opinion' ? <Button label="Rebader" size="md" disabled={opinion.length > RULES.opinionMax} loading={sending} onPress={() => done(opinion)} /> : <View style={{ width: 44 }} />}
      </View>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: space.lg, gap: space.lg }}>
        {mode === 'choose' ? (
          <Animated.View entering={FadeInDown.duration(300)} style={{ gap: space.md }}>
            <Choice icon={<Repeat2 size={22} color={colors.brandInk} />} title="Rebader directement" detail="Le bading apparaît dans le fil avec ton nom." onPress={() => done('')} />
            <Choice icon={<MessageSquareQuote size={22} color={colors.brandInk} />} title="Avec mon avis" detail={`Ajoute ta réaction, ${RULES.opinionMax} caractères max.`} onPress={() => setMode('opinion')} />
          </Animated.View>
        ) : (
          <Animated.View entering={FadeInDown.duration(300)} style={{ gap: space.sm }}>
            <TextInput
              autoFocus
              multiline
              value={opinion}
              onChangeText={setOpinion}
              placeholder="Ton avis (facultatif)"
              placeholderTextColor={colors.text3}
              selectionColor={colors.brandInk}
              accessibilityLabel="Ton avis"
              style={{ color: colors.text, fontFamily: fonts.bodyMedium, fontSize: 19, lineHeight: 26, minHeight: 90, textAlignVertical: 'top', padding: 0 }}
            />
            <AppText variant="small" color={opinion.length > RULES.opinionMax ? colors.danger : colors.text3} style={{ alignSelf: 'flex-end', fontVariant: ['tabular-nums'] }}>
              {opinion.length} / {RULES.opinionMax}
            </AppText>
          </Animated.View>
        )}
        <QuotedBading id={originId} />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, marginTop: space.sm }}>
          <VenetianMask size={20} color={anonymous ? colors.brandInk : colors.text2} />
          <AppText variant="label" style={{ flex: 1 }}>Rebader en anonyme</AppText>
          <Toggle value={anonymous} onChange={setAnonymous} label="Rebader en anonyme" />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
