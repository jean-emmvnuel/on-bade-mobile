import { Redirect } from 'expo-router';

import { useStore } from '@/data/store';

export default function Index() {
  const { ready, onboarded, session } = useStore();
  if (!ready) return null; // session gardée sur le téléphone en cours de lecture
  if (!onboarded) return <Redirect href="/onboarding" />;
  if (!session) return <Redirect href="/(auth)/signup" />;
  return <Redirect href="/(tabs)" />;
}
