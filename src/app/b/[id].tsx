import { Redirect, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';

import { useStore } from '@/data/store';

/**
 * Entry point of shared links: jebade://b/<id>, https://onbade.vercel.app/b/<id>,
 * or exp://…/--/b/<id> in Expo Go. Signed-in users land on the bading; others
 * go through sign-up first and are brought back to it afterwards (Parcours 1).
 */
export default function SharedBadingLink() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session, onboarded, setPendingLink } = useStore();

  useEffect(() => {
    if (!session && id) setPendingLink(id);
  }, [session, id, setPendingLink]);

  if (session) return <Redirect href={`/bading/${id}`} />;
  return <Redirect href={onboarded ? '/(auth)/signup' : '/onboarding'} />;
}
