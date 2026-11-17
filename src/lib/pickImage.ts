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
