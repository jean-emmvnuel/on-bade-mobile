import { useEffect, useState } from 'react';
import { Modal, Pressable, View } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { cancelAnimation, runOnJS, useAnimatedStyle, useReducedMotion, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { project, rubberband, SPRING_FLICK, SPRING_UI } from '@/lib/motion';
import { colors, radius, space } from '@/theme/tokens';

import { AppText } from './AppText';

type Props = { visible: boolean; onClose: () => void; title?: string; children: React.ReactNode };

/**
 * Feuille du bas façon iOS : elle monte avec un ressort sans rebond, suit le doigt 1:1,
 * résiste vers le haut, et se ferme selon l'élan du geste en gardant la vitesse du doigt.
 * On peut la rattraper en plein mouvement.
 */
export function Sheet({ visible, onClose, title, children }: Props) {
  const insets = useSafeAreaInsets();
  const reduce = useReducedMotion();
  const [mounted, setMounted] = useState(visible);
  const h = useSharedValue(600); // hauteur mesurée de la feuille
  const y = useSharedValue(600); // décalage vers le bas (0 = ouverte)
  const start = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      y.value = reduce ? 0 : h.value;
      y.value = reduce ? 0 : withSpring(0, SPRING_UI);
      return;
    }
    y.value = reduce ? withTiming(h.value, { duration: 1 }) : withSpring(h.value + 24, { ...SPRING_UI, duration: 280 });
    // Démontage sur un minuteur JS : une feuille fermée ne doit jamais laisser un voile invisible qui bloque les touches.
    const t = setTimeout(() => setMounted(false), reduce ? 60 : 300);
    return () => clearTimeout(t);
  }, [visible, reduce, h, y]);

  const pan = Gesture.Pan()
    .activeOffsetY([-10, 10]) // petit seuil avant de décider
    .onBegin(() => { cancelAnimation(y); start.value = y.value; })
    .onUpdate((e) => {
      const raw = start.value + e.translationY;
      y.value = raw < 0 ? rubberband(raw, h.value) : raw;
    })
    .onEnd((e) => {
      const v = e.velocityY;
      if (y.value + project(v) > h.value * 0.45 || v > 900) {
        y.value = withSpring(h.value + 24, { ...SPRING_UI, duration: 260, velocity: Math.max(v, 0) });
        runOnJS(onClose)();
      } else {
        y.value = withSpring(0, { ...SPRING_FLICK, velocity: v });
      }
    });

  const scrim = useAnimatedStyle(() => ({ opacity: reduce ? (visible ? 1 : 0) : Math.max(0, Math.min(1, 1 - y.value / h.value)) }));
  const panel = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));

  return (
    <Modal visible={mounted} transparent statusBarTranslucent animationType={reduce ? 'fade' : 'none'} onRequestClose={onClose}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <Animated.View pointerEvents={visible ? 'auto' : 'none'} style={[{ flex: 1, backgroundColor: colors.scrim }, scrim]}>
          <Pressable style={{ flex: 1 }} onPress={onClose} accessibilityLabel="Fermer" />
        </Animated.View>
        <GestureDetector gesture={pan}>
          <Animated.View
            onLayout={(e) => { h.value = e.nativeEvent.layout.height; }}
            style={[{ position: 'absolute', left: 0, right: 0, bottom: 0, alignSelf: 'center', width: '100%', maxWidth: 480, backgroundColor: colors.surface, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, borderTopWidth: 1, borderColor: 'rgba(255,255,255,0.06)', paddingTop: space.sm, paddingBottom: insets.bottom + space.lg, shadowColor: '#000', shadowOpacity: 0.5, shadowRadius: 30, shadowOffset: { width: 0, height: -10 }, elevation: 24 }, panel]}>
            <View accessibilityLabel="Glisser vers le bas pour fermer" style={{ width: 36, height: 5, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.22)', alignSelf: 'center', marginTop: 2, marginBottom: space.md }} />
            {title && <AppText variant="heading" style={{ paddingHorizontal: space.xl, marginBottom: space.sm }}>{title}</AppText>}
            {children}
          </Animated.View>
        </GestureDetector>
      </GestureHandlerRootView>
    </Modal>
  );
}

export function SheetItem({ icon, label, onPress, danger, detail }: { icon?: React.ReactNode; label: string; onPress: () => void; danger?: boolean; detail?: string }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: space.lg, paddingHorizontal: space.xl, minHeight: 56, backgroundColor: pressed ? colors.surface2 : 'transparent' })}>
      {icon}
      <View style={{ flex: 1 }}>
        <AppText variant="label" color={danger ? colors.danger : colors.text}>{label}</AppText>
        {detail && <AppText variant="small" color={colors.text3}>{detail}</AppText>}
      </View>
    </Pressable>
  );
}
