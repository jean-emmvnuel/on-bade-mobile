import * as Linking from 'expo-linking';

/** Site web d'On Bade : les liens partagés y affichent un aperçu (image de partage) puis ouvrent le bading. */
export const PUBLIC_HOST = 'https://www.onbade.com';

/**
 * Link to one bading, built for the environment the app runs in:
 * - Expo Go (dev): exp://<ip>:8081/--/b/<id>, opens straight in Expo Go on the tester's phone
 * - installed app: https://www.onbade.com/b/<id> : ouvre l'app si elle est installée (App Links / liens
 *   universels), sinon le site, qui redirige vers le bading avec son aperçu (F3 RG2)
 */
export function badingLink(id: string) {
  const app = Linking.createURL(`/b/${id}`);
  const web = `${PUBLIC_HOST}/b/${id}`;
  const isExpoGo = app.startsWith('exp://') || app.startsWith('exps://');
  return { app, web, share: __DEV__ && isExpoGo ? app : web };
}

/** Short teaser used in share messages. Never contains the author for anonymous badings (F3 RG4). */
export function shareMessage(text: string, url: string) {
  const teaser = text ? `« ${text.length > 140 ? `${text.slice(0, 140).trimEnd()}…` : text} »\n\n` : '';
  return `${teaser}😂 Lis la suite sur On Bade : ${url}`;
}
