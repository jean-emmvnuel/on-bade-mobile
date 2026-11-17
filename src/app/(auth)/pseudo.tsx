import { Redirect, router } from 'expo-router';
import { Check, CircleCheck } from '@/components/icons';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { AuthScaffold } from '@/components/AuthScaffold';
import { Button } from '@/components/Button';
import { Field } from '@/components/Field';
import { success } from '@/components/haptics';
import { useStore } from '@/data/store';
import { errorMessage, isApiError } from '@/lib/api';
import { PSEUDO_RULES, pseudoFormatError } from '@/lib/pseudo';
import { colors, radius, space } from '@/theme/tokens';

const CHARTE = [
  'On rit des situations, pas des personnes.',
  "Pas de moqueries sur l'ethnie, la religion, le handicap, le genre ou l'orientation.",
  'Pas de vrais noms ni de photos de personnes sans leur accord.',
  'Pas de harcèlement, de menaces, d’insultes ni d’arnaques.',
];

export default function Pseudo() {
  const { register, hasPendingSignup, signupEmailVerified, isPseudoAvailable } = useStore();
  const [pseudo, setPseudo] = useState('');
  // unchecked : le serveur n'a pas pu répondre, la disponibilité sera vérifiée à la création du compte.
  const [status, setStatus] = useState<'idle' | 'checking' | 'free' | 'taken' | 'invalid' | 'unchecked'>('idle');
  const [accepted, setAccepted] = useState(false);
  const [sending, setSending] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    setFormError(null);
    if (!pseudo) return setStatus('idle');
    if (pseudoFormatError(pseudo)) return setStatus('invalid');
    setStatus('checking');
    // Disponibilité demandée au serveur après une courte pause dans la frappe ; seule la dernière réponse compte.
    let current = true;
    const t = setTimeout(async () => {
      try {
        const free = await isPseudoAvailable(pseudo);
        if (current) setStatus(free === null ? 'unchecked' : free ? 'free' : 'taken');
      } catch {
        if (current) setStatus('unchecked');
      }
    }, 450);
    return () => { current = false; clearTimeout(t); };
  }, [pseudo, isPseudoAvailable]);

  const error = formError ?? (status === 'invalid' ? pseudoFormatError(pseudo) : status === 'taken' ? 'Ce pseudo est déjà pris. Essaie une variante.' : null);
  const usable = status === 'free' || status === 'unchecked';

  const enter = async () => {
    setSending(true);
    try {
      await register(pseudo);
      success();
    } catch (e) {
      // Pseudo pris entre la vérification et l'envoi, e-mail déjà utilisé, souci réseau : on reste sur l'écran.
      if (isApiError(e) && e.code === 'taken') { setStatus('taken'); return; }
      if (isApiError(e) && e.code === 'account_exists') { setFormError('Un compte existe déjà avec cet e-mail. Reviens en arrière pour te connecter.'); return; }
      // Code confirmé il y a plus d'une heure : le store a oublié la preuve, il faut un nouveau code.
      if (isApiError(e) && e.code === 'email_unverified') { router.replace('/(auth)/verify'); return; }
      if (isApiError(e) && e.code === 'invalid_signup') { setFormError('Certaines informations ne sont pas acceptées. Reviens à l’étape précédente pour les vérifier.'); return; }
      setFormError(errorMessage(e));
    } finally {
      setSending(false);
    }
  };

  // Arrivée directe sans étape 1 (ex. retour après fermeture) : on recommence l'inscription.
  if (!hasPendingSignup) return <Redirect href="/(auth)/signup" />;
  if (!signupEmailVerified) return <Redirect href="/(auth)/verify" />;

  return (
    <AuthScaffold
      step={3}
      total={3}
      title="Choisis ton nom de Badeur"
      subtitle="C'est ton pseudo public. Tu pourras toujours publier en anonyme."
      footer={
        <Button label="Entrer dans On Bade" disabled={!usable || !accepted} loading={sending} onPress={enter} />
      }>
      <Field
        label="Pseudo"
        prefix="@"
        autoCapitalize="none"
        autoCorrect={false}
        placeholder="TonPseudo"
        value={pseudo}
        onChangeText={(t) => setPseudo(t.trim())}
        maxLength={20}
        error={error}
        hint={status === 'free' ? 'Disponible' : status === 'unchecked' ? 'Format valide. Sa disponibilité sera vérifiée à la création du compte.' : `Visible sur ton profil et tes badings signés. ${PSEUDO_RULES}`}
        right={status === 'checking' ? <ActivityIndicator color={colors.text2} /> : status === 'free' ? <CircleCheck size={22} color={colors.success} accessibilityLabel="Disponible" /> : null}
      />
      <View style={{ backgroundColor: colors.surface, borderRadius: radius.lg, padding: space.lg, gap: space.md }}>
        <AppText variant="title" style={{ fontSize: 24, lineHeight: 28 }}>Ici, la seule règle, c'est qu'il n'y a pas de règle.</AppText>
        <AppText variant="body" color={colors.text2}>Enfin… presque 😅 Pour que tout le monde rigole tranquille, la charte du Badeur tient en quatre lignes :</AppText>
        {CHARTE.map((c) => (
          <View key={c} style={{ flexDirection: 'row', gap: 10 }}>
            <AppText variant="body" color={colors.brandInk}>·</AppText>
            <AppText variant="body" color={colors.text2} style={{ flex: 1 }}>{c}</AppText>
          </View>
        ))}
        <Pressable
          onPress={() => setAccepted((a) => !a)}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: accepted }}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 48, marginTop: 4 }}>
          <View style={{ width: 24, height: 24, borderRadius: 7, borderWidth: 2, borderColor: accepted ? colors.brand : colors.text3, backgroundColor: accepted ? colors.brand : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
            {accepted && <Check size={16} color="#fff" strokeWidth={3} />}
          </View>
          <AppText variant="label" style={{ flex: 1 }}>
            J'ai 18 ans ou plus, j'accepte la charte et la{' '}
            <AppText variant="label" color={colors.brandInk} onPress={() => router.push('/privacy')} style={{ textDecorationLine: 'underline' }}>politique de confidentialité</AppText>
          </AppText>
        </Pressable>
      </View>
    </AuthScaffold>
  );
}
