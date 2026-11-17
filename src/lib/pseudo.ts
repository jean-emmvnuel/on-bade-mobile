// Règles de format du pseudo, partagées entre l'inscription et les paramètres (mêmes règles que le site).
// La disponibilité, elle, est demandée au serveur.

export const PSEUDO_MIN = 3;
export const PSEUDO_MAX = 20;
export const PSEUDO_PATTERN = /^[A-Za-z0-9_.]{3,20}$/;

/** Rappel des règles, affiché tant que le pseudo est vide ou valide. */
export const PSEUDO_RULES = `${PSEUDO_MIN} à ${PSEUDO_MAX} caractères. Autorisés : lettres sans accent (a-z, A-Z), chiffres (0-9), tiret bas « _ » et point « . ». Pas d'espace, d'accent ni d'autre symbole.`;

const ALLOWED_CHAR = /[A-Za-z0-9_.]/;

/** Décrit un caractère refusé de façon lisible (l'espace ne se voit pas). */
const describe = (char: string) => (/\s/.test(char) ? 'espace' : `« ${char} »`);

/** Message d'erreur précis pour un pseudo mal formé, ou null s'il est valide. */
export function pseudoFormatError(pseudo: string): string | null {
  const refused = [...new Set([...pseudo].filter((c) => !ALLOWED_CHAR.test(c)))];
  if (refused.length) {
    const list = refused.slice(0, 5).map(describe).join(', ');
    const plural = refused.length > 1;
    return `Caractère${plural ? 's' : ''} non autorisé${plural ? 's' : ''} : ${list}. Utilise seulement des lettres sans accent, des chiffres, « _ » ou « . ».`;
  }
  if (pseudo.length < PSEUDO_MIN) return `Trop court : ${PSEUDO_MIN} caractères minimum (encore ${PSEUDO_MIN - pseudo.length}).`;
  if (pseudo.length > PSEUDO_MAX) return `Trop long : ${PSEUDO_MAX} caractères maximum.`;
  return null;
}
