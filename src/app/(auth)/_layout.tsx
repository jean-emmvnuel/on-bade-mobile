import { Redirect, Stack } from 'expo-router';

import { useStore } from '@/data/store';
import { colors } from '@/theme/tokens';

export default function AuthLayout() {
  const { session, pendingLink } = useStore();
  if (session) return <Redirect href={pendingLink ? `/bading/${pendingLink}` : '/(tabs)'} />;
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg }, animation: 'slide_from_right' }} />;
}
