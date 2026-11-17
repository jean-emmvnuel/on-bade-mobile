# ON BADE — application Expo

Présentation complète du projet : [README du dépôt](https://github.com/jean-emmvnuel/jebade/blob/main/README.md).

## Démarrer

```bash
npm install
npx expo start --lan        # Expo Go sur le même Wi-Fi
npx tsc --noEmit            # vérification des types
```

## Backend

L'app parle à l'API On Bade en production (`https://backend-onbade.oriverse-it.tech/api`), avec le même contrat que le site web ([API.md](https://github.com/jean-emmvnuel/on-bad-web/blob/main/API.md)).

| Variable (fichier `.env`) | Rôle |
|---|---|
| `EXPO_PUBLIC_API_URL` | Adresse de l'API (par défaut : la production) |
| `EXPO_PUBLIC_USE_BACKEND` | `false` : mode démo, tout est simulé dans l'app avec `seed.ts` (utilisé par les tests) |

- `src/lib/api.ts` : client HTTP, jeton de session gardé dans le trousseau (`expo-secure-store`).
- `src/data/server.ts` : objets du serveur → objets de l'app (images, stickers, mon identifiant → `me`).
- `src/data/store.tsx` : chaque action appelle l'API ; rire, favori… changent l'écran tout de suite et reviennent en arrière si le serveur refuse (toast).
- Liens partagés : `https://onbade.vercel.app/b/<id>` (aperçu avec l'image de partage sur le site, ouverture dans l'app via App Links / liens universels).

## Architecture

| Dossier | Rôle |
|---|---|
| `src/app/` | écrans Expo Router : `onboarding`, `(auth)/signup·verify·pseudo`, `(tabs)/index·notifications·moment·profile`, `compose`, `bading/[id]`, `rebade/[id]`, `b/[id]` (liens partagés), `notifications`, `settings`, `privacy` |
| `src/components/` | UI : `BadingCard`, `Comments`, `ShareSheet`, `PullToRefresh`, `LaughButton` + `Confetti`, `AnimatedSplash`, `AvatarPicker`, `Sheet`… |
| `src/data/` | `store.tsx` (état + règles V1), `seed.ts` (données simulées), `types.ts` |
| `src/lib/` | `links.ts` (liens dynamiques), `notifications.ts` (push), `liveActivity.ts` (Dynamic Island) |
| `src/live/` | Live Activity iOS (`expo-widgets`, composants SwiftUI d'`@expo/ui`) |
| `src/theme/tokens.ts` | couleurs, polices, espacements |

## Points d'attention

- **Icônes** : importer depuis `@/components/icons` (une icône par fichier), jamais depuis `lucide-react-native` directement : le paquet complet alourdit le bundle de ~2 000 modules.
- **Animations** : Reanimated 4 ; ne jamais capturer d'objets contenant des composants React dans un worklet (crash natif sur iPhone).
- **React Compiler** désactivé (`app.json`) : il lisait des valeurs partagées pendant le rendu.
- **Expo Go** : pas de Live Activities ni de push distant ; tout est protégé et ne plante pas. Build de dev : `npx eas-cli build --profile development`.
- **Backend** : chaque action du store correspond à une route de [BACKEND.md](https://github.com/jean-emmvnuel/jebade/blob/main/BACKEND.md) § 11.

## Tests

Tests unitaires avec Jest (`jest-expo`) et Testing Library.

```bash
npm test
npm run test:watch
```

| Fichier | Ce qui est vérifié |
| --- | --- |
| `__tests__/store.test.tsx` | Règles de publication, compte (inscription, connexion, photo gardée après reconnexion, pseudo), publier, rire, vues, partages, favoris, rebades, blocage, commentaires et stickers (collection de 50 sans effacement silencieux), badge, suppression |
| `__tests__/pickImage.test.ts` | Choix d’une image : permission refusée, annulation, formats, 10 Mo, sans EXIF |
| `__tests__/myDataPdf.test.ts` | PDF « copie de mes données » : statistiques, contenu, échappement du HTML, création et partage |
| `__tests__/stickers.test.ts` | Stickers et cohérence des données de démo |
| `__tests__/signup.test.tsx` | Inscription avec le backend : code envoyé par e-mail, code faux ou expiré, nouveau code, `emailToken` joint à la création du compte |
| `__tests__/backend.test.ts` | Client HTTP (réponses, erreurs, réseau), conversion des objets du serveur, fil élagué, règles du pseudo, badings du moment |
