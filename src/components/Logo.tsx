import Svg, { Path } from 'react-native-svg';

import { colors } from '@/theme/tokens';

/** Concept A "le b qui rit": lowercase b whose bowl is a laughing mouth. */
export function LogoMark({ size = 40, color = colors.brand }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 256 256" accessibilityLabel="On Bade">
      <Path d="M40 46a22 22 0 0 1 44 0V214a22 22 0 0 1-44 0Z" fill={color} />
      <Path
        fillRule="evenodd"
        fill={color}
        d="M68 158A78 78 0 1 0 224 158A78 78 0 1 0 68 158Z M104 146H188A42 42 0 0 1 104 146Z"
      />
    </Svg>
  );
}
