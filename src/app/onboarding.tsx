import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useRef, useState } from 'react';
import { Pressable, View, useWindowDimensions } from 'react-native';
import Animated, {
  interpolate,
  interpolateColor,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/AppText';
import { LogoMark } from '@/components/Logo';
import { PressableScale } from '@/components/PressableScale';
import { useStore } from '@/data/store';
import { AnonymousIllustration, LaughIllustration, StoriesIllustration } from '@/features/onboarding/Illustrations';
import { colors, fonts, radius } from '@/theme/tokens';

const SLIDES = [
  {
    title: "Raconte ce qui t'est arrivé.",
    body: 'Les galères du quotidien, en mode bading. Court, vrai, et drôle.',
    bg: colors.brand,
    fg: '#FFFFFF',
    sub: '#F1E4FF',
    Art: StoriesIllustration,
  },
  {
    title: 'Signe, ou reste anonyme.',
    body: "Un interrupteur avant de publier : ton pseudo disparaît, ton histoire reste.",
    bg: colors.lilac,
    fg: colors.bg,
    sub: colors.plum,
    Art: AnonymousIllustration,
  },
  {
    title: 'Fais rire tout Babi.',
    body: 'Rires, rebades et partages WhatsApp font tourner ton bading.',
    bg: colors.bg,
    fg: colors.text,
    sub: colors.text2,
    Art: LaughIllustration,
  },
] as const;

// Plain arrays for the UI-thread worklets: never capture SLIDES there (it holds React components).
const RANGE = [0, 1, 2];
const BGS = SLIDES.map((s) => s.bg as string);
const FGS = SLIDES.map((s) => s.fg as string);
const CTA = [colors.bg, colors.bg, colors.brand] as string[];

function Dot({ i, x, width }: { i: number; x: SharedValue<number>; width: number }) {
  const style = useAnimatedStyle(() => {
    const p = x.value / width;
    const active = interpolate(Math.abs(p - i), [0, 1], [1, 0], 'clamp');
    return {
      width: 8 + active * 20,
      opacity: 0.35 + active * 0.65,
      backgroundColor: interpolateColor(p, RANGE, FGS),
    };
  });
  return <Animated.View style={[{ height: 8, borderRadius: 4 }, style]} />;
}

export default function Onboarding() {
  const { width } = useWindowDimensions();
  if (__DEV__) console.log('[OnBade] onboarding rendu, largeur', width);
  const insets = useSafeAreaInsets();
  const { finishOnboarding } = useStore();
  const scroller = useRef<{ scrollTo: (o: { x: number; animated: boolean }) => void } | null>(null);
  const x = useSharedValue(0);
  const [page, setPage] = useState(0);
  const last = page === SLIDES.length - 1;

  const onScroll = useAnimatedScrollHandler((e) => {
    x.value = e.contentOffset.x;
  });

  const bgStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(x.value / width, RANGE, BGS),
  }));
  const fgStyle = useAnimatedStyle(() => ({
    color: interpolateColor(x.value / width, RANGE, FGS),
  }));
  const ctaStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(x.value / width, RANGE, CTA),
  }));

  const go = (to: number) => {
    scroller.current?.scrollTo({ x: to * width, animated: true });
    setPage(to);
  };

  const done = (path: '/(auth)/signup' | '/(auth)/signup?mode=login') => {
    finishOnboarding();
    router.replace(path);
  };

  return (
    <Animated.View style={[{ flex: 1 }, bgStyle]}>
      <StatusBar style={page === 1 ? 'dark' : 'light'} />
      <View style={{ paddingTop: insets.top + 12, paddingHorizontal: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: insets.top + 60 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <LogoMark size={30} color={page === 0 ? '#FFFFFF' : colors.brand} />
          <Animated.Text style={[{ fontFamily: fonts.display, fontSize: 20, letterSpacing: -0.4 }, fgStyle]}>On Bade</Animated.Text>
        </View>
        {!last && (
          <Pressable onPress={() => go(SLIDES.length - 1)} hitSlop={12} accessibilityRole="button" accessibilityLabel="Passer l'introduction" style={{ minHeight: 44, justifyContent: 'center' }}>
            <Animated.Text style={[{ fontFamily: fonts.bodySemi, fontSize: 15 }, fgStyle]}>Passer</Animated.Text>
          </Pressable>
        )}
      </View>

      <Animated.ScrollView
        ref={scroller as never}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        onMomentumScrollEnd={(e) => setPage(Math.round(e.nativeEvent.contentOffset.x / width))}
        style={{ flex: 1 }}>
        {SLIDES.map((s, i) => (
          <View key={s.title} style={{ width, flex: 1, justifyContent: 'center' }}>
            <s.Art x={x} width={width} />
            <View style={{ paddingHorizontal: 28, marginTop: 28, gap: 12 }} accessible accessibilityLabel={`${s.title} ${s.body}. Étape ${i + 1} sur ${SLIDES.length}`}>
              <AppText variant="hero" color={s.fg} style={{ maxWidth: 360 }}>{s.title}</AppText>
              <AppText variant="body" color={s.sub} style={{ fontSize: 17, lineHeight: 24, maxWidth: 340 }}>{s.body}</AppText>
            </View>
          </View>
        ))}
      </Animated.ScrollView>

      <View style={{ paddingHorizontal: 24, paddingBottom: insets.bottom + 20, paddingTop: 20, gap: 18 }}>
        <View style={{ flexDirection: 'row', gap: 6, alignSelf: 'flex-start' }} accessibilityRole="progressbar" accessibilityValue={{ min: 1, max: SLIDES.length, now: page + 1 }}>
          {SLIDES.map((_, i) => (
            <Dot key={i} i={i} x={x} width={width} />
          ))}
        </View>
        <PressableScale
          onPress={() => (last ? done('/(auth)/signup') : go(page + 1))}
          accessibilityRole="button"
          accessibilityLabel={last ? 'Créer mon compte' : 'Suivant'}
          style={{ borderRadius: radius.pill, overflow: 'hidden' }}>
          <Animated.View style={[{ height: 58, alignItems: 'center', justifyContent: 'center' }, ctaStyle]}>
            <AppText variant="label" color={colors.onBrand} style={{ fontSize: 17 }}>
              {last ? 'Créer mon compte' : 'Suivant'}
            </AppText>
          </Animated.View>
        </PressableScale>
        <Pressable onPress={() => done('/(auth)/signup?mode=login')} accessibilityRole="button" style={{ alignSelf: 'center', minHeight: 44, justifyContent: 'center' }}>
          <Animated.Text style={[{ fontFamily: fonts.bodyMedium, fontSize: 15 }, fgStyle]}>
            J'ai déjà un compte
          </Animated.Text>
        </Pressable>
      </View>
    </Animated.View>
  );
}
