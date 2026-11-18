/**
 * État de l'app + règles métier de la V1.
 *
 * Avec le backend (par défaut, voir src/lib/api.ts) : chaque action appelle l'API On Bade et range la réponse
 * ici, qui sert de cache aux écrans. Les actions d'un toucher (rire, favori…) changent l'écran tout de suite,
 * puis reviennent en arrière si le serveur refuse ; l'erreur est alors affichée en toast (setStoreErrorReporter).
 *
 * En mode démo (EXPO_PUBLIC_USE_BACKEND=false, utilisé par les tests) : tout reste simulé dans l'app,
 * avec les données de seed.ts.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import { incomingBadings, ME_ID, seedBadings, seedComments, seedCustomStickers, seedMyBadings, seedNotifications, seedUsers } from './seed';
import { fromServerBading, fromServerComment, fromServerNotification, fromServerSticker, fromServerUser, idMapper, pruneFeed } from './server';
import * as api from '@/lib/api';
import { ApiError, USE_BACKEND, fireAndForget, isApiError } from '@/lib/api';
import { startBadingActivity } from '@/lib/liveActivity';
import { notifyLocal, registerForPush, type PushStatus } from '@/lib/notifications';

import type { AppNotification, Bading, BadingImage, Comment, CustomSticker, MentionPolicy, User, VoiceRecording } from './types';
import { BANNED, MAX_MY_STICKERS, RULES, countMentions, validateBading, type PublishError } from './rules';
import { buildTree, descendantIds, groupThreads, type CommentNode } from './comments';
import { momentOf, withPinsFirst, type Pin } from './feed';
import { uid } from './format';

// Modules extraits, réexportés ici : les écrans continuent d'importer depuis « @/data/store ».
export * from './rules';
export * from './comments';
export * from './feed';
export * from './format';

export { USE_BACKEND };

const PUBLISH_ERRORS: PublishError[] = ['too_short', 'too_long', 'caption_too_long', 'blocked_word', 'too_many_mentions'];

type Session = { email: string; user: User } | null;
export type Draft = { text: string; anonymous: boolean; image?: BadingImage | null };

/** Mode démo uniquement : empreinte non cryptographique pour ne pas garder le mot de passe en clair en mémoire. */
function fingerprint(email: string, pw: string) {
  let h = 5381;
  for (const c of `${email}:${pw}`) h = ((h << 5) + h + c.charCodeAt(0)) | 0;
  return (h >>> 0).toString(36);
}

export type LoginResult = 'ok' | 'unknown' | 'wrong_password';
type Account = { email: string; secret: string; pseudo: string };
/** challenge : défi du code envoyé par e-mail ; emailToken : preuve que l'adresse est confirmée (backend). */
type PendingSignup = { email: string; secret: string; password: string; firstname: string; lastname: string; challenge?: string; emailToken?: string };
export type VerifyResult = 'ok' | 'invalid' | 'expired';

type BadgeRequest = { status: 'none' | 'pending' | 'accepted' | 'refused'; reason?: string; decidedAt?: number; links?: string[] };

export type DeletionRequest = { status: 'none' | 'pending'; requestedAt?: number; reason?: string };

// Clés du petit stockage persistant (trousseau du téléphone).
const ONBOARDED_KEY = 'onbade-onboarded';
const ME_KEY = 'onbade-me';
/** Délai entre deux changements de pseudo (même règle que le serveur). */
export const PSEUDO_CHANGE_GAP_MS = 48 * 3_600_000;

// ─── Erreurs des actions en arrière-plan ──────────────────
// Le store est monté au-dessus des toasts : l'app lui donne une fonction pour afficher les erreurs.
let reportError: (error: unknown) => void = (e) => { if (__DEV__) console.warn('[store]', e); };
export const setStoreErrorReporter = (fn: (error: unknown) => void) => { reportError = fn; };

