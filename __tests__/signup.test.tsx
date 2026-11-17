// Inscription avec le backend : e-mail → code reçu par e-mail → pseudo (POST /register avec emailToken).
import { act, renderHook } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import * as notifications from '@/lib/notifications';

const registerForPush = notifications.registerForPush as jest.Mock;

// Ce fichier parle au « serveur » (fetch simulé) : USE_BACKEND est lu au chargement du store.
process.env.EXPO_PUBLIC_USE_BACKEND = 'true';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const mod: typeof import('@/data/store') = require('@/data/store');
const wrapper = ({ children }: { children: ReactNode }) => <mod.StoreProvider>{children}</mod.StoreProvider>;

type Call = { path: string; method: string; body: any };

/** Store branché sur un faux serveur ; `routes` répond selon « MÉTHODE /chemin ». */
async function backendStore(routes: Record<string, (body: any) => [number, unknown]>) {
  const calls: Call[] = [];
  (globalThis as any).fetch = jest.fn(async (url: string, init: any = {}) => {
    const path = url.replace(/^https?:\/\/[^/]+\/api/, '').split('?')[0];
    const method = init.method ?? 'GET';
    const body = init.body ? JSON.parse(init.body) : undefined;
    calls.push({ path, method, body });
    const [status, data] = routes[`${method} ${path}`]?.(body) ?? [404, { success: false, code: 'not_found' }];
    return { ok: status < 400, status, text: async () => JSON.stringify(data) };
  });
  const h = await renderHook(() => mod.useStore(), { wrapper });
  return { h, calls };
}

const ok = (data: unknown): [number, unknown] => [200, { success: true, data }];
const fail = (status: number, code: string): [number, unknown] => [status, { success: false, code, message: code }];
const USER = { id: 'srv-1', pseudo: 'AwaLaGo225', email: 'awa@test.ci', verified: false };

afterEach(() => { (globalThis as any).fetch = undefined; });

describe('Inscription avec code de vérification', () => {
  it('envoie le code, le vérifie, puis crée le compte avec la preuve', async () => {
    const { h, calls } = await backendStore({
      'POST /register/code': () => ok({ challenge: 'ch-1', expiresIn: 600 }),
      'POST /register/verify': (b) => (b.code === '123456' ? ok({ emailToken: 'proof-1' }) : fail(400, 'invalid_code')),
      'POST /register': () => [201, { success: true, data: { user: USER, token: 'tok' } }],
    });

    await act(async () => { expect(await h.result.current.startSignup('awa@test.ci', 'motdepasse1', { firstname: 'Awa', lastname: 'Koné' })).toBe('ok'); });
    expect(h.result.current.signupEmail).toBe('awa@test.ci');
    expect(h.result.current.signupEmailVerified).toBe(false);

    await act(async () => { expect(await h.result.current.verifySignupCode('000000')).toBe('invalid'); });
    await act(async () => { expect(await h.result.current.verifySignupCode('123 456')).toBe('ok'); });
    expect(h.result.current.signupEmailVerified).toBe(true);
    expect(calls.find((c) => c.path === '/register/verify' && c.body.code === '123456')?.body).toEqual({ email: 'awa@test.ci', code: '123456', challenge: 'ch-1' });

    await act(async () => h.result.current.register('AwaLaGo225'));
    expect(calls.find((c) => c.path === '/register')?.body).toMatchObject({ email: 'awa@test.ci', username: 'AwaLaGo225', emailToken: 'proof-1', firstname: 'Awa' });
    expect(h.result.current.session?.user.pseudo).toBe('AwaLaGo225');
  });

  it('adresse déjà utilisée : « taken » dès la première étape', async () => {
    const { h } = await backendStore({ 'POST /register/code': () => fail(409, 'email_taken') });
    await act(async () => { expect(await h.result.current.startSignup('awa@test.ci', 'motdepasse1')).toBe('taken'); });
    expect(h.result.current.signupEmail).toBeNull();
  });

  it('code expiré, puis nouveau code : le nouveau défi est utilisé', async () => {
    let n = 0;
    const { h, calls } = await backendStore({
      'POST /register/code': () => ok({ challenge: `ch-${++n}`, expiresIn: 600 }),
      'POST /register/verify': (b) => (b.challenge === 'ch-2' ? ok({ emailToken: 'proof' }) : fail(400, 'code_expired')),
    });
    await act(async () => { await h.result.current.startSignup('awa@test.ci', 'motdepasse1'); });
    await act(async () => { expect(await h.result.current.verifySignupCode('111111')).toBe('expired'); });
    await act(async () => h.result.current.resendSignupCode());
    await act(async () => { expect(await h.result.current.verifySignupCode('222222')).toBe('ok'); });
    expect(calls.filter((c) => c.path === '/register/code')).toHaveLength(2);
  });

  it('sans code confirmé, le compte n’est pas demandé au serveur', async () => {
    const { h, calls } = await backendStore({ 'POST /register/code': () => ok({ challenge: 'ch', expiresIn: 600 }) });
    await act(async () => { await h.result.current.startSignup('awa@test.ci', 'motdepasse1'); });
    await act(async () => { await expect(h.result.current.register('AwaLaGo225')).rejects.toMatchObject({ code: 'email_unverified' }); });
    expect(calls.some((c) => c.path === '/register')).toBe(false);
  });

  it('preuve expirée côté serveur : nouveau code envoyé, retour à l’écran du code', async () => {
    let n = 0;
    const { h, calls } = await backendStore({
      'POST /register/code': () => ok({ challenge: `ch-${++n}`, expiresIn: 600 }),
      'POST /register/verify': () => ok({ emailToken: 'old-proof' }),
      'POST /register': () => fail(400, 'email_unverified'),
    });
    await act(async () => { await h.result.current.startSignup('awa@test.ci', 'motdepasse1'); });
    await act(async () => { await h.result.current.verifySignupCode('123456'); });
    await act(async () => { await expect(h.result.current.register('AwaLaGo225')).rejects.toMatchObject({ code: 'email_unverified' }); });
    expect(h.result.current.signupEmailVerified).toBe(false);
    expect(calls.filter((c) => c.path === '/register/code')).toHaveLength(2);
  });
});

