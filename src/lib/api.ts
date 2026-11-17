/**
 * Client HTTP du backend On Bade (même contrat que le site web : voir API.md du dépôt web).
 * Seul fichier qui connaît l'adresse du serveur et le format des requêtes ; le store (src/data/store.tsx)
 * l'appelle et range les réponses.
 *
 * Réglages (fichier .env, variables EXPO_PUBLIC_* lues au build) :
 *   EXPO_PUBLIC_API_URL=https://backend-onbade.oriverse-it.tech/api   (par défaut : la production)
 *   EXPO_PUBLIC_USE_BACKEND=false   (mode démo : tout reste simulé dans l'app, rien n'est envoyé)
 */
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

export const API_URL = (process.env.EXPO_PUBLIC_API_URL || 'https://backend-onbade.oriverse-it.tech/api').replace(/\/$/, '');

/** true : l'app parle au backend. false : mode démo local (données de seed.ts), utilisé par les tests. */
export const USE_BACKEND = process.env.EXPO_PUBLIC_USE_BACKEND !== 'false';

const TIMEOUT_MS = 15_000;
const TOKEN_KEY = 'onbade-token';

// ─── Petit stockage persistant (jeton, onboarding) ────────
// Trousseau du téléphone (SecureStore) ; sur le web, localStorage.

const web = Platform.OS === 'web';

export async function readKey(key: string): Promise<string | null> {
  try {
    if (web) return globalThis.localStorage?.getItem(key) ?? null;
    return await SecureStore.getItemAsync(key);
  } catch {
    return null;
  }
}

export async function writeKey(key: string, value: string | null) {
  try {
    if (web) {
      if (value === null) globalThis.localStorage?.removeItem(key);
      else globalThis.localStorage?.setItem(key, value);
      return;
    }
    if (value === null) await SecureStore.deleteItemAsync(key);
    else await SecureStore.setItemAsync(key, value);
  } catch {
    /* stockage indisponible : la session ne survivra pas à la fermeture de l'app */
  }
}

// ─── Jeton de session ─────────────────────────────────────
// Gardé en mémoire pour les requêtes, et dans le trousseau pour la prochaine ouverture de l'app.

let token: string | null = null;

export const getToken = () => token;

export function setToken(value: string | null) {
  token = value;
  void writeKey(TOKEN_KEY, value);
}

/** Au démarrage : relit le jeton gardé dans le trousseau. */
export async function restoreToken() {
  token = await readKey(TOKEN_KEY);
  return token;
}

/** Appelé quand le serveur répond 401 (session expirée ou révoquée). */
let onUnauthorized: (() => void) | null = null;
export const setUnauthorizedHandler = (fn: (() => void) | null) => { onUnauthorized = fn; };

// ─── Erreurs ──────────────────────────────────────────────

/**
 * Erreur levée par toutes les fonctions de ce fichier.
 * - status : code HTTP (0 = serveur injoignable ou délai dépassé)
 * - code   : code métier du serveur (« taken », « wrong_password »…), ou 'network' / 'timeout' / 'http_<status>'
 */
