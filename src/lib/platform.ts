// Réglages publics de la plateforme (GET /api/platform), lus une fois au démarrage de l'app :
// règles chiffrées réglées par l'équipe (longueurs, mentions, durée des vocaux…). Hors ligne, les valeurs par défaut restent.
import { applyRules } from '@/data/rules';
import { getPlatform, USE_BACKEND } from '@/lib/api';

let loading: Promise<void> | null = null;

/** Charge les règles du serveur (une seule fois ; les appels suivants attendent le même chargement). */
export function syncRules(): Promise<void> {
  if (!USE_BACKEND) return Promise.resolve();
  loading ??= getPlatform()
    .then((r: { rules?: unknown }) => applyRules(r?.rules))
    .catch(() => { loading = null; }); // réessayé au prochain appel
  return loading;
}
