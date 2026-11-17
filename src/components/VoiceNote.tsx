// Lecteur d'une note vocale, comme sur le site : lecture/pause, onde qui se colore en avançant (toucher pour sauter),
// temps restant et vitesse ×1 / ×1,5 / ×2. Pas de lecture automatique (forfait internet) ; un seul vocal à la fois.
import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';

import type { VoiceClip } from '@/data/types';
import { claimPlayback, clock } from '@/lib/voice';
import { colors, radius } from '@/theme/tokens';

import { AppText } from './AppText';
import { tap } from './haptics';
import { Pause, Play } from './icons';

const SPEEDS = [1, 1.5, 2];

export function VoiceNote({ audio }: { audio: VoiceClip }) {
  const player = useAudioPlayer(audio.src);
  const status = useAudioPlayerStatus(player);
  const [speed, setSpeed] = useState(1);
  const [width, setWidth] = useState(0);
  const duration = audio.durationMs || (status.duration ? status.duration * 1000 : 0);
  const time = (status.currentTime ?? 0) * 1000;
  const progress = duration ? Math.min(1, time / duration) : 0;
  const bars = audio.waveform?.length ? audio.waveform : Array(32).fill(30);

  // Fin de lecture : retour au début, prêt à être réécouté.
  useEffect(() => {
    if (status.didJustFinish) { player.pause(); player.seekTo(0).catch(() => {}); }
  }, [status.didJustFinish, player]);

  const toggle = () => {
    tap();
    if (status.playing) { player.pause(); return; }
    claimPlayback(() => player.pause());
    player.setPlaybackRate(speed, 'high');
    player.play();
  };

  const nextSpeed = () => {
    const next = SPEEDS[(SPEEDS.indexOf(speed) + 1) % SPEEDS.length];
    setSpeed(next);
    player.setPlaybackRate(next, 'high');
  };

  const seek = (x: number) => {
    if (!duration || !width) return;
    player.seekTo(((Math.min(1, Math.max(0, x / width)) * duration) / 1000)).catch(() => {});
  };

  const remaining = status.playing || time > 0 ? duration - time : duration;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, alignSelf: 'flex-start', maxWidth: 320, width: '100%', paddingVertical: 6, paddingLeft: 6, paddingRight: 10, borderRadius: radius.pill, backgroundColor: colors.surface2, borderWidth: 1, borderColor: colors.line }}>
      <Pressable onPress={toggle} accessibilityRole="button" accessibilityLabel={status.playing ? 'Mettre en pause' : `Écouter la note vocale (${clock(duration)})`} hitSlop={6}
        style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: colors.brand, alignItems: 'center', justifyContent: 'center' }}>
        {status.playing ? <Pause size={16} color="#fff" fill="#fff" /> : <Play size={16} color="#fff" fill="#fff" />}
      </Pressable>
      <Pressable onPress={(e) => seek(e.nativeEvent.locationX)} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
        accessibilityRole="adjustable" accessibilityLabel="Position dans la note vocale"
        style={{ flex: 1, minWidth: 0, height: 30, flexDirection: 'row', alignItems: 'center', gap: 1, overflow: 'hidden' }}>
        {bars.map((h, i) => (
          <View key={i} style={{ flex: 1, minWidth: 0, maxWidth: 4, height: `${Math.max(8, h)}%`, borderRadius: 2, backgroundColor: i / bars.length < progress ? colors.brandInk : colors.text3, opacity: i / bars.length < progress ? 1 : 0.6 }} />
        ))}
      </Pressable>
      <AppText variant="small" color={colors.text2} style={{ minWidth: 34, paddingLeft: 4, textAlign: 'right', fontVariant: ['tabular-nums'], flexShrink: 0 }}>{clock(remaining)}</AppText>
      <Pressable onPress={nextSpeed} accessibilityRole="button" accessibilityLabel={`Vitesse de lecture : ×${speed}`} hitSlop={6}
        style={{ minWidth: 36, height: 26, paddingHorizontal: 6, borderRadius: radius.pill, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' }}>
        <AppText variant="small" color={colors.text2} style={{ fontWeight: '700' }}>×{String(speed).replace('.', ',')}</AppText>
      </Pressable>
    </View>
  );
}
