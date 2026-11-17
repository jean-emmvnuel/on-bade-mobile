import { HStack, Image, Spacer, Text, VStack } from '@expo/ui/swift-ui';
import { font, foregroundStyle, padding } from '@expo/ui/swift-ui/modifiers';
import { createLiveActivity, type LiveActivityEnvironment } from 'expo-widgets';

export type BadingActivityProps = {
  laughs: number;
  comments: number;
  rebades: number;
  teaser: string;
  status: string;
};

const VIOLET = '#B76BFF';

/**
 * « Ton bading cartonne » : laughs counting up live on the Lock Screen and in the
 * Dynamic Island while a fresh bading collects reactions.
 */
const BadingActivity = (p: BadingActivityProps, env: LiveActivityEnvironment) => {
  'widget';
  const accent = env.isLuminanceReduced ? '#FFFFFF' : VIOLET;
  return {
    banner: (
      <VStack modifiers={[padding({ all: 14 })]}>
        <HStack>
          <Text modifiers={[font({ weight: 'bold', size: 15 }), foregroundStyle(accent)]}>On Bade</Text>
          <Spacer />
          <Text modifiers={[font({ size: 13 }), foregroundStyle('#A9A4A4')]}>{p.status}</Text>
        </HStack>
        <Text modifiers={[font({ size: 14 })]}>{p.teaser}</Text>
        <HStack>
          <Text modifiers={[font({ weight: 'bold', size: 22 }), foregroundStyle(accent)]}>😂 {p.laughs}</Text>
          <Spacer />
          <Text modifiers={[font({ size: 13 })]}>💬 {p.comments}   🔁 {p.rebades}</Text>
        </HStack>
      </VStack>
    ),
    compactLeading: <Text modifiers={[font({ weight: 'bold' }), foregroundStyle(accent)]}>b</Text>,
    compactTrailing: <Text modifiers={[font({ weight: 'bold' }), foregroundStyle(accent)]}>😂 {p.laughs}</Text>,
    minimal: <Text modifiers={[foregroundStyle(accent)]}>😂</Text>,
    expandedLeading: (
      <VStack modifiers={[padding({ all: 8 })]}>
        <Image systemName="face.smiling.inverse" color={accent} />
        <Text modifiers={[font({ size: 11 })]}>On Bade</Text>
      </VStack>
    ),
    expandedTrailing: (
      <VStack modifiers={[padding({ all: 8 })]}>
        <Text modifiers={[font({ weight: 'bold', size: 22 }), foregroundStyle(accent)]}>{p.laughs}</Text>
        <Text modifiers={[font({ size: 11 })]}>rires</Text>
      </VStack>
    ),
    expandedBottom: (
      <VStack modifiers={[padding({ horizontal: 12, bottom: 8 })]}>
        <Text modifiers={[font({ size: 13 })]}>{p.teaser}</Text>
        <Text modifiers={[font({ size: 12 }), foregroundStyle('#A9A4A4')]}>💬 {p.comments} commentaires · 🔁 {p.rebades} rebades</Text>
      </VStack>
    ),
  };
};

export default createLiveActivity<BadingActivityProps>('BadingActivity', BadingActivity);
