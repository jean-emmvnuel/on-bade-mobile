import { router } from 'expo-router';
import { BadgeCheck, Bell, Check, ChevronRight, CircleX, Copy, IdCard, Lock, LogOut, Trash2, UserRoundPen, UserX } from '@/components/icons';
import * as ImagePicker from 'expo-image-picker';
import * as Linking from 'expo-linking';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Avatar } from '@/components/Avatar';
import { Field } from '@/components/Field';
import { Button } from '@/components/Button';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Sheet } from '@/components/Sheet';
import { useToast } from '@/components/Toast';
import { BADGE_RETRY_DAYS, compact, DELETION_DELAY_DAYS, RULES, useStore } from '@/data/store';
import { liveActivitiesAvailable, startBadingActivity } from '@/lib/liveActivity';
import { errorMessage, isApiError } from '@/lib/api';
import { exportMyData } from '@/lib/myDataPdf';
import { PSEUDO_RULES, pseudoFormatError } from '@/lib/pseudo';
import { getPushStatus, notifyLocal, type PushStatus } from '@/lib/notifications';
import { LogoMark } from '@/components/Logo';
import type { MentionPolicy } from '@/data/types';
import { colors, radius, space } from '@/theme/tokens';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: space.sm }}>
      <AppText variant="label" color={colors.text3} style={{ paddingHorizontal: space.lg }}>{title}</AppText>
      <View style={{ backgroundColor: colors.surface, borderRadius: radius.lg, marginHorizontal: space.lg, overflow: 'hidden' }}>{children}</View>
    </View>
  );
}

function Row({ icon, label, detail, onPress, danger, right }: { icon: React.ReactNode; label: string; detail?: string; onPress?: () => void; danger?: boolean; right?: React.ReactNode }) {
  return (
    <Pressable onPress={onPress} disabled={!onPress} accessibilityRole={onPress ? 'button' : undefined} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.lg, minHeight: 60, paddingVertical: space.sm, backgroundColor: pressed ? colors.surface2 : 'transparent' })}>
      {icon}
      <View style={{ flex: 1 }}>
        <AppText variant="label" color={danger ? colors.danger : colors.text}>{label}</AppText>
        {detail && <AppText variant="small" color={colors.text3}>{detail}</AppText>}
      </View>
      {right ?? (onPress && <ChevronRight size={18} color={colors.text3} />)}
    </Pressable>
  );
}

const fmt = (ts: number) => new Date(ts).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

