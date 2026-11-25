// Fin de la saison des flammes : minuit (heure d'Abidjan = UTC) le soir de son dernier jour (`endsOn`).
export const DAY_MS = 86_400_000;

/** Instant de fin ; sans date (mode démo), déduit du jour de la saison. */
export function seasonEnd(season: { endsOn?: string; day: number; length: number }, now = Date.now()) {
  if (season.endsOn) return Date.parse(`${season.endsOn}T00:00:00Z`) + DAY_MS;
  return Math.floor(now / DAY_MS) * DAY_MS + (season.length - season.day + 1) * DAY_MS;
}

/** Temps restant découpé (jamais négatif). */
export function timeLeft(end: number, now = Date.now()) {
  const total = Math.max(0, end - now);
  const s = Math.floor(total / 1000);
  return { total, days: Math.floor(s / 86400), hours: Math.floor((s % 86400) / 3600), minutes: Math.floor((s % 3600) / 60), seconds: s % 60 };
}
