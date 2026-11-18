import * as ImagePicker from 'expo-image-picker';

export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];

export type PickedImage = { uri: string; width: number; height: number };

/**
 * Ouvre la galerie (F1 RG2) : une image, 10 Mo max, JPG/PNG/WebP (HEIC accepté sur iPhone,
 * converti en JPEG au recadrage). Le recadrage est fait ensuite par `ImageCropper`.
 */
export async function pickImage(): Promise<{ ok: true; image: PickedImage } | { ok: false; error: string | null }> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) return { ok: false, error: 'Autorise l’accès à tes photos dans les réglages pour ajouter une image.' };
  const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1, allowsMultipleSelection: false, exif: false });
  if (res.canceled || !res.assets?.[0]) return { ok: false, error: null };
  const a = res.assets[0];
  if (a.mimeType && !ACCEPTED.includes(a.mimeType)) return { ok: false, error: 'Format non accepté : JPG, PNG ou WebP.' };
  if (a.fileSize && a.fileSize > MAX_IMAGE_BYTES) return { ok: false, error: 'Image trop lourde : 10 Mo maximum.' };
  return { ok: true, image: { uri: a.uri, width: a.width, height: a.height } };
}

/** Stickers : WebP, PNG ou GIF (stickers WhatsApp, GIF…) ; une photo JPEG/HEIC est acceptée et deviendra un PNG au recadrage. */
export const MAX_STICKER_BYTES = 1.5 * 1024 * 1024;
const STICKER_ACCEPTED = ['image/webp', 'image/png', 'image/gif', 'image/jpeg', 'image/heic', 'image/heif'];

/**
 * Galerie pour un sticker. GIF et WebP (souvent animés : stickers WhatsApp) sont envoyés tels quels, sans recadrage,
 * pour garder l'animation et la transparence (`asIs: true`, 1,5 Mo max.). Une image fixe (PNG, photo) sera recadrée.
 * Le fichier d'origine est demandé tel quel (sur iPhone, la galerie convertirait sinon un GIF en JPEG).
 */
export async function pickStickerImage(): Promise<{ ok: true; image: PickedImage; asIs: boolean } | { ok: false; error: string | null }> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) return { ok: false, error: 'Autorise l’accès à tes photos dans les réglages pour ajouter une image.' };
  const res = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'], quality: 1, allowsMultipleSelection: false, exif: false,
    preferredAssetRepresentationMode: ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Current,
  });
  if (res.canceled || !res.assets?.[0]) return { ok: false, error: null };
  const a = res.assets[0];
  const type = a.mimeType ?? '';
  if (type && !STICKER_ACCEPTED.includes(type)) return { ok: false, error: 'Format non accepté : WebP, PNG ou GIF.' };
  const asIs = type === 'image/gif' || type === 'image/webp' || /\.(gif|webp)$/i.test(a.fileName ?? a.uri);
  if (asIs && a.fileSize && a.fileSize > MAX_STICKER_BYTES) return { ok: false, error: 'Sticker trop lourd : 1,5 Mo maximum.' };
  if (!asIs && a.fileSize && a.fileSize > MAX_IMAGE_BYTES) return { ok: false, error: 'Image trop lourde : 10 Mo maximum.' };
  return { ok: true, image: { uri: a.uri, width: a.width, height: a.height }, asIs };
}
