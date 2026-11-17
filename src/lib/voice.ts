// Notes vocales de l'app : enregistrement (expo-audio), forme d'onde et envoi (data URL base64), comme sur le site.
// Format : AAC dans un .m4a (iPhone et Android), mono, 64 kbit/s. Sur le web : WebM/Opus.
// Son audible : contrôle automatique du gain et réduction de bruit du téléphone (mode « voix »), débit confortable.
// Onde : niveaux mesurés pendant l'enregistrement (en dB), regroupés en 48 barres, même échelle que le site.
import { Platform } from 'react-native';
import { File } from 'expo-file-system';
import { RecordingPresets, requestRecordingPermissionsAsync, setAudioModeAsync, type RecordingOptions } from 'expo-audio';

import { RULES } from '@/data/rules';
import { syncRules } from '@/lib/platform';
import type { VoiceRecording } from '@/data/types';

export const MIN_VOICE_MS = 800;
export const BARS = 48;
const FLOOR_DB = -50;
const CEIL_DB = -6;
const MIN_BAR = 6;

/** Options d'enregistrement : voix mono, 64 kbit/s, niveau mesuré (pour l'onde). */
export const VOICE_OPTIONS: RecordingOptions = {
  ...RecordingPresets.HIGH_QUALITY,
  isMeteringEnabled: true,
  numberOfChannels: 1,
  sampleRate: 44_100,
  bitRate: 64_000,
  web: { mimeType: 'audio/webm', bitsPerSecond: 64_000 },
};

/** Niveau en dB (metering, de -160 à 0) → hauteur de barre (6 à 100). */
export function barFromDb(db: number | undefined) {
  if (db === undefined || !Number.isFinite(db)) return MIN_BAR;
  const t = (db - FLOOR_DB) / (CEIL_DB - FLOOR_DB);
  return Math.round(MIN_BAR + Math.min(1, Math.max(0, t)) * (100 - MIN_BAR));
}

/** Regroupe les niveaux mesurés (dB) en BARS barres : moyenne d'énergie de chaque tranche. */
export function barsFromDb(levels: number[]) {
  if (!levels.length) return Array(BARS).fill(MIN_BAR);
  return Array.from({ length: BARS }, (_, i) => {
    const from = Math.floor((i * levels.length) / BARS);
    const to = Math.max(from + 1, Math.floor(((i + 1) * levels.length) / BARS));
    const slice = levels.slice(from, to).map((db) => 10 ** (Math.max(db, -100) / 10));
    const mean = slice.reduce((a, v) => a + v, 0) / slice.length;
    return barFromDb(10 * Math.log10(mean));
  });
}

/** Demande l'accès au micro et prépare la session audio (lecture même en mode silencieux). */
export async function prepareMic(): Promise<'ok' | 'denied'> {
  const perm = await requestRecordingPermissionsAsync();
  if (!perm.granted) return 'denied';
  await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
  return 'ok';
}

/** Après l'enregistrement : la session repasse en lecture (son par le haut-parleur, pas l'écouteur). */
export async function releaseMic() {
  await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true }).catch(() => {});
}

/** Lit le fichier enregistré et le prépare pour l'envoi. */
export async function toRecording(uri: string, durationMs: number, levels: number[]): Promise<VoiceRecording> {
  let dataUrl: string;
  if (Platform.OS === 'web') {
    const blob = await (await fetch(uri)).blob();
    dataUrl = await new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result));
      r.onerror = () => reject(new Error('read'));
      r.readAsDataURL(blob);
    });
  } else {
    dataUrl = `data:audio/mp4;base64,${await new File(uri).base64()}`;
  }
  return { dataUrl, durationMs, waveform: barsFromDb(levels) };
}

// ─── Durée maximale (réglée par l'équipe dans le back-office, voir src/lib/platform.ts) ───

/** Durée maximale d'un vocal en secondes, une fois les règles du serveur chargées (60 par défaut). */
export async function voiceMaxSeconds(): Promise<number> {
  await syncRules();
  return RULES.voiceMaxSeconds;
}
export const currentVoiceMax = () => RULES.voiceMaxSeconds;

/** « 0:07 », « 1:00 ». */
export const clock = (ms: number) => {
  const s = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

// ─── Lecture : un seul vocal à la fois ───
let stopCurrent: (() => void) | null = null;
/** À appeler quand un lecteur démarre : arrête celui qui jouait. */
export function claimPlayback(stop: () => void) {
  if (stopCurrent && stopCurrent !== stop) stopCurrent();
  stopCurrent = stop;
}
