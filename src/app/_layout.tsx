import { BricolageGrotesque_700Bold, BricolageGrotesque_800ExtraBold } from '@expo-google-fonts/bricolage-grotesque';
import { Figtree_400Regular, Figtree_500Medium, Figtree_600SemiBold, Figtree_700Bold } from '@expo-google-fonts/figtree';
import { useFonts } from 'expo-font';
import { DarkTheme, router, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { Platform, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AnimatedSplash } from '@/components/AnimatedSplash';
import { AppErrorBoundary } from '@/components/AppErrorBoundary';
import { ShareProvider } from '@/components/ShareSheet';
import { ToastProvider } from '@/components/Toast';
import { StoreProvider } from '@/data/store';
import { listenToNotificationTaps } from '@/lib/notifications';
import { syncRules } from '@/lib/platform';
import { colors } from '@/theme/tokens';

SplashScreen.preventAutoHideAsync();

export const ErrorBoundary = AppErrorBoundary;

const theme = {
  ...DarkTheme,
  colors: { ...DarkTheme.colors, background: colors.bg, card: colors.bg, text: colors.text, border: colors.line, primary: colors.brand },
};

export default function RootLayout() {
  const [loaded] = useFonts({
    BricolageGrotesque_700Bold,
    BricolageGrotesque_800ExtraBold,
    Figtree_400Regular,
    Figtree_500Medium,
    Figtree_600SemiBold,
    Figtree_700Bold,
  });

  const [splashDone, setSplashDone] = useState(false);
  // Tapping a notification opens its screen (bading, notifications…).
  useEffect(() => (Platform.OS === 'web' ? undefined : listenToNotificationTaps((url) => router.push(url as never))), []);
  // Règles réglées par l'équipe (longueurs, durée des vocaux…) : chargées dès l'ouverture de l'app.
  useEffect(() => { void syncRules(); }, []);

  if (!loaded) return null;
  if (__DEV__) console.log('[OnBade] polices chargées, splash:', splashDone ? 'fini' : 'en cours');

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.bg }}>
      <SafeAreaProvider>
        <StoreProvider>
          <ToastProvider>
          <ShareProvider>
          <ThemeProvider value={theme}>
            <StatusBar style="light" />
            {/* On web, keep the phone layout centred instead of stretching. */}
            <View style={Platform.OS === 'web' ? { flex: 1, width: '100%', maxWidth: 480, alignSelf: 'center', overflow: 'hidden' } : { flex: 1 }}>
              <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg }, animation: 'fade_from_bottom' }}>
                <Stack.Screen name="index" />
                <Stack.Screen name="onboarding" options={{ animation: 'fade' }} />
                <Stack.Screen name="(auth)" options={{ animation: 'fade' }} />
                <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
                <Stack.Screen name="compose" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
                <Stack.Screen name="rebade/[id]" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
                <Stack.Screen name="bading/[id]" options={{ animation: 'slide_from_right' }} />
                <Stack.Screen name="notifications" options={{ animation: 'slide_from_right' }} />
                <Stack.Screen name="settings" options={{ animation: 'slide_from_right' }} />
                <Stack.Screen name="privacy" options={{ animation: 'slide_from_right' }} />
              </Stack>
            </View>
            {!splashDone && <AnimatedSplash onDone={() => { if (__DEV__) console.log('[OnBade] splash terminé'); setSplashDone(true); }} />}
          </ThemeProvider>
          </ShareProvider>
          </ToastProvider>
        </StoreProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