export class ApiError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string, message = '') {
    super(message || code);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

export const isApiError = (e: unknown): e is ApiError => e instanceof ApiError;

/** Message lisible pour une erreur réseau ou serveur. */
export function errorMessage(e: unknown, fallback = 'Une erreur est survenue, réessaie.') {
  if (!isApiError(e)) return fallback;
  if (e.code === 'network') return 'Pas de connexion au serveur. Vérifie ton réseau.';
  if (e.code === 'timeout') return 'Le serveur met trop de temps à répondre. Réessaie.';
  if (e.code === 'account_blocked') return e.message && e.message !== e.code ? e.message : 'Ton compte est suspendu.';
  if (e.message && e.message !== e.code && !e.message.startsWith('http_')) return e.message;
  return fallback;
}

// ─── Requête générique ────────────────────────────────────

type Query = Record<string, string | number | undefined | null>;
type Options = { method?: string; body?: unknown; query?: Query };

async function readJson(response: Response) {
  const text = await response.text();
  if (!text) return {};
  try { return JSON.parse(text); } catch { return { message: text }; }
}

/** Le backend enveloppe ses réponses : { success, message, data }. On rend `data`. */
function unwrap(body: any) {
  if (body && typeof body === 'object' && typeof body.success === 'boolean' && 'data' in body) return body.data ?? {};
  return body;
}

export async function request<T = any>(path: string, { method = 'GET', body, query }: Options = {}): Promise<T> {
  const params = Object.entries(query ?? {})
    .filter(([, v]) => v !== undefined && v !== null)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join('&');
  const url = `${API_URL}${path}${params ? `?${params}` : ''}`;

  const headers: Record<string, string> = { Accept: 'application/json' };
  const sentToken = token;
  if (sentToken) headers.Authorization = `Bearer ${sentToken}`;
  const isForm = typeof FormData !== 'undefined' && body instanceof FormData;
  if (body !== undefined && !isForm) headers['Content-Type'] = 'application/json';

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  let response: Response;
  try {
    response = await fetch(url, {
      method,
      headers,
      body: body === undefined ? undefined : isForm ? (body as FormData) : JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (error: any) {
    if (error?.name === 'AbortError') throw new ApiError(0, 'timeout', 'Le serveur met trop de temps à répondre.');
    throw new ApiError(0, 'network', 'Impossible de joindre le serveur.');
  } finally {
    clearTimeout(timer);
  }

  const data = await readJson(response);
  if (!response.ok) {
    if (response.status === 401 && sentToken) {
      setToken(null);
      onUnauthorized?.();
    }
    throw new ApiError(response.status, data.code || `http_${response.status}`, data.message);
  }
  return unwrap(data) as T;
}

/** Lance une requête dont l'échec ne doit pas gêner l'utilisateur (vue, partage, déconnexion…). */
export function fireAndForget(promise: Promise<unknown>) {
  promise.catch((error) => { if (__DEV__) console.warn('[api]', error); });
}

/**
 * Fichier local (file://…) → data URL base64, le format attendu par le backend pour les images.
 * Une data URL ou une adresse http(s) est rendue telle quelle.
 */
export async function toDataUrl(uri: string): Promise<string> {
  if (uri.startsWith('data:') || /^https?:/.test(uri)) return uri;
  const blob = await (await fetch(uri)).blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => (typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('lecture impossible')));
    reader.onerror = () => reject(reader.error ?? new Error('lecture impossible'));
    reader.readAsDataURL(blob);
  });
}

// ─── Routes (voir API.md) ─────────────────────────────────

const get = <T = any>(path: string, query?: Query) => request<T>(path, { query });
const post = <T = any>(path: string, body?: unknown) => request<T>(path, { method: 'POST', body });
const patch = <T = any>(path: string, body?: unknown) => request<T>(path, { method: 'PATCH', body });
const put = <T = any>(path: string, body?: unknown) => request<T>(path, { method: 'PUT', body });
const del = <T = any>(path: string) => request<T>(path, { method: 'DELETE' });
const id = encodeURIComponent;

// Authentification
/** Inscription, étape 1 : envoie un code à 6 chiffres à l'adresse. 409 email_taken si elle a déjà un compte. */
export const sendSignupCode = (email: string) => post<{ challenge: string; expiresIn: number }>('/register/code', { email });
/** Code juste → emailToken, à joindre à register (valable 1 h). 400 invalid_code / code_expired. */
export const verifySignupCode = (b: { email: string; code: string; challenge: string }) => post<{ emailToken: string }>('/register/verify', b);
export const register = (b: { firstname: string; lastname: string; username: string; email: string; password: string; emailToken: string }) => post('/register', b);
export const login = (b: { email: string; password: string }) => post('/login', b);
export const logout = () => post('/logout');
export const getMe = () => get('/me');
export const isEmailAvailable = (email: string) => get<{ available: boolean }>('/email-available', { email });
export const isPseudoAvailable = (pseudo: string) => get<{ available: boolean }>('/pseudo-available', { pseudo });
export const requestPasswordReset = (email: string) => post('/password-reset', { email });

// Badings
export const FEED_PAGE_SIZE = 50;
export const getFeed = (since?: number) => get('/feed', { since, limit: FEED_PAGE_SIZE });
export const getBading = (badingId: string) => get(`/badings/${id(badingId)}`);
export const createBading = (b: { text: string; anonymous: boolean; image: { dataUrl: string; ratio: number } | null }) => post('/badings', b);
export const addBadingView = (badingId: string) => post(`/badings/${id(badingId)}/views`);
export const toggleBadingLike = (badingId: string) => post<{ likes: number; likedByMe: boolean }>(`/badings/${id(badingId)}/like`);
export const createRebade = (badingId: string, b: { text: string; anonymous: boolean }) => post(`/badings/${id(badingId)}/rebades`, b);
export const addBadingShare = (badingId: string) => post(`/badings/${id(badingId)}/shares`);
export const deleteBading = (badingId: string) => del(`/badings/${id(badingId)}`);
export const reportBading = (badingId: string, reason: string) => post(`/badings/${id(badingId)}/report`, { reason });

// Commentaires
export const createComment = (badingId: string, b: { text: string; stickerId: string | null; parentId: string | null }) => post(`/badings/${id(badingId)}/comments`, b);
export const deleteComment = (commentId: string) => del(`/comments/${id(commentId)}`);
export const toggleCommentLike = (commentId: string) => post<{ likes: number; likedByMe: boolean }>(`/comments/${id(commentId)}/like`);
export const reportComment = (commentId: string, reason: string) => post(`/comments/${id(commentId)}/report`, { reason });

// Utilisateurs et stickers
export const searchUsers = (q: string) => get('/users/search', { q });
export const createSticker = (image: string) => post('/stickers', { image });
export const getMyStickers = () => get('/me/stickers');
export const saveSticker = (stickerId: string) => put(`/me/stickers/${id(stickerId)}`);
export const unsaveSticker = (stickerId: string) => del(`/me/stickers/${id(stickerId)}`);

// Mon compte
export const getProfile = () => get('/me/profile');
export const getExport = () => get('/me/export');
export const updateMe = (changes: { pseudo?: string }) => patch('/me', changes);
export const updatePhoto = (image: string | null) => put('/me/photo', { image });
export const getSettings = () => get('/me/settings');
export const updateSettings = (changes: { mentionPolicy: string }) => patch('/me/settings', changes);
export const blockUser = (userId: string) => put(`/me/blocked/${id(userId)}`);
export const unblockUser = (userId: string) => del(`/me/blocked/${id(userId)}`);
export const addFavorite = (badingId: string) => put(`/me/favorites/${id(badingId)}`);
export const removeFavorite = (badingId: string) => del(`/me/favorites/${id(badingId)}`);
export const requestBadge = (form: FormData) => request('/me/badge-request', { method: 'POST', body: form });
export const requestDeletion = (reason: string | null) => post('/me/deletion', { reason });
export const cancelDeletion = () => del('/me/deletion');

// Notifications
/** Jeton Expo de ce téléphone : le serveur y envoie les notifications push (rires, commentaires, réponses…). */
export const registerPushToken = (expoToken: string) => post('/me/push', { expoToken });
export const unregisterPushToken = (expoToken: string) => request('/me/push', { method: 'DELETE', body: { endpoint: expoToken } });
export const getNotifications = () => get('/notifications');
export const markNotificationsRead = () => post('/notifications/read');