export default function Settings() {
  const toast = useToast();
  const { session, users, feed, mentionPolicy, setMentionPolicy, badge, requestBadge, signOut, enablePush, blocked, unblock, changePseudo, deletion, requestDeletion, cancelDeletion, comments, favorites, customStickers, myStickers, notifications, loadSettings, loadExport } = useStore();
  const [busy, setBusy] = useState<string | null>(null);
  const [pseudoTaken, setPseudoTaken] = useState<string | null>(null);
  // Mentions, comptes bloqués, badge et suppression en cours viennent du serveur.
  useEffect(() => { loadSettings().catch((e) => toast(errorMessage(e, 'Les réglages n’ont pas pu être actualisés.'))); }, [loadSettings, toast]);
  /** Lance une action du serveur : bouton occupé pendant l'envoi, toast en cas d'échec. */
  const run = async (key: string, action: () => Promise<unknown>, done?: string) => {
    if (busy) return false;
    setBusy(key);
    try {
      await action();
      if (done) toast(done);
      return true;
    } catch (e) {
      toast(errorMessage(e));
      return false;
    } finally {
      setBusy(null);
    }
  };
  const [exporting, setExporting] = useState(false);
  const [sheet, setSheet] = useState<null | 'badge' | 'pseudo' | 'deletion'>(null);
  const [delReason, setDelReason] = useState<string | null>(null);
  const [delAck, setDelAck] = useState(false);
  const [push, setPush] = useState<PushStatus>('undetermined');
  useEffect(() => {
    getPushStatus().then(setPush);
  }, []);
  const [step, setStep] = useState<'check' | 'form'>('check');
  const [links, setLinks] = useState('');
  const [idDoc, setIdDoc] = useState<string | null>(null);
  const [pseudo, setPseudo] = useState('');
  const me = session?.user;
  if (!me) return null;
  const close = () => setSheet(null);

  // F7 RG1 : conditions pour pouvoir demander le badge. Seuls les badings signés comptent (jamais les anonymes).
  // La décision appartient uniquement à l'équipe On Bade (dashboard admin), qui peut aussi l'attribuer directement.
  const signed = feed.filter((b) => b.authorId === me.id && !b.anonymous);
  const lastPost = signed.filter((b) => !b.rebadeOf).reduce((m, b) => Math.max(m, b.createdAt), 0);
  const lastDays = lastPost ? Math.floor((Date.now() - lastPost) / 86_400_000) : null;
  const laughsReceived = signed.reduce((n, b) => n + b.likes, 0);
  const checks = [
    { ok: lastDays !== null && lastDays <= RULES.badge.activeDays, label: `Être actif : un bading signé ces ${RULES.badge.activeDays} derniers jours`, value: lastDays === null ? 'aucun' : lastDays === 0 ? "aujourd'hui" : `il y a ${lastDays} j` },
    { ok: laughsReceived >= RULES.badge.minLaughs, label: `Au moins ${compact(RULES.badge.minLaughs)} rires reçus`, value: `${compact(laughsReceived)} / ${compact(RULES.badge.minLaughs)}` },
  ];
  // F7 RG5: wait 30 days after a refusal.
  const retryAt = badge.status === 'refused' && badge.decidedAt ? badge.decidedAt + BADGE_RETRY_DAYS * 86_400_000 : 0;
  const waiting = retryAt > Date.now();
  const eligible = checks.every((c) => c.ok) && !waiting;
  const badgeLabel = {
    none: 'Pas encore demandé',
    pending: 'En attente · réponse sous 7 jours',
    accepted: 'Acceptée',
    refused: `Refusée${badge.reason ? ` : ${badge.reason}` : ''}`,
  }[badge.status];

  const linkList = links.split(/[\s,]+/).filter((l) => /^(https?:\/\/)?[\w-]+\.[\w.-]+/.test(l));
  const pickId = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.6 });
    if (!res.canceled) setIdDoc(res.assets[0]?.uri ?? null);
  };

  const pseudoError = (pseudo ? pseudoFormatError(pseudo) : null)
    ?? (pseudoTaken === pseudo ? 'Ce pseudo est déjà pris.' : null)
    ?? (Object.values(users).some((u) => u.id !== me.id && u.pseudo.toLowerCase() === pseudo.toLowerCase()) ? 'Ce pseudo est déjà pris.' : null);
  const savePseudo = async () => {
    setBusy('pseudo');
    try {
      await changePseudo(pseudo);
      close();
      toast('Pseudo modifié');
    } catch (e) {
      if (isApiError(e) && e.code === 'taken') setPseudoTaken(pseudo);
      else toast(errorMessage(e));
    } finally {
      setBusy(null);
    }
  };

  const policy = (p: MentionPolicy, label: string) => (
    <Row icon={<View style={{ width: 22 }} />} label={label} onPress={() => setMentionPolicy(p)} right={mentionPolicy === p ? <Check size={20} color={colors.brandInk} accessibilityLabel="Sélectionné" /> : <View />} />
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScreenHeader title="Paramètres" />
      <ScrollView contentContainerStyle={{ paddingVertical: space.xl, gap: space.xl }}>
        <Section title="Compte">
          <Row icon={<UserRoundPen size={22} color={colors.text2} />} label={`@${me.pseudo}`} detail="Modifier le pseudo" onPress={() => { setPseudo(me.pseudo); setSheet('pseudo'); }} />
          <Row icon={<BadgeCheck size={22} color={colors.brandInk} />} label="Demander le badge vérifié" detail={badgeLabel} onPress={() => { setStep('check'); setSheet('badge'); }} />
        </Section>

        <Section title="Qui peut me mentionner">
          {policy('everyone', 'Tout le monde')}
          {policy('nobody', 'Personne')}
        </Section>

        <Section title="Utilisateurs bloqués">
          {blocked.length === 0 ? (
            <Row icon={<UserX size={22} color={colors.text2} />} label="Personne pour l'instant" detail="Bloque quelqu'un depuis le menu « … » d'un de ses badings" />
          ) : (
            blocked.map((id) => (
              <Row
                key={id}
                icon={<Avatar user={users[id] ?? null} size={32} />}
                label={`@${users[id]?.pseudo ?? 'inconnu'}`}
                detail="Ne voit plus tes badings et ne peut plus te mentionner"
                right={<Button label="Débloquer" kind="secondary" size="md" loading={busy === `unblock-${id}`} onPress={() => run(`unblock-${id}`, () => unblock(id), 'Débloqué')} />}
              />
            ))
          )}
        </Section>

        <Section title="Notifications">
          <Row
            icon={<Bell size={22} color={colors.text2} />}
            label="Notifications push"
            detail={{ granted: 'Activées : rires, commentaires, réponses, mentions', denied: 'Refusées : à réactiver dans les réglages du téléphone', undetermined: 'Touche pour les activer', unavailable: 'Disponibles sur téléphone' }[push]}
            onPress={async () => {
              if (push === 'denied') return Linking.openSettings();
              const status = await enablePush();
              setPush(status);
              if (status === 'granted') notifyLocal('Notifications activées 🎉', 'Tu seras prévenu quand on rit à tes badings.', '/notifications', 1);
            }}
          />
          <Row
            icon={<LogoMark size={22} />}
            label="Dynamic Island et activité en direct"
            detail={liveActivitiesAvailable ? 'Touche pour voir une démo en direct' : 'Disponible dans l’app installée (pas dans Expo Go)'}
            onPress={liveActivitiesAvailable ? () => {
              const a = startBadingActivity({ laughs: 0, comments: 0, rebades: 0, teaser: 'Démo : ton bading en direct', status: 'En ligne' }, 'jebade://notifications');
              let n = 0;
              const t = setInterval(() => { n += 7; a?.update({ laughs: n, comments: Math.floor(n / 9), rebades: Math.floor(n / 14), teaser: 'Démo : ton bading en direct', status: n > 30 ? 'Ça cartonne 🔥' : 'En ligne' }); if (n > 60) { clearInterval(t); a?.end(); } }, 1500);
              toast('Regarde la Dynamic Island');
            } : undefined}
          />
        </Section>

        <Section title="Mes données">
          <Row icon={<Lock size={22} color={colors.text2} />} label="Politique de confidentialité" detail="Tes données, tes droits (loi ivoirienne n° 2013-450)" onPress={() => router.push('/privacy')} />
          <Row icon={<Copy size={22} color={colors.text2} />} label="Recevoir une copie de mes données" detail={exporting ? 'Création du PDF…' : 'Un PDF avec ton compte, tes badings et toutes tes statistiques'} onPress={async () => {
            if (exporting || !session) return;
            setExporting(true);
            try {
              await loadExport(); // tout ce qui concerne mon compte, pour un PDF complet
              await exportMyData({ me: session.user, email: session.email, feed, comments, users, favorites, customStickers, myStickers, mentionsReceived: notifications.filter((n) => n.kind === 'mention').length, mentionPolicy, blocked, badge, deletion });
            } catch { toast('Impossible de créer le PDF, réessaie.'); } finally { setExporting(false); }
          }} />
          {deletion.status === 'pending' ? (
            <Row
              icon={<Trash2 size={22} color={colors.danger} />}
              label="Suppression demandée"
              detail={`Le ${fmt(deletion.requestedAt! + DELETION_DELAY_DAYS * 86_400_000)} · tu peux encore annuler`}
              right={<Button label="Annuler" kind="secondary" size="md" loading={busy === 'cancel-deletion'} onPress={() => run('cancel-deletion', cancelDeletion, 'Demande de suppression annulée')} />}
            />
          ) : (
            <Row icon={<Trash2 size={22} color={colors.danger} />} label="Demander la suppression de mon compte" danger onPress={() => { setDelAck(false); setDelReason(null); setSheet('deletion'); }} />
          )}
        </Section>

        <Section title="Session">
          <Row icon={<LogOut size={22} color={colors.text2} />} label="Se déconnecter" onPress={() => { signOut(); router.replace('/'); }} />
        </Section>

        <View accessible accessibilityLabel="On Bade, une app ORIVERSE, créée par la team Oriverse-IT" style={{ alignItems: 'center', gap: 6, paddingVertical: space.xl }}>
          <LogoMark size={28} />
          <AppText variant="small" color={colors.text3}>On Bade · ORIVERSE</AppText>
          <AppText variant="meta" color={colors.text2}>
            Créé par la <AppText variant="label" color={colors.text}>team Oriverse-IT</AppText>
          </AppText>
        </View>
      </ScrollView>

      <Sheet visible={sheet === 'pseudo'} onClose={close} title="Modifier le pseudo">
        <View style={{ paddingHorizontal: space.xl, gap: space.lg }}>
          <Field label="Nouveau pseudo" prefix="@" autoCapitalize="none" autoCorrect={false} value={pseudo} onChangeText={(t) => setPseudo(t.trim())} maxLength={20} error={pseudoError} hint={PSEUDO_RULES} />
          {me.verified && <AppText variant="meta" color={colors.danger}>Ton badge vérifié sera retiré : il faudra le redemander.</AppText>}
          <Button label="Enregistrer" disabled={!pseudo || !!pseudoError || pseudo === me.pseudo} loading={busy === 'pseudo'} onPress={savePseudo} />
        </View>
      </Sheet>

      <Sheet visible={sheet === 'deletion'} onClose={close} title="Supprimer ton compte ?">
        <View style={{ paddingHorizontal: space.xl, gap: space.lg }}>
          <AppText variant="body" color={colors.text2}>
            Ta demande est enregistrée tout de suite. Ton compte, tes badings (signés et anonymes), tes commentaires, favoris et données personnelles seront effacés le {fmt(Date.now() + DELETION_DELAY_DAYS * 86_400_000)}. D'ici là, tu peux annuler depuis cet écran.
          </AppText>
          <View style={{ gap: space.sm }}>
            <AppText variant="label" color={colors.text3}>Pourquoi tu pars ? (facultatif)</AppText>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
              {['Je n’utilise plus l’app', 'Trop de notifications', 'Je m’inquiète pour mes données', 'Autre'].map((r) => (
                <Pressable key={r} onPress={() => setDelReason(delReason === r ? null : r)} accessibilityRole="radio" accessibilityState={{ checked: delReason === r }} style={{ paddingHorizontal: 14, height: 36, borderRadius: radius.pill, justifyContent: 'center', borderWidth: 1, borderColor: delReason === r ? colors.brandInk : colors.line, backgroundColor: delReason === r ? colors.brandSoft : 'transparent' }}>
                  <AppText variant="small" color={delReason === r ? colors.text : colors.text2}>{r}</AppText>
                </Pressable>
              ))}
            </View>
          </View>
          <Pressable onPress={() => setDelAck((a) => !a)} accessibilityRole="checkbox" accessibilityState={{ checked: delAck }} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 44 }}>
            <View style={{ width: 24, height: 24, borderRadius: 7, borderWidth: 2, borderColor: delAck ? colors.danger : colors.text3, backgroundColor: delAck ? colors.danger : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
              {delAck && <Check size={16} color="#fff" strokeWidth={3} />}
            </View>
            <AppText variant="label" style={{ flex: 1 }}>Je comprends que la suppression est définitive après {DELETION_DELAY_DAYS} jours</AppText>
          </Pressable>
          <Button label="Envoyer la demande" disabled={!delAck} loading={busy === 'deletion'} style={{ backgroundColor: colors.danger }} onPress={async () => { if (await run('deletion', () => requestDeletion(delReason ?? undefined), 'Demande de suppression envoyée')) close(); }} />
        </View>
      </Sheet>

      <Sheet visible={sheet === 'badge'} onClose={close} title="Badge vérifié">
        <View style={{ paddingHorizontal: space.xl, gap: space.lg }}>
          {badge.status === 'pending' ? (
            <>
              <AppText variant="body" color={colors.text2}>Ta demande est en cours d'examen par l'équipe. Réponse sous 7 jours, par notification.</AppText>
              <AppText variant="label" color={colors.brandInk}>Statut : en attente</AppText>
            </>
          ) : step === 'check' ? (
            <>
              <AppText variant="body" color={colors.text2}>Il confirme que ton compte est authentique et que tu fais rire. Gratuit. Quand les deux conditions sont remplies, tu peux faire ta demande ; seule l'équipe On Bade décide et attribue le badge. Seuls tes badings signés comptent.</AppText>
              {badge.status === 'refused' && (
                <AppText variant="meta" color={colors.text2}>
                  Dernière demande refusée{badge.reason ? ` : ${badge.reason}` : ''}.{waiting ? ` Nouvelle demande possible le ${new Date(retryAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}.` : ''}
                </AppText>
              )}
              <View style={{ gap: space.md }}>
                {checks.map((c) => (
                  <View key={c.label} style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
                    {c.ok ? <Check size={20} color={colors.success} /> : <CircleX size={20} color={colors.danger} />}
                    <AppText variant="body" style={{ flex: 1 }}>{c.label}</AppText>
                    <AppText variant="meta" color={colors.text3} style={{ fontVariant: ['tabular-nums'] }}>{c.value}</AppText>
                  </View>
                ))}
              </View>
              <Button label={eligible ? 'Continuer' : 'Pas encore éligible'} disabled={!eligible} onPress={() => setStep('form')} />
            </>
          ) : (
            <>
              <Field label="Liens vers tes réseaux sociaux" placeholder="tiktok.com/@toi, facebook.com/tapage" autoCapitalize="none" value={links} onChangeText={setLinks} hint="Au moins un lien, séparés par des virgules" />
              <PressableRow onPress={pickId} done={!!idDoc} />
              <AppText variant="small" color={colors.text3}>La pièce est supprimée dès que la demande est traitée.</AppText>
              <Button
                label="Envoyer la demande"
                disabled={linkList.length === 0 || !idDoc}
                loading={busy === 'badge'}
                onPress={async () => {
                  if (await run('badge', () => requestBadge(linkList, idDoc), 'Demande envoyée · réponse sous 7 jours')) { setIdDoc(null); setLinks(''); close(); }
                }}
              />
            </>
          )}
        </View>
      </Sheet>

    </View>
  );
}

function PressableRow({ onPress, done }: { onPress: () => void; done: boolean }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.lg, borderRadius: radius.md, borderWidth: 1, borderStyle: done ? 'solid' : 'dashed', borderColor: done ? colors.success : colors.line, backgroundColor: pressed ? colors.surface2 : 'transparent' })}>
      <IdCard size={22} color={done ? colors.success : colors.text2} />
      <View style={{ flex: 1 }}>
        <AppText variant="label">{done ? "Pièce d'identité ajoutée" : "Ajouter ta pièce d'identité"}</AppText>
        <AppText variant="small" color={colors.text3}>{done ? 'Touche pour la changer' : "Ou un document de l'entreprise pour une page"}</AppText>
      </View>
      {done && <Check size={20} color={colors.success} />}
    </Pressable>
  );
}
