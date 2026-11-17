import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { AuthScaffold } from '@/components/AuthScaffold';
import { Button } from '@/components/Button';
import { Field } from '@/components/Field';
import { Eye, EyeOff } from '@/components/icons';
import { useToast } from '@/components/Toast';
import { passwordProblem, useStore } from '@/data/store';
import { errorMessage } from '@/lib/api';
import { colors } from '@/theme/tokens';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Bouton œil pour afficher / masquer un mot de passe. */
function Reveal({ shown, onToggle }: { shown: boolean; onToggle: () => void }) {
  const Icon = shown ? EyeOff : Eye;
  return (
    <Pressable
      onPress={onToggle}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityLabel={shown ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
      style={{ width: 36, height: 36, alignItems: 'center', justifyContent: 'center' }}>
      <Icon size={22} color={colors.text2} />
    </Pressable>
  );
}

type Errors = { firstname?: string; lastname?: string; email?: string; password?: string; confirm?: string; form?: string };

export default function Signup() {
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  const login = mode === 'login';
  const { logIn, startSignup, requestPasswordReset } = useStore();
  const toast = useToast();

  const [firstname, setFirstname] = useState('');
  const [lastname, setLastname] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [shown, setShown] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [loading, setLoading] = useState(false);

  const edit = (set: (v: string) => void) => (v: string) => { set(v); setErrors({}); };
  const ready = !!email && !!password && (login || (!!confirm && !!firstname.trim() && !!lastname.trim()));

  const submit = async () => {
    if (!ready || loading) return;
    const mail = email.trim().toLowerCase();
    const next: Errors = {};
    if (!EMAIL.test(mail)) next.email = "Cette adresse e-mail n'a pas l'air complète.";
    if (!login) {
      if (!firstname.trim()) next.firstname = 'Indique ton prénom.';
      if (!lastname.trim()) next.lastname = 'Indique ton nom.';
      const pb = passwordProblem(password);
      if (pb) next.password = pb;
      else if (password !== confirm) next.confirm = 'Les deux mots de passe ne sont pas identiques.';
    }
    if (Object.keys(next).length) return setErrors(next);

    setLoading(true);
    try {
      if (login) {
        const res = await logIn(mail, password);
        if (res === 'unknown') setErrors({ form: "Aucun compte n'utilise cet e-mail. Inscris-toi d'abord." });
        else if (res === 'wrong_password') setErrors({ password: 'Mot de passe incorrect.' });
        // 'ok' : le layout (auth) redirige vers le fil.
        return;
      }
      const res = await startSignup(mail, password, { firstname: firstname.trim(), lastname: lastname.trim() });
      if (res === 'taken') return setErrors({ email: 'Un compte existe déjà avec cet e-mail. Connecte-toi plutôt.' });
      router.push('/(auth)/verify');
    } catch (e) {
      setErrors({ form: errorMessage(e) });
    } finally {
      setLoading(false);
    }
  };

  const forgot = async () => {
    const mail = email.trim().toLowerCase();
    if (!EMAIL.test(mail)) return setErrors({ email: "Entre d'abord ton adresse e-mail, on t'enverra un lien." });
    try {
      await requestPasswordReset(mail);
      toast(`Si un compte existe pour ${mail}, un lien pour changer le mot de passe vient d'être envoyé.`);
    } catch (e) {
      toast(errorMessage(e));
    }
  };

  const reveal = <Reveal shown={shown} onToggle={() => setShown((s) => !s)} />;

  return (
    <AuthScaffold
      step={1}
      total={login ? 1 : 3}
      title={login ? 'Content de te revoir' : 'Crée ton compte'}
      subtitle={login ? 'Connecte-toi avec ton adresse e-mail et ton mot de passe.' : 'Ton e-mail reste privé : personne ne le voit, même quand tu publies en anonyme.'}
      footer={
        <View style={{ gap: 12 }}>
          <Button label={login ? 'Se connecter' : 'Continuer'} onPress={submit} loading={loading} disabled={!ready} />
          <Pressable
            onPress={() => router.replace(login ? '/(auth)/signup' : '/(auth)/signup?mode=login')}
            accessibilityRole="link"
            style={{ minHeight: 44, alignItems: 'center', justifyContent: 'center' }}>
            <AppText variant="body" color={colors.text2}>
              {login ? 'Pas encore de compte ? ' : 'Déjà un compte ? '}
              <AppText variant="label" color={colors.brandInk}>{login ? "S'inscrire" : 'Se connecter'}</AppText>
            </AppText>
          </Pressable>
        </View>
      }>
      {!login && (
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <View style={{ flex: 1 }}>
            <Field label="Prénom" autoCapitalize="words" autoComplete="given-name" textContentType="givenName" placeholder="Awa" value={firstname} onChangeText={edit(setFirstname)} error={errors.firstname} maxLength={50} />
          </View>
          <View style={{ flex: 1 }}>
            <Field label="Nom" autoCapitalize="words" autoComplete="family-name" textContentType="familyName" placeholder="Koné" value={lastname} onChangeText={edit(setLastname)} error={errors.lastname} maxLength={50} />
          </View>
        </View>
      )}
      <Field
        label="Adresse e-mail"
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        textContentType={login ? 'username' : 'emailAddress'}
        placeholder="toi@exemple.com"
        value={email}
        onChangeText={edit(setEmail)}
        error={errors.email}
        returnKeyType="next"
      />
      <Field
        label="Mot de passe"
        secureTextEntry={!shown}
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete={login ? 'current-password' : 'new-password'}
        textContentType={login ? 'password' : 'newPassword'}
        placeholder="••••••••"
        value={password}
        onChangeText={edit(setPassword)}
        error={errors.password}
        hint={login ? undefined : 'Au moins 8 caractères, avec des lettres et des chiffres.'}
        maxLength={72}
        right={reveal}
        onSubmitEditing={login ? submit : undefined}
      />
      {login ? (
        <Pressable onPress={forgot} accessibilityRole="button" style={{ alignSelf: 'flex-start', minHeight: 44, justifyContent: 'center' }}>
          <AppText variant="label" color={colors.brandInk}>Mot de passe oublié ?</AppText>
        </Pressable>
      ) : (
        <Field
          label="Confirme le mot de passe"
          secureTextEntry={!shown}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="new-password"
          textContentType="newPassword"
          placeholder="••••••••"
          value={confirm}
          onChangeText={edit(setConfirm)}
          error={errors.confirm}
          maxLength={72}
          onSubmitEditing={submit}
        />
      )}
      {errors.form && <AppText variant="small" color={colors.danger} accessibilityLiveRegion="polite">{errors.form}</AppText>}
    </AuthScaffold>
  );
}