describe('Notifications push (jeton Expo)', () => {
  it('le jeton du téléphone est donné au serveur, puis retiré à la déconnexion', async () => {
    registerForPush.mockResolvedValue({ status: 'granted', token: 'ExponentPushToken[abcdefghij123]' });
    const { h, calls } = await backendStore({
      'POST /register/code': () => ok({ challenge: 'ch', expiresIn: 600 }),
      'POST /register/verify': () => ok({ emailToken: 'proof' }),
      'POST /register': () => [201, { success: true, data: { user: USER, token: 'tok' } }],
      'POST /me/push': () => [204, ''],
      'DELETE /me/push': () => [204, ''],
      'POST /logout': () => [204, ''],
    });
    await act(async () => { await h.result.current.startSignup('awa@test.ci', 'motdepasse1'); });
    await act(async () => { await h.result.current.verifySignupCode('123456'); });
    await act(async () => h.result.current.register('AwaLaGo225'));

    await act(async () => { expect(await h.result.current.enablePush()).toBe('granted'); });
    expect(calls.find((c) => c.method === 'POST' && c.path === '/me/push')?.body).toEqual({ expoToken: 'ExponentPushToken[abcdefghij123]' });

    await act(async () => h.result.current.signOut());
    expect(calls.find((c) => c.method === 'DELETE' && c.path === '/me/push')?.body).toEqual({ endpoint: 'ExponentPushToken[abcdefghij123]' });
    const order = calls.map((c) => `${c.method} ${c.path}`);
    expect(order.indexOf('DELETE /me/push')).toBeLessThan(order.indexOf('POST /logout'));
  });

  it('sans jeton (Expo Go, pas de projet EAS) : rien n’est envoyé', async () => {
    registerForPush.mockResolvedValue({ status: 'granted', token: null });
    const { h, calls } = await backendStore({});
    await act(async () => { expect(await h.result.current.enablePush()).toBe('granted'); });
    expect(calls).toHaveLength(0);
  });
});
