import * as ImagePicker from 'expo-image-picker';

import { MAX_IMAGE_BYTES, pickImage } from '@/lib/pickImage';

jest.mock('expo-image-picker', () => ({ requestMediaLibraryPermissionsAsync: jest.fn(), launchImageLibraryAsync: jest.fn() }));
const perm = ImagePicker.requestMediaLibraryPermissionsAsync as jest.Mock, launch = ImagePicker.launchImageLibraryAsync as jest.Mock;
const asset = (o = {}) => ({ canceled: false, assets: [{ uri: 'file:///a.jpg', width: 1200, height: 1500, mimeType: 'image/jpeg', fileSize: 2_000_000, ...o }] });

beforeEach(() => { perm.mockResolvedValue({ granted: true }); });

describe('Choisir une image (F1 RG2)', () => {
  it('explique quoi faire si l’accès aux photos est refusé', async () => {
    perm.mockResolvedValue({ granted: false });
    const r = await pickImage();
    expect(r).toEqual({ ok: false, error: expect.stringMatching(/réglages/) });
    expect(launch).not.toHaveBeenCalled();
  });
  it('annuler ne montre aucune erreur', async () => {
    launch.mockResolvedValue({ canceled: true, assets: null });
    expect(await pickImage()).toEqual({ ok: false, error: null });
  });
  it('refuse les formats non acceptés et les images de plus de 10 Mo', async () => {
    launch.mockResolvedValue(asset({ mimeType: 'image/gif' }));
    expect(await pickImage()).toEqual({ ok: false, error: expect.stringMatching(/Format/) });
    launch.mockResolvedValue(asset({ fileSize: MAX_IMAGE_BYTES + 1 }));
    expect(await pickImage()).toEqual({ ok: false, error: expect.stringMatching(/10 Mo/) });
  });
  it('accepte une photo valide (HEIC d’iPhone compris) sans métadonnées EXIF', async () => {
    launch.mockResolvedValue(asset({ mimeType: 'image/heic' }));
    expect(await pickImage()).toEqual({ ok: true, image: { uri: 'file:///a.jpg', width: 1200, height: 1500 } });
    expect(launch).toHaveBeenLastCalledWith(expect.objectContaining({ exif: false, allowsMultipleSelection: false }));
  });
});