type Store = {
  /** false tant que la session gardée sur le téléphone n'a pas été relue (écran de démarrage). */
  ready: boolean;
  onboarded: boolean;
  session: Session;
  users: Record<string, User>;
  feed: Bading[];
  /** Badings épinglés par l'équipe (« bading du jour »), dans l'ordre du serveur : affichés en tête du fil. */
  pins: Pin[];
  notifications: AppNotification[];
  draft: Draft;
  mentionPolicy: MentionPolicy;
  badge: BadgeRequest;
  finishOnboarding: () => void;
  /** Inscription, étape 1 : e-mail + mot de passe (+ prénom et nom) gardés le temps de choisir le pseudo ; un code est envoyé à l'adresse. */
  startSignup: (email: string, password: string, names?: { firstname: string; lastname: string }) => Promise<'ok' | 'taken'>;
  /** Adresse en cours d'inscription (écran du code). */
  signupEmail: string | null;
  /** true quand l'adresse a été confirmée par le code (toujours vrai en mode démo). */
  signupEmailVerified: boolean;
  /** Inscription, étape 2 : vérifie le code reçu par e-mail. */
  verifySignupCode: (code: string) => Promise<VerifyResult>;
  /** Renvoie un nouveau code (l'ancien ne marche plus). */
  resendSignupCode: () => Promise<void>;
  /** Le pseudo est-il libre ? null si le serveur ne peut pas le dire maintenant. */
  isPseudoAvailable: (pseudo: string) => Promise<boolean | null>;
  /** Inscription, étape 3 : crée le compte et ouvre la session. Lève une ApiError ('taken', 'account_exists', 'email_unverified'…). */
  register: (pseudo: string) => Promise<void>;
  logIn: (email: string, password: string) => Promise<LoginResult>;
  isEmailTaken: (email: string) => boolean;
  hasPendingSignup: boolean;
  /** Mot de passe oublié : le serveur envoie un lien par e-mail. */
  requestPasswordReset: (email: string) => Promise<void>;
  signOut: () => void;
  /** Demande l'autorisation si besoin et donne le jeton push de ce téléphone au serveur. */
  enablePush: () => Promise<PushStatus>;
  /** Photo de profil (uri d'une image recadrée) ou null pour la retirer. */
  setPhoto: (uri: string | null) => Promise<void>;
  /** Charge le fil depuis le serveur. */
  loadFeed: () => Promise<void>;
  /** Récupère les badings publiés depuis le dernier chargement ; renvoie leur nombre. */
  refreshFeed: () => Promise<number>;
  /** Charge un bading, ses commentaires et ses rebades avec avis. */
  loadBading: (id: string) => Promise<'ok' | 'missing'>;
  getBading: (id: string) => Bading | undefined;
  getUser: (id: string) => User | undefined;
  toggleLike: (id: string) => void;
  share: (id: string) => void;
  addView: (id: string) => void;
  /** F1 : texte, image recadrée, ou les deux. */
  publish: (text: string, anonymous: boolean, image?: BadingImage | null) => Promise<{ ok: true; id: string } | { ok: false; error: PublishError }>;
  rebade: (id: string, opinion: string, anonymous: boolean) => Promise<void>;
  remove: (id: string) => Promise<void>;
  report: (id: string, reason: string) => Promise<void>;
  setDraft: (draft: Draft) => void;
  loadNotifications: () => Promise<void>;
  markAllRead: () => void;
  /** Une seule notification lue (annonce fermée avec « J'ai compris »). */
  markRead: (id: string) => void;
  setMentionPolicy: (p: MentionPolicy) => void;
  requestBadge: (links: string[], documentUri?: string | null) => Promise<void>;
  comments: Comment[];
  commentsFor: (badingId: string) => { root: Comment; replies: Comment[] }[];
  /** Commentaires en arbre : chaque réponse sous le commentaire auquel elle répond, sur 4 niveaux. */
  commentTree: (badingId: string) => CommentNode[];
  commentCount: (badingId: string) => number;
  /** F8 : un texte OU un sticker (intégré ou personnel). null si le texte est refusé. */
  addComment: (badingId: string, text: string, parent?: Comment, sticker?: string, audio?: VoiceRecording) => Promise<Comment | null>;
  /** Stickers personnels de tout le monde (pour afficher ceux des commentaires). */
  customStickers: Record<string, CustomSticker>;
  /** Ma collection : stickers créés + stickers enregistrés depuis les commentaires (comme sur TikTok). */
  myStickers: string[];
  recentStickers: string[];
  loadStickers: () => Promise<void>;
  /** Renvoie null si la collection est pleine (1 000). */
  createSticker: (uri: string) => Promise<string | null>;
  /** false si déjà enregistré ou collection pleine. */
  saveSticker: (id: string) => Promise<boolean>;
  unsaveSticker: (id: string) => Promise<void>;
  removeComment: (id: string) => Promise<void>;
  reportComment: (id: string, reason: string) => Promise<void>;
  toggleCommentLike: (id: string) => void;
  pushNotification: (n: Omit<AppNotification, 'id' | 'createdAt' | 'read'>) => void;
  /** Mode démo : réactions simulées après une publication (notifications + Live Activity). */
  simulateEngagement: (badingId: string) => void;
  /** Mode démo : quelqu'un répond à mon commentaire quelques secondes plus tard. */
  simulateReply: (comment: Comment) => void;
  deletion: DeletionRequest;
  requestDeletion: (reason?: string) => Promise<void>;
  cancelDeletion: () => Promise<void>;
  favorites: string[];
  toggleFavorite: (id: string) => boolean;
  blocked: string[];
  block: (userId: string) => Promise<void>;
  unblock: (userId: string) => Promise<void>;
  /** Lève une ApiError 'taken' si le pseudo est pris. */
  changePseudo: (pseudo: string) => Promise<void>;
  /** Prénom et nom (privés, visibles seulement par moi). */
  changeName: (firstName: string, lastName: string) => Promise<void>;
  loadProfile: () => Promise<void>;
  loadSettings: () => Promise<void>;
  /** Charge tout ce qui concerne mon compte avant la « copie de mes données ». */
  loadExport: () => Promise<void>;
  /** Bading opened from a shared link before sign-in (Parcours 1). */
  pendingLink: string | null;
  setPendingLink: (id: string | null) => void;
  searchPseudos: (q: string) => Promise<User[]>;
};

const Ctx = createContext<Store | null>(null);

/** Relance l'erreur du serveur avec un code compris par les écrans. */
function withCode(error: unknown, renames: Record<string, string>, byStatus: Record<number, string>): never {
  if (isApiError(error)) {
    const server = error.code && !error.code.startsWith('http_') ? error.code : null;
    const code = (server && renames[server]) ?? server ?? byStatus[error.status];
    if (code) error.code = code;
  }
  throw error;
}

const DEMO_BADGE: BadgeRequest = { status: 'refused', reason: 'il faut au moins 1 000 rires reçus sur tes badings signés', decidedAt: Date.now() - 3 * 86_400_000 };

