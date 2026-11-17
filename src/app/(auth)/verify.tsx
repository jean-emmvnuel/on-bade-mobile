import { Redirect, router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { AuthScaffold } from '@/components/AuthScaffold';
import { Button } from '@/components/Button';
import { Field } from '@/components/Field';
import { success } from '@/components/haptics';
import { useToast } from '@/components/Toast';
import { useStore } from '@/data/store';
import { errorMessage } from '@/lib/api';
import { colors } from '@/theme/tokens';

/** Délai avant de pouvoir redemander un code (le serveur en accepte 5 par heure et par adresse). */
const RESEND_SECONDS = 60;

/** Inscription, étape 2 : le code à 6 chiffres reçu par e-mail confirme l'adresse. */
export default function Verify() {
  const { signupEmail, signupEmailVerified, verifySignupCode, resendSignupCode } = useStore();
  const toast = useToast();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [wait, setWait] = useState(RESEND_SECONDS);
  const sending = useRef(false);

  useEffect(() => {
    if (wait <= 0) return;
    const t = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  const check = async (value = code) => {
    if (value.length !== 6 || sending.current) return;
    sending.current = true;
    setLoading(true);
    setError(null);
    try {
      const res = await verifySignupCode(value);
      if (res === 'ok') {
        success();
        router.replace('/(auth)/pseudo');
      } else if (res === 'expired') {
        setError('Ce code a expiré. Demande un nouveau code.');
        setWait(0);
      } else {
        setError('Code incorrect. Vérifie le dernier e-mail reçu.');
      }
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      sending.current = false;
      setLoading(false);
    }
  };

  const resend = async () => {
    if (wait > 0) return;
    setError(null);
    try {
      await resendSignupCode();
      setCode('');
      setWait(RESEND_SECONDS);
      toast(`Nouveau code envoyé à ${signupEmail}.`);
    } catch (e) {
      setError(errorMessage(e));
    }
  };

  // Arrivée directe sans étape 1 : on recommence l'inscription. Adresse déjà confirmée : étape suivante.
  if (!signupEmail) return <Redirect href="/(auth)/signup" />;
  if (signupEmailVerified && !loading) return <Redirect href="/(auth)/pseudo" />;

  return (
    <AuthScaffold
      step={2}
      total={3}
      title="Vérifie ton e-mail"
      subtitle={`On a envoyé un code à 6 chiffres à ${signupEmail}. Il est valable 10 minutes. Pense à regarder dans les spams. Si cette adresse a déjà un compte, tu reçois à la place un e-mail pour te connecter.`}
      footer={<Button label="Valider" onPress={() => check()} loading={loading} disabled={code.length !== 6} />}>
      <Field
        label="Code reçu par e-mail"
        keyboardType="number-pad"
        autoComplete="one-time-code"
        textContentType="oneTimeCode"
        autoFocus
        placeholder="123456"
        maxLength={6}
        value={code}
        onChangeText={(t) => {
          const digits = t.replace(/\D/g, '').slice(0, 6);
          setCode(digits);
          setError(null);
          if (digits.length === 6) void check(digits); // validation dès le 6ᵉ chiffre
        }}
        error={error}
        style={{ letterSpacing: 6, fontSize: 22 }}
      />
      <View style={{ gap: 4 }}>
        <Pressable onPress={resend} disabled={wait > 0} accessibilityRole="button" accessibilityState={{ disabled: wait > 0 }} style={{ alignSelf: 'flex-start', minHeight: 44, justifyContent: 'center' }}>
          <AppText variant="label" color={wait > 0 ? colors.text3 : colors.brandInk}>
            {wait > 0 ? `Renvoyer le code dans ${wait} s` : 'Renvoyer le code'}
          </AppText>
        </Pressable>
        <Pressable onPress={() => router.replace('/(auth)/signup')} accessibilityRole="button" style={{ alignSelf: 'flex-start', minHeight: 44, justifyContent: 'center' }}>
          <AppText variant="label" color={colors.text2}>Changer d’adresse e-mail</AppText>
        </Pressable>
      </View>
    </AuthScaffold>
  );
}
