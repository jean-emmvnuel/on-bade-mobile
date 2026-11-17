// Les tests tournent en mode démo : aucune requête n'est envoyée au serveur.
process.env.EXPO_PUBLIC_USE_BACKEND = 'false';
jest.mock('expo-secure-store', () => ({ getItemAsync: jest.fn(async () => null), setItemAsync: jest.fn(async () => {}), deleteItemAsync: jest.fn(async () => {}) }));
// Modules natifs de l'app remplacés par des doubles (pas de téléphone pendant les tests).
jest.mock('@/lib/liveActivity', () => ({ startBadingActivity: jest.fn(() => null), liveActivitiesAvailable: () => false }));
jest.mock('@/lib/notifications', () => ({ notifyLocal: jest.fn(), registerForPush: jest.fn(), getPushStatus: jest.fn(async () => 'denied'), listenToNotificationTaps: jest.fn(), listenToIncomingNotifications: jest.fn(() => () => {}) }));