export function StoreProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(!USE_BACKEND);
  const [onboarded, setOnboarded] = useState(false);
  const [session, setSession] = useState<Session>(null);
  const [accounts, setAccounts] = useState<Record<string, Account>>({});
  const [pendingSignup, setPendingSignup] = useState<PendingSignup | null>(null);
  const [users, setUsers] = useState<Record<string, User>>(() => (USE_BACKEND ? {} : Object.fromEntries(seedUsers.map((u) => [u.id, u]))));
  // Vues de démo proportionnelles aux rires (un bading est lu bien plus souvent qu'il ne fait rire).
  const [pins, setPins] = useState<Pin[]>([]);
  const [feed, setFeed] = useState<Bading[]>(() => (USE_BACKEND ? [] : [...seedMyBadings, ...seedBadings].map((b) => ({ ...b, views: b.views ?? Math.round(b.likes * 6.3 + 41) }))));
  const [notifications, setNotifications] = useState<AppNotification[]>(USE_BACKEND ? [] : seedNotifications);
  const [draft, setDraft] = useState<Draft>({ text: '', anonymous: false, image: null });
  const [customStickers, setCustomStickers] = useState<Record<string, CustomSticker>>(() => (USE_BACKEND ? {} : Object.fromEntries(seedCustomStickers.map((s) => [s.id, s]))));
  const [myStickers, setMyStickers] = useState<string[]>([]);
  const [recentStickers, setRecentStickers] = useState<string[]>([]);
  const [mentionPolicy, setMentionPolicyState] = useState<MentionPolicy>('everyone');
  const [badge, setBadge] = useState<BadgeRequest>(USE_BACKEND ? { status: 'none' } : DEMO_BADGE);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [comments, setComments] = useState<Comment[]>(USE_BACKEND ? [] : seedComments);
  const [blocked, setBlocked] = useState<string[]>([]);
  const [pendingLink, setPendingLink] = useState<string | null>(null);
  const [deletion, setDeletion] = useState<DeletionRequest>({ status: 'none' });

  // Valeurs à jour pour les actions asynchrones (évite les closures périmées).
  const live = useRef({ feed, users, comments, favorites, myStickers, mentionPolicy, session, pendingSignup });
  live.current = { feed, users, comments, favorites, myStickers, mentionPolicy, session, pendingSignup };

  // Mon identifiant côté serveur : partout ailleurs, « moi » s'écrit ME_ID.
  const meServerId = useRef<string | null>(null);
  const ids = () => idMapper(meServerId.current);

  // ─── Rangement des réponses du serveur ───

  const mergeUsers = useCallback((list: any[] = []) => {
    if (!list.length) return;
    const map = ids();
    setUsers((u) => {
      const next = { ...u };
      list.forEach((raw) => { const user = fromServerUser(raw, map); next[user.id] = { ...next[user.id], ...user }; });
      return next;
    });
  }, []);

  const mergeBadings = useCallback((list: any[] = []) => {
    if (!list.length) return;
    const map = ids();
    const incoming = list.filter(Boolean).map((b) => fromServerBading(b, map));
    setFeed((f) => {
      const byId = new Map(f.map((b) => [b.id, b]));
      incoming.forEach((b) => byId.set(b.id, { ...byId.get(b.id), ...b }));
      return [...byId.values()];
    });
  }, []);

  const mergeStickers = useCallback((list: any[] = []) => {
    if (!list.length) return;
    const map = ids();
    setCustomStickers((m) => {
      const next = { ...m };
      list.forEach((raw) => { const s = fromServerSticker(raw, map); next[s.id] = { ...next[s.id], ...s }; });
      return next;
    });
  }, []);

  /** Met à jour mon profil (pseudo, photo, badge…) et la copie gardée dans la session. */
  const storeMe = useCallback((raw: any, email?: string) => {
    const user = fromServerUser({ ...raw, id: meServerId.current ?? raw.id }, ids());
    setUsers((u) => ({ ...u, [ME_ID]: { ...u[ME_ID], ...user } }));
    setSession((s) => {
      const next = { email: email ?? s?.email ?? raw.email ?? '', user: { ...s?.user, ...user } };
      void api.writeKey(ME_KEY, JSON.stringify({ email: next.email, user: raw }));
      return next;
    });
  }, []);

  const clearContent = useCallback(() => {
    setFeed([]); setPins([]); setComments([]); setNotifications([]); setFavorites([]); setBlocked([]);
    setMyStickers([]); setRecentStickers([]); setCustomStickers({}); setUsers({});
    setBadge({ status: 'none' }); setDeletion({ status: 'none' }); setMentionPolicyState('everyone');
  }, []);

  const openSession = useCallback((email: string, response: any) => {
    const { token, user } = response ?? {};
    if (!token || !user?.id) throw new ApiError(502, 'bad_response', 'Réponse inattendue du serveur.');
    api.setToken(token);
    meServerId.current = user.id;
    clearContent(); // un autre compte a pu être ouvert avant : rien de son cache ne doit s'afficher
    storeMe(user, email);
  }, [clearContent, storeMe]);

  const closeSession = useCallback(() => {
    api.setToken(null);
    void api.writeKey(ME_KEY, null);
    meServerId.current = null;
    setSession(null);
    clearContent();
  }, [clearContent]);

  // ─── Démarrage : relit la session gardée sur le téléphone ───
  useEffect(() => {
    if (!USE_BACKEND) return;
    api.setUnauthorizedHandler(closeSession); // session expirée ou révoquée : retour à la connexion
    let alive = true;
    (async () => {
      const [onboardedFlag, token, cached] = await Promise.all([api.readKey(ONBOARDED_KEY), api.restoreToken(), api.readKey(ME_KEY)]);
      if (!alive) return;
      if (onboardedFlag === '1') setOnboarded(true);
      let restored = false;
      if (token && cached) {
        try {
          const { email, user } = JSON.parse(cached);
          meServerId.current = user.id;
          storeMe(user, email);
          restored = true;
        } catch { /* cache illisible : on le relit depuis le serveur */ }
      }
      if (token && !restored) {
        try {
          const { user } = await api.getMe();
          meServerId.current = user.id;
          storeMe(user);
        } catch { /* hors ligne ou session expirée : écran de connexion */ }
      }
      if (alive) setReady(true);
      // Profil à jour (pseudo, badge, photo) sans bloquer l'ouverture de l'app.
      if (token && restored) api.getMe().then(({ user }) => alive && storeMe(user)).catch(() => {});
    })();
    return () => { alive = false; api.setUnauthorizedHandler(null); };
  }, [closeSession, storeMe]);

  const finishOnboarding = useCallback(() => {
    setOnboarded(true);
    if (USE_BACKEND) void api.writeKey(ONBOARDED_KEY, '1');
  }, []);

  const sortedFeed = useMemo(
    () => [...feed].filter((b) => !b.deleted && !blocked.includes(b.authorId)).sort((a, b) => b.createdAt - a.createdAt),
    [feed, blocked],
  );

  const getBading = useCallback((id: string) => feed.find((b) => b.id === id), [feed]);
  const getUser = useCallback((id: string) => users[id], [users]);

  // ─── Compte ───

  const signIn = useCallback((email: string, pseudo: string) => {
    // Mode démo : la photo de profil reste après une reconnexion.
    setUsers((u) => {
      const user: User = { id: ME_ID, pseudo, verified: false, hue: 280, joinedAt: Date.now() - 45 * 86_400_000, ...(u[ME_ID]?.photo ? { photo: u[ME_ID].photo } : {}) };
      setSession({ email, user });
      return { ...u, [ME_ID]: user };
    });
  }, []);

  const startSignup = useCallback(async (email: string, password: string, names?: { firstname: string; lastname: string }) => {
    let challenge: string | undefined;
    if (USE_BACKEND) {
      // Le serveur refuse d'envoyer un code à une adresse qui a déjà un compte.
      try {
        ({ challenge } = await api.sendSignupCode(email));
      } catch (error) {
        if (isApiError(error) && (error.code === 'email_taken' || error.status === 409)) return 'taken' as const;
        throw error;
      }
    } else if (accounts[email]) {
      return 'taken' as const;
    }
    setPendingSignup({ email, secret: fingerprint(email, password), password: USE_BACKEND ? password : '', firstname: names?.firstname ?? '', lastname: names?.lastname ?? '', challenge });
    return 'ok' as const;
  }, [accounts]);

  const verifySignupCode = useCallback(async (code: string): Promise<VerifyResult> => {
    const pending = live.current.pendingSignup;
    if (!pending) throw new ApiError(400, 'no_pending_signup');
    const clean = code.replace(/\s/g, '');
    if (!USE_BACKEND) return /^\d{6}$/.test(clean) ? 'ok' : 'invalid';
    if (!pending.challenge) return 'expired';
    try {
      const { emailToken } = await api.verifySignupCode({ email: pending.email, code: clean, challenge: pending.challenge });
      setPendingSignup((p) => (p && p.email === pending.email ? { ...p, emailToken } : p));
      return 'ok';
    } catch (error) {
      if (isApiError(error) && error.code === 'code_expired') return 'expired';
      if (isApiError(error) && error.code === 'invalid_code') return 'invalid';
      throw error;
    }
  }, []);

  const resendSignupCode = useCallback(async () => {
    const pending = live.current.pendingSignup;
    if (!pending) throw new ApiError(400, 'no_pending_signup');
    if (!USE_BACKEND) return;
    const { challenge } = await api.sendSignupCode(pending.email);
    setPendingSignup((p) => (p && p.email === pending.email ? { ...p, challenge, emailToken: undefined } : p));
  }, []);

  const isPseudoAvailable = useCallback(async (pseudo: string) => {
    if (USE_BACKEND) {
      const { available } = await api.isPseudoAvailable(pseudo);
      return typeof available === 'boolean' ? available : null;
    }
    const wanted = pseudo.toLowerCase();
    return !Object.values(live.current.users).some((u) => u.pseudo.toLowerCase() === wanted);
  }, []);

  const register = useCallback(async (pseudo: string) => {
    if (!pendingSignup) throw new ApiError(400, 'no_pending_signup');
    const { email, secret, password, firstname, lastname, emailToken } = pendingSignup;
    if (USE_BACKEND) {
      if (!emailToken) throw new ApiError(400, 'email_unverified');
      let response;
      try {
        response = await api.register({ firstname, lastname, username: pseudo, email, password, emailToken });
      } catch (error) {
        // Preuve expirée (plus d'1 h) : un nouveau code part tout de suite, l'écran du code reprend la main.
        if (isApiError(error) && error.code === 'email_unverified') {
          const fresh = await api.sendSignupCode(email).then((r) => r.challenge, () => undefined);
          setPendingSignup((p) => (p ? { ...p, emailToken: undefined, challenge: fresh } : p));
        }
        withCode(error,
          { pseudo_taken: 'taken', email_taken: 'account_exists', invalid_email: 'invalid_signup', weak_password: 'invalid_signup', invalid_name: 'invalid_signup' },
          { 409: 'account_exists', 400: 'invalid_signup' });
      }
      openSession(email, response);
    } else {
      setAccounts((a) => ({ ...a, [email]: { email, secret, pseudo } }));
      signIn(email, pseudo);
    }
    setPendingSignup(null);
  }, [pendingSignup, openSession, signIn]);

  const logIn = useCallback(async (email: string, password: string): Promise<LoginResult> => {
    if (USE_BACKEND) {
      try {
        openSession(email, await api.login({ email, password }));
        return 'ok';
      } catch (error) {
        if (isApiError(error)) {
          if (error.code === 'unknown' || error.status === 404) return 'unknown';
          if (error.code === 'wrong_password' || (error.status === 401 && error.code !== 'account_blocked')) return 'wrong_password';
        }
        throw error;
      }
    }
    const acc = accounts[email];
    if (!acc) return 'unknown';
    if (acc.secret !== fingerprint(email, password)) return 'wrong_password';
    signIn(email, acc.pseudo);
    return 'ok';
  }, [accounts, openSession, signIn]);

  const isEmailTaken = useCallback((email: string) => !!accounts[email], [accounts]);

  const requestPasswordReset = useCallback(async (email: string) => {
    if (USE_BACKEND) await api.requestPasswordReset(email);
  }, []);

  // Jeton push de ce téléphone, donné au serveur pour le compte connecté.
  const pushToken = useRef<string | null>(null);
  const enablePush = useCallback(async (): Promise<PushStatus> => {
    const result = await registerForPush().catch(() => null);
    if (!result) return 'unavailable';
    if (result.token && USE_BACKEND && api.getToken()) {
      try {
        await api.registerPushToken(result.token);
        pushToken.current = result.token;
      } catch (error) {
        if (__DEV__) console.warn('[push] jeton refusé', error);
      }
    }
    return result.status;
  }, []);

  const signOut = useCallback(() => {
    if (!USE_BACKEND) return setSession(null);
    // Plus de notifications du compte sur ce téléphone ; les requêtes partent avec le jeton de session avant qu'il soit effacé.
    if (pushToken.current && api.getToken()) fireAndForget(api.unregisterPushToken(pushToken.current));
    pushToken.current = null;
    if (api.getToken()) fireAndForget(api.logout()); // le jeton part avec la requête avant d'être effacé
    closeSession();
  }, [closeSession]);

  const setPhoto = useCallback(async (uri: string | null) => {
    if (USE_BACKEND) {
      const image = uri ? await api.toDataUrl(uri) : null;
      const { user } = await api.updatePhoto(image);
      storeMe(user);
      return;
    }
    const apply = (x: User): User => { const { photo: _old, ...rest } = x; return uri ? { ...rest, photo: uri } : rest; };
    setUsers((u) => (u[ME_ID] ? { ...u, [ME_ID]: apply(u[ME_ID]) } : u));
    setSession((s) => (s ? { ...s, user: apply(s.user) } : s));
  }, [storeMe]);

  const changePseudo = useCallback(async (pseudo: string) => {
    if (USE_BACKEND) {
      try {
        const { user } = await api.updateMe({ pseudo });
        storeMe(user);
      } catch (error) {
        withCode(error, { pseudo_taken: 'taken' }, { 409: 'taken' });
      }
    } else {
      // F7 RG7: changing the pseudo removes the verified badge.
      const pseudoChangeableAt = Date.now() + PSEUDO_CHANGE_GAP_MS;
      setUsers((u) => (u[ME_ID] ? { ...u, [ME_ID]: { ...u[ME_ID], pseudo, verified: false, pseudoChangeableAt } } : u));
      setSession((s) => (s ? { ...s, user: { ...s.user, pseudo, verified: false, pseudoChangeableAt } } : s));
    }
    setBadge((b) => (b.status === 'accepted' ? { status: 'none' } : b));
  }, [storeMe]);

  const changeName = useCallback(async (firstName: string, lastName: string) => {
    if (USE_BACKEND) {
      const { user } = await api.updateMe({ firstName, lastName });
      storeMe(user);
      return;
    }
    setUsers((u) => (u[ME_ID] ? { ...u, [ME_ID]: { ...u[ME_ID], firstName, lastName } } : u));
    setSession((s) => (s ? { ...s, user: { ...s.user, firstName, lastName } } : s));
  }, [storeMe]);

  // ─── Fil et badings ───

  const loadFeed = useCallback(async () => {
    if (!USE_BACKEND) return;
    const { badings = [], origins = [], users: people = [], pinned = [] } = await api.getFeed();
    mergeUsers(people);
    const map = ids();
    const received = badings.map((b: any) => fromServerBading(b, map));
    const keep = new Set([...live.current.favorites, ...live.current.feed.filter((b) => b.authorId === ME_ID).map((b) => b.id)]);
    setFeed((f) => pruneFeed(f, received, api.FEED_PAGE_SIZE, keep));
    mergeBadings([...badings, ...origins, ...pinned]);
    // Épingles : seulement dans la première page du fil ; une épingle retirée disparaît au prochain chargement.
    setPins(pinned.filter(Boolean).map((b: any) => ({ id: b.id, ...(b.pinnedLabel ? { label: b.pinnedLabel } : {}) })));
  }, [mergeUsers, mergeBadings]);

  const incoming = useRef([...incomingBadings]);
  const refreshFeed = useCallback(async () => {
    if (USE_BACKEND) {
      const newest = live.current.feed.reduce((m, b) => Math.max(m, b.createdAt), 0) || undefined;
      const known = new Set(live.current.feed.map((b) => b.id));
      const { badings = [], origins = [], users: people = [] } = await api.getFeed(newest);
      mergeUsers(people);
      mergeBadings([...badings, ...origins]);
      return badings.filter((b: any) => !known.has(b.id)).length;
    }
    return new Promise<number>((resolve) => {
      setTimeout(() => {
        const batch = incoming.current.splice(0, Math.random() < 0.5 ? 1 : 2);
        if (batch.length) setFeed((f) => [...batch.map((b) => ({ ...b, createdAt: Date.now() })), ...f]);
        resolve(batch.length);
      }, 1400);
    });
  }, [mergeUsers, mergeBadings]);

  const loadBading = useCallback(async (badingId: string) => {
    if (!USE_BACKEND) return live.current.feed.some((b) => b.id === badingId && !b.deleted) ? 'ok' as const : 'missing' as const;
    try {
      const { bading, users: people = [], comments: list = [], rebades = [], origins = [], stickers = [] } = await api.getBading(badingId);
      mergeUsers(people);
      mergeStickers(stickers);
      mergeBadings([{ ...bading, commentCount: list.filter((c: any) => !c.deleted).length }, ...rebades, ...origins]);
      const map = ids();
      setComments((cs) => cs.filter((c) => c.badingId !== badingId).concat(list.map((c: any) => fromServerComment(c, map))));
      return 'ok' as const;
    } catch (error) {
      if (isApiError(error) && error.status === 404) {
        setFeed((f) => f.filter((b) => b.id !== badingId)); // n'existe plus : disparaît aussi du fil et du profil
        return 'missing' as const;
      }
      throw error;
    }
  }, [mergeUsers, mergeStickers, mergeBadings]);

  const likeLocally = (id: string) => setFeed((f) => f.map((b) => (b.id === id ? { ...b, likedByMe: !b.likedByMe, likes: b.likes + (b.likedByMe ? -1 : 1) } : b)));
  const likesInFlight = useRef(new Set<string>());
  const toggleLike = useCallback((id: string) => {
    if (likesInFlight.current.has(id)) return; // double toucher pendant l'envoi
    likeLocally(id);
    if (!USE_BACKEND) return;
    likesInFlight.current.add(id);
    api.toggleBadingLike(id)
      .then(({ likes, likedByMe }) => setFeed((f) => f.map((b) => (b.id === id ? { ...b, likes, likedByMe } : b))))
      .catch((error) => { likeLocally(id); reportError(error); })
      .finally(() => likesInFlight.current.delete(id));
  }, []);

  /** Une vue = une ouverture du bading en grand. Côté serveur : une fois par personne et par jour. */
  const addView = useCallback((id: string) => {
    setFeed((f) => f.map((b) => (b.id === id ? { ...b, views: (b.views ?? 0) + 1 } : b)));
    if (USE_BACKEND && live.current.session) fireAndForget(api.addBadingView(id));
  }, []);

  const share = useCallback((id: string) => {
    setFeed((f) => f.map((b) => (b.id === id ? { ...b, shares: b.shares + 1 } : b)));
    if (USE_BACKEND) fireAndForget(api.addBadingShare(id));
  }, []);

  const publish: Store['publish'] = useCallback(
    async (text, anonymous, image) => {
      const error = validateBading(text, !!image);
      if (error) return { ok: false, error };
      if (USE_BACKEND) {
        try {
          const dataUrl = image ? await api.toDataUrl(image.uri) : null;
          const { bading } = await api.createBading({
            text: text.trim(),
            anonymous,
            image: image && dataUrl ? { dataUrl, ratio: image.width / image.height } : null,
          });
          mergeBadings([bading]);
          setDraft({ text: '', anonymous: false, image: null });
          return { ok: true, id: bading.id };
        } catch (e) {
          if (isApiError(e) && PUBLISH_ERRORS.includes(e.code as PublishError)) return { ok: false, error: e.code as PublishError };
          throw e;
        }
      }
      const id = uid('m');
      setFeed((f) => [
        { id, authorId: ME_ID, anonymous, text: text.trim(), ...(image ? { image } : {}), createdAt: Date.now(), likes: 0, likedByMe: false, rebades: 0, shares: 0, views: 0 },
        ...f,
      ]);
      setDraft({ text: '', anonymous: false, image: null });
      return { ok: true, id };
    },
    [mergeBadings],
  );

  const rebade: Store['rebade'] = useCallback(async (id, opinion, anonymous) => {
    // RG5: a rebade always points to the original bading.
    const target = live.current.feed.find((b) => b.id === id);
    const originId = target?.rebadeOf ?? id;
    const text = opinion.trim().slice(0, RULES.opinionMax);
    if (USE_BACKEND) {
      const { bading, rebades } = await api.createRebade(originId, { text, anonymous });
      mergeBadings([bading]);
      const countedOn = bading?.rebadeOf ?? originId;
      if (typeof rebades === 'number') setFeed((f) => f.map((b) => (b.id === countedOn ? { ...b, rebades } : b)));
      return;
    }
    setFeed((f) => [
      { id: uid('r'), authorId: ME_ID, anonymous, rebadeOf: originId, text, createdAt: Date.now(), likes: 0, likedByMe: false, rebades: 0, shares: 0, views: 0 },
      ...f.map((b) => (b.id === originId ? { ...b, rebades: b.rebades + 1 } : b)),
    ]);
  }, [mergeBadings]);

  const remove = useCallback(async (id: string) => {
    if (USE_BACKEND) await api.deleteBading(id); // on attend la confirmation avant de le retirer
    setFeed((f) => f.map((b) => (b.id === id ? { ...b, deleted: true } : b)));
  }, []);

  const report = useCallback(async (id: string, reason: string) => {
    if (USE_BACKEND) await api.reportBading(id, reason);
  }, []);

  const toggleFavorite = useCallback((id: string) => {
    const added = !live.current.favorites.includes(id);
    const apply = (on: boolean) => setFavorites((f) => (on ? [id, ...f.filter((x) => x !== id)] : f.filter((x) => x !== id)));
    apply(added);
    if (USE_BACKEND) {
      (added ? api.addFavorite(id) : api.removeFavorite(id)).catch((error) => { apply(!added); reportError(error); });
    }
    return added;
  }, []);

  const searchPseudos = useCallback(async (q: string) => {
    if (USE_BACKEND) {
      const { users: found = [] } = await api.searchUsers(q);
      mergeUsers(found);
      const map = ids();
      return found.map((u: any) => fromServerUser(u, map)).filter((u: User) => u.id !== ME_ID && !blocked.includes(u.id)).slice(0, 5);
    }
    return Object.values(live.current.users)
      .filter((u) => u.id !== ME_ID && !blocked.includes(u.id) && u.pseudo.toLowerCase().startsWith(q.toLowerCase()))
      .slice(0, 5);
  }, [blocked, mergeUsers]);

  // ─── Commentaires ───

  const commentsFor = useCallback(
    (badingId: string) => groupThreads(comments.filter((c) => c.badingId === badingId), (c) => !!c.deleted || blocked.includes(c.authorId)),
    [comments, blocked],
  );  const commentTree = useCallback(
    (badingId: string) => buildTree(comments.filter((c) => c.badingId === badingId), (c) => !!c.deleted || blocked.includes(c.authorId)),
    [comments, blocked],
  );
  const commentCount = useCallback(
    (badingId: string) => {
      // Avec le backend, chaque bading porte son compteur (le fil n'a pas chargé les commentaires).
      const counted = feed.find((b) => b.id === badingId)?.commentCount;
      if (typeof counted === 'number') return counted;
      return comments.filter((c) => c.badingId === badingId && !c.deleted && !blocked.includes(c.authorId)).length;
    },
    [feed, comments, blocked],
  );
  const bumpCommentCount = (badingId: string, delta: number) =>
    setFeed((f) => f.map((b) => (b.id === badingId && typeof b.commentCount === 'number' ? { ...b, commentCount: Math.max(0, b.commentCount + delta) } : b)));

  const addComment = useCallback(
    async (badingId: string, text: string, parent?: Comment, sticker?: string, audio?: VoiceRecording) => {
      const t = sticker || audio ? '' : text.trim();
      if (!sticker && !audio && (!t || t.length > RULES.commentMax)) return null;
      if (!sticker && !audio && BANNED.some((w) => t.toLowerCase().includes(w))) return null;
      const replyTo = parent ? live.current.users[parent.authorId]?.pseudo : undefined;
      let c: Comment;
      if (USE_BACKEND) {
        try {
          const { comment } = await api.createComment(badingId, {
            text: t,
            stickerId: sticker ?? null,
            // Le serveur rattache la réponse au commentaire exact et notifie son auteur.
            parentId: parent ? parent.id : null,
            ...(audio ? { audio } : {}),
          });
          c = fromServerComment(comment, ids());
          if (!c.replyTo && replyTo) c.replyTo = replyTo;
        } catch (error) {
          if (isApiError(error) && error.code === 'blocked_word') return null;
          throw error;
        }
        bumpCommentCount(badingId, 1);
      } else {
        c = {
          id: uid('c'),
          badingId,
          authorId: ME_ID,
          text: t,
          ...(sticker ? { sticker } : {}),
          createdAt: Date.now(),
          parentId: parent ? parent.id : null,
          replyTo,
          likes: 0,
          likedByMe: false,
        };
      }
      if (sticker) setRecentStickers((r) => [sticker, ...r.filter((x) => x !== sticker)].slice(0, 12));
      setComments((cs) => [...cs, c]);
      return c;
    },
    [],
  );

  const removeComment = useCallback(async (id: string) => {
    if (USE_BACKEND) await api.deleteComment(id);
    // Comme sur le serveur : les réponses (à toutes les profondeurs) partent avec le commentaire.
    const subtree = descendantIds(live.current.comments, id).add(id);
    const gone = live.current.comments.filter((c) => subtree.has(c.id) && !c.deleted);
    setComments((cs) => cs.map((c) => (subtree.has(c.id) ? { ...c, deleted: true } : c)));
    if (gone[0]) bumpCommentCount(gone[0].badingId, -gone.length);
  }, []);

  const reportComment = useCallback(async (id: string, reason: string) => {
    if (USE_BACKEND) await api.reportComment(id, reason);
  }, []);

  const likeCommentLocally = (id: string) => setComments((cs) => cs.map((c) => (c.id === id ? { ...c, likedByMe: !c.likedByMe, likes: c.likes + (c.likedByMe ? -1 : 1) } : c)));
  const toggleCommentLike = useCallback((id: string) => {
    likeCommentLocally(id);
    if (!USE_BACKEND) return;
    api.toggleCommentLike(id)
      .then(({ likes, likedByMe }) => setComments((cs) => cs.map((c) => (c.id === id ? { ...c, likes, likedByMe } : c))))
      .catch((error) => { likeCommentLocally(id); reportError(error); });
  }, []);

  // ─── Stickers personnels (F8) ───

  const loadStickers = useCallback(async () => {
    if (!USE_BACKEND) return;
    const { stickers = [] } = await api.getMyStickers();
    mergeStickers(stickers);
    setMyStickers(stickers.map((s: any) => s.id));
  }, [mergeStickers]);

  const createSticker = useCallback(async (uri: string) => {
    // Collection pleine : on refuse plutôt que d'effacer un sticker sans prévenir.
    if (live.current.myStickers.length >= MAX_MY_STICKERS) return null;
    if (USE_BACKEND) {
      try {
        const { sticker } = await api.createSticker(await api.toDataUrl(uri));
        mergeStickers([sticker]);
        setMyStickers((l) => [sticker.id, ...l.filter((x) => x !== sticker.id)]);
        return sticker.id as string;
      } catch (error) {
        if (isApiError(error) && error.code === 'full') return null;
        throw error;
      }
    }
    const id = uid('my');
    setCustomStickers((m) => ({ ...m, [id]: { id, ownerId: ME_ID, uri, createdAt: Date.now() } }));
    setMyStickers((l) => [id, ...l].slice(0, MAX_MY_STICKERS));
    live.current.myStickers = [id, ...live.current.myStickers];
    return id;
  }, [mergeStickers]);

  const saveSticker = useCallback(async (id: string) => {
    const mine = live.current.myStickers;
    if (mine.includes(id) || mine.length >= MAX_MY_STICKERS) return false;
    if (USE_BACKEND) {
      try { await api.saveSticker(id); } catch (error) {
        if (isApiError(error) && error.code === 'full') return false;
        throw error;
      }
    }
    setMyStickers((l) => [id, ...l].slice(0, MAX_MY_STICKERS));
    live.current.myStickers = [id, ...mine];
    return true;
  }, []);

  const unsaveSticker = useCallback(async (id: string) => {
    if (USE_BACKEND) await api.unsaveSticker(id);
    setMyStickers((l) => l.filter((x) => x !== id));
  }, []);

  // ─── Notifications ───

  const loadNotifications = useCallback(async () => {
    if (!USE_BACKEND) return;
    const { notifications: list = [], users: people = [], badings = [], origins = [] } = await api.getNotifications();
    mergeUsers(people);
    mergeBadings([...badings, ...origins]);
    const map = ids();
    setNotifications(list.map((n: any) => fromServerNotification(n, map)));
  }, [mergeUsers, mergeBadings]);

  const markAllRead = useCallback(() => {
    setNotifications((n) => (n.some((x) => !x.read) ? n.map((x) => ({ ...x, read: true })) : n));
    if (USE_BACKEND && live.current.session) fireAndForget(api.markNotificationsRead());
  }, []);

  const markRead = useCallback((id: string) => {
    setNotifications((n) => n.map((x) => (x.id === id ? { ...x, read: true } : x)));
    if (USE_BACKEND && live.current.session) fireAndForget(api.markNotificationsRead([id]));
  }, []);

  const pushNotification = useCallback((n: Omit<AppNotification, 'id' | 'createdAt' | 'read'>) => {
    setNotifications((ns) => [{ ...n, id: uid('n'), createdAt: Date.now(), read: false }, ...ns]);
  }, []);

  const teaserOf = (text: string) => (text.length > 60 ? `${text.slice(0, 60).trimEnd()}…` : text);

  const simulateEngagement = useCallback((badingId: string) => {
    if (USE_BACKEND) return; // les vraies réactions arrivent par les notifications du serveur
    const b = live.current.feed.find((x) => x.id === badingId);
    if (!b) return;
    const url = `/bading/${badingId}`;
    let laughs = 0;
    let rebadesN = 0;
    const activity = startBadingActivity({ laughs: 0, comments: 0, rebades: 0, teaser: teaserOf(b.text), status: 'En ligne' }, `jebade://bading/${badingId}`);
    let tick = 0;
    const timer = setInterval(() => {
      tick += 1;
      const add = 1 + Math.floor(Math.random() * 4);
      laughs += add;
      if (tick % 3 === 0) rebadesN += 1;
      setFeed((f) => f.map((x) => (x.id === badingId ? { ...x, likes: x.likes + add, views: (x.views ?? 0) + add * 5 + Math.floor(Math.random() * 6), rebades: tick % 3 === 0 ? x.rebades + 1 : x.rebades } : x)));
      activity?.update({ laughs, comments: 0, rebades: rebadesN, teaser: teaserOf(b.text), status: laughs > 10 ? 'Ça cartonne 🔥' : 'En ligne' });
      if (tick === 3) {
        pushNotification({ kind: 'like', actorId: 'u1', others: Math.max(0, laughs - 1), badingId });
        notifyLocal('Ton bading fait rire 😂', `Koffi225 et ${Math.max(0, laughs - 1)} autres ont ri à « ${teaserOf(b.text)} »`, url);
      }
      if (tick >= 8) {
        clearInterval(timer);
        activity?.end();
      }
    }, 2500);
  }, [pushNotification]);

  const simulateReply = useCallback((c: Comment) => {
    if (USE_BACKEND) return;
    setTimeout(() => {
      // Un sticker appelle souvent un sticker : la réponse simulée alterne texte et sticker.
      const withSticker = !!c.sticker || Math.random() < 0.3;
      const reply: Comment = {
        id: uid('c'),
        badingId: c.badingId,
        authorId: 'u2',
        text: withSticker ? '' : 'Ahh toi aussi 😂 tu m’as tuée',
        ...(withSticker ? { sticker: c.sticker === 'us2' ? 'mort' : 'us2' } : {}),
        createdAt: Date.now(),
        parentId: c.id,
        replyTo: live.current.users[c.authorId]?.pseudo,
        likes: 0,
        likedByMe: false,
      };
      setComments((cs) => [...cs, reply]);
      pushNotification({ kind: 'reply', actorId: 'u2', badingId: c.badingId });
      notifyLocal('AwaLaGo t’a répondu', reply.sticker ? 'avec un sticker 😂' : reply.text, `/bading/${c.badingId}`);
    }, 7000);
  }, [pushNotification]);

  // ─── Réglages, profil, badge, suppression ───

  const setMentionPolicy = useCallback((p: MentionPolicy) => {
    const before = live.current.mentionPolicy;
    setMentionPolicyState(p);
    if (USE_BACKEND) api.updateSettings({ mentionPolicy: p }).catch((error) => { setMentionPolicyState(before); reportError(error); });
  }, []);

  const block = useCallback(async (userId: string) => {
    if (USE_BACKEND) await api.blockUser(ids().toServer(userId));
    setBlocked((b) => (b.includes(userId) ? b : [...b, userId]));
  }, []);

  const unblock = useCallback(async (userId: string) => {
    if (USE_BACKEND) await api.unblockUser(ids().toServer(userId));
    setBlocked((b) => b.filter((x) => x !== userId));
  }, []);

  const loadProfile = useCallback(async () => {
    if (!USE_BACKEND) return;
    const { user, badings = [], favorites: favs = [], origins = [], users: people = [] } = await api.getProfile();
    mergeUsers(people);
    if (user) storeMe(user);
    mergeBadings([...badings, ...favs, ...origins]);
    setFavorites(favs.map((b: any) => b.id));
  }, [mergeUsers, mergeBadings, storeMe]);

  const loadSettings = useCallback(async () => {
    if (!USE_BACKEND) return;
    const { mentionPolicy: policy, blocked: list = [], badge: b, deletion: d } = await api.getSettings();
    mergeUsers(list);
    const map = ids();
    if (policy) setMentionPolicyState(policy);
    setBlocked(list.map((u: any) => map.toLocal(u.id)));
    if (b) setBadge(b);
    if (d) setDeletion(d);
  }, [mergeUsers]);

  const loadExport = useCallback(async () => {
    if (!USE_BACKEND) return;
    const { user, badings = [], liked = [], favorites: favs = [], origins = [], comments: list = [], users: people = [] } = await api.getExport();
    mergeUsers(people);
    if (user) storeMe(user);
    mergeBadings([...badings, ...liked, ...favs, ...origins]);
    const map = ids();
    // On ajoute sans écraser : un bading déjà ouvert garde aussi les commentaires des autres Badeurs.
    setComments((cs) => {
      const known = new Set(cs.map((c) => c.id));
      return [...cs, ...list.filter((c: any) => !known.has(c.id)).map((c: any) => fromServerComment(c, map))];
    });
    setFavorites(favs.map((b: any) => b.id));
  }, [mergeUsers, mergeBadings, storeMe]);

  const requestBadge = useCallback(async (links: string[], documentUri?: string | null) => {
    if (!USE_BACKEND) return setBadge({ status: 'pending', links });
    const form = new FormData();
    links.forEach((link) => form.append('links', link));
    if (documentUri) {
      // React Native envoie le fichier à partir de son uri.
      form.append('document', { uri: documentUri, name: 'piece-identite.jpg', type: 'image/jpeg' } as unknown as Blob);
    }
    const { badge: b } = await api.requestBadge(form);
    setBadge(b ?? { status: 'pending', links });
  }, []);

  const requestDeletion = useCallback(async (reason?: string) => {
    if (USE_BACKEND) {
      const { deletion: d } = await api.requestDeletion(reason ?? null);
      setDeletion(d ?? { status: 'pending', requestedAt: Date.now(), reason });
      return;
    }
    setDeletion({ status: 'pending', requestedAt: Date.now(), reason });
  }, []);

  const cancelDeletion = useCallback(async () => {
    if (USE_BACKEND) await api.cancelDeletion();
    setDeletion({ status: 'none' });
  }, []);

  const value = useMemo<Store>(
    () => ({
      ready,
      onboarded,
      session,
      users,
      feed: sortedFeed,
      pins,
      notifications,
      draft,
      mentionPolicy,
      badge,
      finishOnboarding,
      startSignup,
      signupEmail: pendingSignup?.email ?? null,
      signupEmailVerified: !USE_BACKEND || !!pendingSignup?.emailToken,
      verifySignupCode,
      resendSignupCode,
      isPseudoAvailable,
      register,
      logIn,
      isEmailTaken,
      hasPendingSignup: !!pendingSignup,
      requestPasswordReset,
      signOut,
      enablePush,
      setPhoto,
      loadFeed,
      refreshFeed,
      loadBading,
      getBading,
      getUser,
      toggleLike,
      share,
      addView,
      publish,
      rebade,
      remove,
      report,
      setDraft,
      loadNotifications,
      markAllRead,
      markRead,
      setMentionPolicy,
      requestBadge,
      comments,
      commentsFor,
      commentTree,
      commentCount,
      addComment,
      customStickers,
      myStickers,
      recentStickers,
      loadStickers,
      createSticker,
      saveSticker,
      unsaveSticker,
      removeComment,
      reportComment,
      toggleCommentLike,
      pushNotification,
      simulateEngagement,
      simulateReply,
      deletion,
      requestDeletion,
      cancelDeletion,
      favorites,
      toggleFavorite,
      blocked,
      block,
      unblock,
      changePseudo,
      changeName,
      loadProfile,
      loadSettings,
      loadExport,
      pendingLink,
      setPendingLink,
      searchPseudos,
    }),
    [ready, onboarded, session, users, sortedFeed, pins, notifications, draft, mentionPolicy, badge, finishOnboarding, startSignup, verifySignupCode, resendSignupCode, isPseudoAvailable, register, logIn, isEmailTaken, pendingSignup, requestPasswordReset, signOut, enablePush, setPhoto, loadFeed, refreshFeed, loadBading, getBading, getUser, toggleLike, share, addView, publish, rebade, remove, report, loadNotifications, markAllRead, markRead, setMentionPolicy, requestBadge, comments, commentsFor, commentTree, commentCount, addComment, customStickers, myStickers, recentStickers, loadStickers, createSticker, saveSticker, unsaveSticker, removeComment, reportComment, toggleCommentLike, pushNotification, simulateEngagement, simulateReply, deletion, requestDeletion, cancelDeletion, favorites, toggleFavorite, blocked, block, unblock, changePseudo, changeName, loadProfile, loadSettings, loadExport, pendingLink, searchPseudos],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore() {
  const s = useContext(Ctx);
  if (!s) throw new Error('useStore must be used inside StoreProvider');
  return s;
}

