import { X } from '@/components/icons';
import { useEffect } from 'react';
import { Image, Modal, Pressable, useWindowDimensions } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { cancelAnimation, interpolate, runOnJS, useAnimatedStyle, useReducedMotion, useSharedValue, withSpring } from 'react-native-reanimated';

import type { BadingImage } from '@/data/types';
import { project, SPRING_FLICK, SPRING_UI } from '@/lib/motion';
import { colors, space } from '@/theme/tokens';

/**
 * Image en grand façon Photos : on la saisit, elle suit le doigt dans tous les sens, rétrécit et laisse
 * voir l'écran derrière en s'éloignant. Relâchée avec assez d'élan, elle part dans la direction du geste ;
 * sinon elle revient au centre en gardant la vitesse du doigt. Un simple toucher ferme aussi.
 */
export function ImageViewer({ image, visible, onClose }: { image: BadingImage; visible: boolean; onClose: () => void }) {
  const { height } = useWindowDimensions();
  const reduce = useReducedMotion();
  const x = useSharedValue(0), y = useSharedValue(0), shown = useSharedValue(0);

  useEffect(() => {
    if (visible) { x.value = 0; y.value = 0; shown.value = reduce ? 1 : withSpring(1, SPRING_UI); }
  }, [visible, reduce, x, y, shown]);

  const pan = Gesture.Pan()
    .onBegin(() => { cancelAnimation(x); cancelAnimation(y); })
    .onChange((e) => { x.value += e.changeX; y.value += e.changeY; })
    .onEnd((e) => {
      const px = x.value + project(e.velocityX), py = y.value + project(e.velocityY);
      if (Math.hypot(px, py) > height * 0.25) {
        const speed = Math.hypot(e.velocityX, e.velocityY) || 1;
        x.value = withSpring(x.value + (e.velocityX / speed) * height, { ...SPRING_UI, duration: 300, velocity: e.velocityX });
        y.value = withSpring(y.value + (e.velocityY / speed) * height, { ...SPRING_UI, duration: 300, velocity: e.velocityY });
        runOnJS(onClose)();
      } else {
        x.value = withSpring(0, { ...SPRING_FLICK, velocity: e.velocityX });
        y.value = withSpring(0, { ...SPRING_FLICK, velocity: e.velocityY });
      }
    });
  const tap = Gesture.Tap().onEnd(() => { runOnJS(onClose)(); });
  const gesture = Gesture.Exclusive(pan, tap);

  const backdrop = useAnimatedStyle(() => {
    const d = Math.min(1, Math.hypot(x.value, y.value) / (height * 0.6));
    return { opacity: shown.value * (1 - d) };
  });
  const photo = useAnimatedStyle(() => {
    const d = Math.min(1, Math.hypot(x.value, y.value) / (height * 0.6));
    return { opacity: reduce ? 1 : interpolate(shown.value, [0, 1], [0, 1]), transform: [{ translateX: x.value }, { translateY: y.value }, { scale: (1 - d * 0.25) * interpolate(shown.value, [0, 1], [0.92, 1]) }] };
  });

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <Animated.View pointerEvents="none" style={[{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(10,9,9,0.95)' }, backdrop]} />
        <GestureDetector gesture={gesture}>
          <Animated.View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: space.lg }}>
            <Animated.View style={[{ width: '100%' }, photo]}>
              <Image source={{ uri: image.uri }} resizeMode="contain" accessibilityLabel="Image du bading" style={{ width: '100%', aspectRatio: image.width / image.height }} />
            </Animated.View>
          </Animated.View>
        </GestureDetector>
        <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Fermer l'image" hitSlop={10} style={{ position: 'absolute', top: 54, right: 20, width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surface2, alignItems: 'center', justifyContent: 'center' }}>
          <X size={20} color={colors.text} />
        </Pressable>
      </GestureHandlerRootView>
    </Modal>
  );
}

