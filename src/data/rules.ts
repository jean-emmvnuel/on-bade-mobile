// Règles métier de l'app : valeurs par défaut identiques au serveur (lib/rules.ts), remplacées au démarrage par celles
// que l'équipe règle dans le back-office (src/lib/platform.ts). Longueurs, mentions, vocaux, mots interdits, mot de passe.

export const RULES = {
  minLength: 10,
  maxLength: 1000,
  /** Légende d'un bading avec image : courte, pour garder un fil uniforme. */
  captionMax: 280,
  opinionMax: 280,
  commentMax: 500,
  maxMentions: 5,
  /** Durée maximale d'une note vocale en commentaire (secondes). */
  voiceMaxSeconds: 60,
  /** Certification : actif (un bading signé ces 30 derniers jours) + 1 000 rires reçus sur ses badings signés. */
  badge: { activeDays: 30, minLaughs: 1000 },
};

/**
 * Règles chiffrées réglées par l'équipe dans le back-office (GET /api/platform) : remplacent les valeurs par défaut
 * ci-dessus, qui restent le repli hors ligne. Une valeur absente ou invalide est ignorée.
 */
export function applyRules(rules: unknown) {
  if (!rules || typeof rules !== 'object') return;
  const r = rules as Record<string, unknown>;
  const num = (v: unknown) => (Number.isFinite(Number(v)) && Number(v) >= 0 ? Number(v) : null);
  for (const k of ['minLength', 'maxLength', 'captionMax', 'opinionMax', 'commentMax', 'maxMentions', 'voiceMaxSeconds'] as const) {
    const v = num(r[k]);
    if (v !== null) RULES[k] = v;
  }
  const active = num(r.badgeActiveDays), laughs = num(r.badgeMinLaughs);
  if (active !== null) RULES.badge.activeDays = active;
  if (laughs !== null) RULES.badge.minLaughs = laughs;
}

/** Minimal banned-word filter (RG4). The real list lives server-side. */
export const BANNED = ['connard', 'pute', 'nègre', 'tuer'];

export type PublishError = 'too_short' | 'too_long' | 'caption_too_long' | 'blocked_word' | 'too_many_mentions';

/** F8 : très grande collection de stickers (1 000 maximum). */
export const MAX_MY_STICKERS = 1000;

/** F0 : mot de passe d'au moins 8 caractères, avec des lettres et des chiffres. */
export function passwordProblem(pw: string): string | null {
  if (pw.length < 8) return 'Au moins 8 caractères.';
  if (!/[A-Za-z]/.test(pw) || !/\d/.test(pw)) return 'Mélange des lettres et des chiffres.';
  return null;
}

/** F7 RG5: a new request is allowed 30 days after a refusal. */
export const BADGE_RETRY_DAYS = 30;

/** Account deletion is processed 30 days after the request (cancellable until then). */
export const DELETION_DELAY_DAYS = 30;

export function countMentions(text: string) {
  return (text.match(/@[\w.]+/g) ?? []).length;
}

/** Pas de limite de badings par jour. */
export function validateBading(text: string, hasImage = false): PublishError | null {
  const t = text.trim();
  // F1 RG1 : avec une image, le texte devient une légende facultative.
  if (!hasImage && t.length < RULES.minLength) return 'too_short';
  if (t.length > (hasImage ? RULES.captionMax : RULES.maxLength)) return hasImage ? 'caption_too_long' : 'too_long';
  if (countMentions(t) > RULES.maxMentions) return 'too_many_mentions';
  const lower = t.toLowerCase();
  if (BANNED.some((w) => lower.includes(w))) return 'blocked_word';
  return null;
}
