import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';

import type { BadingActivityProps } from '@/live/BadingActivity';

type Instance = { update: (p: BadingActivityProps) => Promise<void> | void; end: (policy: 'default' | 'immediate') => Promise<void> | void };

/**
 * Live Activities need iOS 16.1+ and a development/production build:
 * expo-widgets is not part of Expo Go, so everything here is a no-op there.
 */
export const liveActivitiesAvailable =
  Platform.OS === 'ios' && Constants.executionEnvironment !== ExecutionEnvironment.StoreClient;

function factory() {
  if (!liveActivitiesAvailable) return null;
  try {
    // Lazy: never evaluate expo-widgets / @expo/ui swift-ui inside Expo Go.
    return require('@/live/BadingActivity').default as { start: (p: BadingActivityProps, url?: string) => Instance };
  } catch {
    return null;
  }
}

/** Starts « Ton bading cartonne » and returns an updater, or null when unsupported. */
export function startBadingActivity(props: BadingActivityProps, url: string) {
  const f = factory();
  if (!f) return null;
  try {
    const instance = f.start(props, url);
    return {
      update: (p: BadingActivityProps) => {
        try { instance.update(p); } catch {}
      },
      end: () => {
        try { instance.end('default'); } catch {}
      },
    };
  } catch {
    return null;
  }
}
