// Célébration quand on gagne la flamme du jour (après une publication) : une grosse flamme jaillit en ondulant, le compteur
// passe de N-1 à N, des étincelles partent tout autour, puis le message. Se ferme seule (~3 s) ou au toucher.
// « Réduire les animations » activé : simple apparition, sans mouvement.
import { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  Easing, FadeIn, FadeOut, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withRepeat, withSequence, withSpring, withTiming,
} from 'react-native-reanimated';

import { fonts } from '@/theme/tokens';

import { AppText } from './AppText';

type Payload = { streak: number; message: string };
const listeners = new Set<(p: Payload) => void>();
/** Lance la célébration (depuis n'importe quel écran). */
export const celebrateFlame = (p: Payload) => listeners.forEach((fn) => fn(p));

const SPARKS = 14;
const SPARK_COLORS = ['#FFB347', '#FF8C32', '#FFD166', '#FF5E3A'];

function Spark({ index }: { index: number }) {
  const t = useSharedValue(0);
  const p = useMemo(() => {
    const angle = (index / SPARKS) * Math.PI * 2;
    const dist = 90 + ((index * 37) % 70);
    return { dx: Math.cos(angle) * dist, dy: Math.sin(angle) * dist - 30 };
  }, [index]);
  useEffect(() => { t.value = withDelay(350, withTiming(1, { duration: 900 + (index % 4) * 120, easing: Easing.out(Easing.quad) })); }, [t, index]);
  const style = useAnimatedStyle(() => ({
    opacity: t.value === 0 ? 0 : 1 - t.value,
    transform: [{ translateX: p.dx * t.value }, { translateY: p.dy * t.value }, { scale: 1 - 0.8 * t.value }],
  }));
  return <Animated.View style={[styles.spark, { backgroundColor: SPARK_COLORS[index % 4] }, style]} />;
}

function Celebration({ streak, message, onDone }: Payload & { onDone: () => void }) {
  const reduce = useReducedMotion();
  const [count, setCount] = useState(reduce ? streak : Math.max(0, streak - 1));
  const pop = useSharedValue(reduce ? 1 : 0.2);
  const flicker = useSharedValue(0);
  const bump = useSharedValue(1);
  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    if (!reduce) {
      pop.value = withSpring(1, { damping: 7, stiffness: 140 });
      flicker.value = withRepeat(withSequence(withTiming(1, { duration: 400 }), withTiming(-1, { duration: 400 })), -1, true);
      timers.push(setTimeout(() => { setCount(streak); bump.value = withSequence(withTiming(1.6, { duration: 150 }), withSpring(1, { damping: 6 })); }, 850));
    }
    timers.push(setTimeout(onDone, 3200));
    return () => timers.forEach(clearTimeout);
  }, [reduce, streak, onDone, pop, flicker, bump]);
  const fire = useAnimatedStyle(() => ({
    transform: [{ scale: pop.value * (1 + flicker.value * 0.05) }, { rotate: `${flicker.value * 4}deg` }, { translateY: (1 - pop.value) * 60 }],
  }));
  const num = useAnimatedStyle(() => ({ transform: [{ scale: bump.value }] }));
  return (
    <Pressable onPress={onDone} style={styles.root} accessibilityRole="alert" accessibilityLabel={message}>
      <View style={styles.glow} />
      {!reduce && <View style={styles.burst}>{Array.from({ length: SPARKS }, (_, i) => <Spark key={i} index={i} />)}</View>}
      <Animated.View style={fire}><AppText style={{ fontSize: 110, lineHeight: 130 }}>🔥</AppText></Animated.View>
      <Animated.View entering={reduce ? undefined : FadeIn.delay(400)} style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
        <Animated.View style={num}><AppText style={{ fontFamily: fonts.display, fontSize: 56, lineHeight: 62, color: '#FFB347' }}>{count}</AppText></Animated.View>
        <AppText variant="heading">{streak > 1 ? 'flammes' : 'flamme'}</AppText>
      </Animated.View>
      <Animated.View entering={reduce ? undefined : FadeIn.delay(1000)}>
        <AppText variant="bodyStrong" style={{ textAlign: 'center', maxWidth: 320, marginTop: 8 }}>{message}</AppText>
      </Animated.View>
    </Pressable>
  );
}

/** À monter une fois, à la racine de l'app. */
export function FlameCelebrationHost() {
  const [payload, setPayload] = useState<(Payload & { key: number }) | null>(null);
  useEffect(() => {
    const fn = (p: Payload) => setPayload({ ...p, key: Date.now() });
    listeners.add(fn);
    return () => { listeners.delete(fn); };
  }, []);
  if (!payload) return null;
  return (
    <Modal visible transparent animationType="none" statusBarTranslucent onRequestClose={() => setPayload(null)}>
      <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(300)} style={StyleSheet.absoluteFill}>
        <Celebration key={payload.key} streak={payload.streak} message={payload.message} onDone={() => setPayload(null)} />
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 6, backgroundColor: 'rgba(14,12,12,0.96)' },
  glow: { position: 'absolute', top: '28%', alignSelf: 'center', width: 260, height: 260, borderRadius: 130, backgroundColor: 'rgba(255,110,20,0.22)' },
  burst: { position: 'absolute', top: '40%', left: '50%', width: 0, height: 0 },
  spark: { position: 'absolute', width: 8, height: 8, marginLeft: -4, marginTop: -4, borderRadius: 4 },
});

