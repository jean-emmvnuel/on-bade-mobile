import { Laugh, Repeat2, VenetianMask } from '@/components/icons';
import { useEffect, useState } from 'react';
import { View, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { AppText } from '@/components/AppText';
import { Avatar } from '@/components/Avatar';
import type { User } from '@/data/types';
import { colors, radius } from '@/theme/tokens';

const demoUser = (pseudo: string, hue: number): User => ({ id: pseudo, pseudo, hue, verified: false, joinedAt: 0 });

function MiniCard({ user, name, text, style, children }: { user: User | null; name: string; text: string; style?: ViewStyle; children?: React.ReactNode }) {
  return (
    <View
      style={[
        {
          backgroundColor: colors.bg,
          borderRadius: radius.lg,
          padding: 16,
          gap: 10,
          width: 268,
          shadowColor: '#000',
          shadowOpacity: 0.35,
          shadowRadius: 24,
          shadowOffset: { width: 0, height: 14 },
          elevation: 10,
        },
        style,
      ]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Avatar user={user} size={32} />
        <AppText variant="label" color={user ? colors.text : colors.text2}>{name}</AppText>
      </View>
      <AppText variant="body" style={{ fontSize: 15, lineHeight: 21 }}>{text}</AppText>
      {children}
    </View>
  );
}

/** Slow idle float; disabled under reduced motion. */
function useFloat(delay = 0, amp = 6) {
  const reduce = useReducedMotion();
  const t = useSharedValue(0);
  useEffect(() => {
    if (reduce) return;
    t.value = withDelay(delay, withRepeat(withTiming(1, { duration: 2600, easing: Easing.inOut(Easing.sin) }), -1, true));
  }, [reduce, delay, t]);
  return useAnimatedStyle(() => ({ transform: [{ translateY: interpolate(t.value, [0, 1], [-amp, amp]) }] }));
}

/** Parallax: each layer drifts at its own speed while the page scrolls. */
function useParallax(x: SharedValue<number>, index: number, width: number, factor: number) {
  return useAnimatedStyle(() => {
    const p = (x.value - index * width) / width;
    return { transform: [{ translateX: -p * width * factor }], opacity: interpolate(Math.abs(p), [0, 0.8], [1, 0]) };
  });
}

type Props = { x: SharedValue<number>; width: number };

export function StoriesIllustration({ x, width }: Props) {
  const back = useParallax(x, 0, width, 0.15);
  const mid = useParallax(x, 0, width, 0.3);
  const front = useParallax(x, 0, width, 0.5);
  const f1 = useFloat(0, 5);
  const f2 = useFloat(500, 7);
  const f3 = useFloat(1000, 4);
  return (
    <View style={{ height: 320, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View style={[{ position: 'absolute', top: 6 }, back]}>
        <Animated.View style={f1}>
          <MiniCard user={demoUser('Tantie_Brou', 140)} name="Tantie_Brou" text="Le taxi compteur a eu plus de crédit que moi ce mois-ci." style={{ transform: [{ rotate: '-7deg' }, { translateX: -26 }], opacity: 0.6 }} />
        </Animated.View>
      </Animated.View>
      <Animated.View style={[{ position: 'absolute', top: 88 }, mid]}>
        <Animated.View style={f2}>
          <MiniCard user={demoUser('Djidji', 52)} name="Djidji" text="J'ai dit « on se voit à 14h » en Côte d'Ivoire. Il est arrivé à 17h et m'a demandé pourquoi je suis pressé." style={{ transform: [{ rotate: '5deg' }, { translateX: 30 }], opacity: 0.85 }} />
        </Animated.View>
      </Animated.View>
      <Animated.View style={[{ position: 'absolute', top: 196 }, front]}>
        <Animated.View style={f3}>
          <MiniCard user={demoUser('Koffi225', 28)} name="Koffi225" text="Gbaka m'a déposé devant la maison. J'ai dit merci comme si c'était mon chauffeur 😭" style={{ transform: [{ rotate: '-2deg' }] }} />
        </Animated.View>
      </Animated.View>
    </View>
  );
}

export function AnonymousIllustration({ x, width }: Props) {
  const reduce = useReducedMotion();
  const [anon, setAnon] = useState(true);
  const knob = useSharedValue(1);
  const para = useParallax(x, 1, width, 0.35);
  const float = useFloat(200, 5);

  useEffect(() => {
    if (reduce) return;
    const id = setInterval(() => setAnon((a) => !a), 2200);
    return () => clearInterval(id);
  }, [reduce]);
  useEffect(() => {
    knob.value = withSpring(anon ? 1 : 0, { damping: 16, stiffness: 220 });
  }, [anon, knob]);

  const knobStyle = useAnimatedStyle(() => ({ transform: [{ translateX: knob.value * 20 }] }));
  const trackStyle = useAnimatedStyle(() => ({ backgroundColor: knob.value > 0.5 ? colors.brand : colors.line }));

  return (
    <Animated.View style={[{ height: 320, alignItems: 'center', justifyContent: 'center' }, para]}>
      <Animated.View style={float}>
        <View style={{ backgroundColor: colors.bg, borderRadius: radius.lg, padding: 16, width: 280, gap: 14, shadowColor: colors.plum, shadowOpacity: 0.35, shadowRadius: 30, shadowOffset: { width: 0, height: 18 }, elevation: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, height: 36 }}>
            <Animated.View key={anon ? 'a' : 'n'} entering={FadeIn.duration(260)} exiting={FadeOut.duration(160)} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Avatar user={anon ? null : demoUser('AwaLaGo', 330)} size={36} />
              <AppText variant="label" color={anon ? colors.text2 : colors.text}>{anon ? 'Badeur anonyme' : 'AwaLaGo'}</AppText>
            </Animated.View>
          </View>
          <AppText variant="body" style={{ fontSize: 15, lineHeight: 21 }}>
            J'ai envoyé « tu me manques » dans le groupe de la famille. Papa a répondu « moi aussi ».
          </AppText>
          <View style={{ height: 1, backgroundColor: colors.line }} />
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <VenetianMask size={18} color={colors.text2} />
              <AppText variant="meta" color={colors.text}>Publier en anonyme</AppText>
            </View>
            <Animated.View style={[{ width: 44, height: 24, borderRadius: 12, padding: 2 }, trackStyle]}>
              <Animated.View style={[{ width: 20, height: 20, borderRadius: 10, backgroundColor: '#fff' }, knobStyle]} />
            </Animated.View>
          </View>
        </View>
      </Animated.View>
    </Animated.View>
  );
}

export function LaughIllustration({ x, width }: Props) {
  const reduce = useReducedMotion();
  const [count, setCount] = useState(1287);
  const pop = useSharedValue(1);
  const para = useParallax(x, 2, width, 0.35);
  const bubble = useParallax(x, 2, width, 0.6);
  const float = useFloat(0, 5);
  const float2 = useFloat(700, 8);

  useEffect(() => {
    if (reduce) return;
    const id = setInterval(() => {
      setCount((c) => c + 1 + Math.floor(Math.random() * 4));
      pop.value = withSequence(withTiming(1.25, { duration: 110 }), withSpring(1, { damping: 9, stiffness: 240 }));
    }, 900);
    return () => clearInterval(id);
  }, [reduce, pop]);

  const popStyle = useAnimatedStyle(() => ({ transform: [{ scale: pop.value }] }));

  return (
    <View style={{ height: 320, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View style={para}>
        <Animated.View style={float}>
          <MiniCard user={demoUser('LeVraiZoba', 200)} name="LeVraiZoba" text="Courant revient. Tout le quartier crie « ÉHHH » comme si on venait de marquer un but." style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 18 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Animated.View style={popStyle}>
                  <Laugh size={20} color={colors.brandInk} fill={colors.brandSoft} strokeWidth={2.3} />
                </Animated.View>
                <AppText variant="meta" color={colors.brandInk} style={{ fontVariant: ['tabular-nums'] }}>{count.toLocaleString('fr-FR')}</AppText>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Repeat2 size={20} color={colors.text2} />
                <AppText variant="meta" color={colors.text2}>402</AppText>
              </View>
            </View>
          </MiniCard>
        </Animated.View>
      </Animated.View>
      <Animated.View style={[{ position: 'absolute', right: 12, top: 18 }, bubble]}>
        <Animated.View style={float2}>
          <View style={{ backgroundColor: colors.brand, borderRadius: 18, borderBottomRightRadius: 4, paddingHorizontal: 14, paddingVertical: 10, transform: [{ rotate: '4deg' }] }}>
            <AppText variant="label" color={colors.onBrand}>Ça m'est arrivé hier 💀</AppText>
          </View>
        </Animated.View>
      </Animated.View>
    </View>
  );
}
