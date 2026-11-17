import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

/** Foreground behaviour: show the banner, play the sound, update the badge. */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export type PushStatus = 'granted' | 'denied' | 'undetermined' | 'unavailable';

export async function getPushStatus(): Promise<PushStatus> {
  if (Platform.OS === 'web') return 'unavailable';
  const { status } = await Notifications.getPermissionsAsync();
  return status as PushStatus;
}

/**
 * Asks permission, creates the Android channel and returns the Expo push token
 * (sent to the backend by the store: POST /api/me/push { expoToken }). Token is null in Expo Go
 * or without an EAS projectId (app.json → extra.eas.projectId): local notifications still work.
 */
export async function registerForPush(): Promise<{ status: PushStatus; token: string | null }> {
  if (Platform.OS === 'web') return { status: 'unavailable', token: null };
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Activité On Bade',
      importance: Notifications.AndroidImportance.HIGH,
      lightColor: '#9810e6',
      vibrationPattern: [0, 120, 80, 120],
    });
  }
  let { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') status = (await Notifications.requestPermissionsAsync()).status;
  if (status !== 'granted') return { status: status as PushStatus, token: null };
  if (!Device.isDevice) return { status: 'granted', token: null };
  const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  try {
    const token = projectId ? (await Notifications.getExpoPushTokenAsync({ projectId })).data : null;
    if (__DEV__) console.log('[OnBade] push token', token ?? '(pas de projectId EAS : notifications locales seulement)');
    return { status: 'granted', token };
  } catch (e) {
    if (__DEV__) console.log('[OnBade] push token indisponible', String(e));
    return { status: 'granted', token: null };
  }
}

/** Shows a notification on this device. `url` is the deep link opened on tap. */
export async function notifyLocal(title: string, body: string, url: string, delaySeconds = 0) {
  if (Platform.OS === 'web') return;
  const { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') return;
  await Notifications.scheduleNotificationAsync({
    content: { title, body, data: { url }, sound: true },
    trigger: delaySeconds > 0 ? { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: delaySeconds } : null,
  });
}

/** Called when a push arrives while the app is open (e.g. to refresh the notifications list). */
export function listenToIncomingNotifications(onReceive: () => void) {
  const sub = Notifications.addNotificationReceivedListener(() => onReceive());
  return () => sub.remove();
}

/** Routes a tapped notification (cold start included) to its screen. */
export function listenToNotificationTaps(open: (url: string) => void) {
  Notifications.getLastNotificationResponseAsync().then((r) => {
    const url = r?.notification.request.content.data?.url;
    if (typeof url === 'string') open(url);
  });
  const sub = Notifications.addNotificationResponseReceivedListener((r) => {
    const url = r.notification.request.content.data?.url;
    if (typeof url === 'string') open(url);
  });
  return () => sub.remove();
}
