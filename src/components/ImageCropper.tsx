/**
 * Recadrage avant publication (F1, RG2) : forme libre (bornée par minRatio / maxRatio, de 1:2 à 2:1 pour un bading),
 * portrait 4:5 ou carré 1:1. Rotation, déplacement, pincement, poignées d'angle.
 * Sortie : JPEG de 1 080 px de large maximum, sans métadonnées (ré-encodé par expo-image-manipulator).
 */
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, Modal, Pressable, StatusBar, View } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { BadingImage } from '@/data/types';
import { colors, radius, space } from '@/theme/tokens';

import { AppText } from './AppText';
import { Button } from './Button';
import { RotateCw, ZoomIn, ZoomOut } from './icons';

export type CropSettings = { ratioKey: RatioKey; rot: number };
export type RatioKey = 'libre' | '4:5' | '1:1';
const ALL_RATIOS: { key: RatioKey; label: string; value: number | null }[] = [
  { key: 'libre', label: 'Libre', value: null },
  { key: '4:5', label: 'Portrait', value: 4 / 5 },
  { key: '1:1', label: 'Carré', value: 1 },
];
const PAD = 20;
const MIN_FRAME = 72;
const HANDLE_ZONE = 36;

type Frame = { x: number; y: number; w: number; h: number };
type Props = {
  source: { uri: string; width: number; height: number } | null;
  initial?: Partial<CropSettings>;
  onCancel: () => void;
  onDone: (image: BadingImage, settings: CropSettings) => void;
  /** Formats proposés (un sticker personnel n'accepte que le carré). */
  ratios?: RatioKey[];
  /** Largeur maximale de l'image produite : 1 080 px pour un bading, 512 px pour un sticker. */
  outMax?: number;
  title?: string;
  /** Aperçu rond (photo de profil). */
  round?: boolean;
  /** Forme libre : largeur / hauteur entre ces bornes (bading : 0,5 à 2, comme le serveur). */
  minRatio?: number;
  maxRatio?: number;
};

/** Forme d'une image de bading (largeur / hauteur) : de 1:2 à 2:1, comme le serveur. */
export const IMAGE_RATIO = { min: 0.5, max: 2 };

export function ImageCropper({ source, initial, onCancel, onDone, ratios = ['4:5', '1:1'], outMax = 1080, title = 'Recadrer', round = false, minRatio = 0, maxRatio = Infinity }: Props) {
  const RATIOS = ALL_RATIOS.filter((r) => ratios.includes(r.key));
  const bound = (r: number) => Math.min(maxRatio, Math.max(minRatio, r));
  const insets = useSafeAreaInsets();
  const [stage, setStage] = useState<{ w: number; h: number } | null>(null);
  const [ratioKey, setRatioKey] = useState<RatioKey>(initial?.ratioKey && ratios.includes(initial.ratioKey) ? initial.ratioKey : ratios[0]);
  const [rot, setRot] = useState(initial?.rot ?? 0);
  const [busy, setBusy] = useState(false);
  // Position courante : échelle, centre de l'image et cadre, dans le repère de la scène.
  const [v, setV] = useState<{ s: number; cx: number; cy: number; f: Frame } | null>(null);
  const start = useRef<{ mode: 'pan' | 'handle'; corner?: string; cx: number; cy: number; f: Frame; s: number } | null>(null);

  const nat = source ? { w: source.width, h: source.height } : { w: 1, h: 1 };
  const W = rot % 180 ? nat.h : nat.w;
  const H = rot % 180 ? nat.w : nat.h;

  // Cadre initial : le plus grand rectangle au bon format dans la scène (libre : la forme de l'image, bornée), image en « cover ».
  useEffect(() => {
    if (!stage || !source) return;
    const r = RATIOS.find((x) => x.key === ratioKey)!.value ?? bound(W / H);
    const aw = stage.w - 2 * PAD, ah = stage.h - 2 * PAD;
    const fw = Math.min(aw, ah * r), fh = fw / r;
    const f = { x: (stage.w - fw) / 2, y: (stage.h - fh) / 2, w: fw, h: fh };
    setV({ s: Math.max(fw / W, fh / H), cx: stage.w / 2, cy: stage.h / 2, f });
  }, [stage, source, ratioKey, rot, W, H]);

  const clamp = (n: { s: number; cx: number; cy: number; f: Frame }) => {
    const s = Math.max(n.s, n.f.w / W, n.f.h / H);
    const hw = (W * s) / 2, hh = (H * s) / 2;
    const cx = Math.min(n.f.x + hw, Math.max(n.f.x + n.f.w - hw, n.cx));
    const cy = Math.min(n.f.y + hh, Math.max(n.f.y + n.f.h - hh, n.cy));
    return { ...n, s, cx, cy };
  };

  const cornerAt = (x: number, y: number, f: Frame) => {
    const pts: [string, number, number][] = [['nw', f.x, f.y], ['ne', f.x + f.w, f.y], ['sw', f.x, f.y + f.h], ['se', f.x + f.w, f.y + f.h]];
    return pts.find(([, px, py]) => Math.abs(px - x) < HANDLE_ZONE && Math.abs(py - y) < HANDLE_ZONE)?.[0];
  };

  const resize = (corner: string, f0: Frame, dx: number, dy: number, cur: { s: number; cx: number; cy: number }) => {
    const r = RATIOS.find((x) => x.key === ratioKey)!.value;
    const left = corner.includes('w'), topSide = corner.includes('n');
    const ax = left ? f0.x + f0.w : f0.x, ay = topSide ? f0.y + f0.h : f0.y; // coin opposé, fixe
    let w = Math.max(MIN_FRAME, f0.w + (left ? -dx : dx));
    let h = Math.max(MIN_FRAME, f0.h + (topSide ? -dy : dy));
    if (r) { if (w / h > r) w = h * r; else h = w / r; }
    else if (w / h > maxRatio) w = h * maxRatio;
    else if (w / h < minRatio) h = w / minRatio;
    const imgL = cur.cx - (W * cur.s) / 2, imgT = cur.cy - (H * cur.s) / 2;
    const maxW = left ? ax - Math.max(PAD / 2, imgL) : Math.min(stage!.w - PAD / 2, imgL + W * cur.s) - ax;
    const maxH = topSide ? ay - Math.max(PAD / 2, imgT) : Math.min(stage!.h - PAD / 2, imgT + H * cur.s) - ay;
    if (w > maxW) { w = maxW; if (r) h = w / r; else if (w / h < minRatio) h = w / minRatio; }
    if (h > maxH) { h = maxH; if (r) w = h * r; else if (w / h > maxRatio) w = h * maxRatio; }
    return { x: left ? ax - w : ax, y: topSide ? ay - h : ay, w, h };
  };

  const pan = Gesture.Pan()
    .runOnJS(true)
    .minDistance(0)
    .onBegin((e) => {
      if (!v) return;
      const corner = cornerAt(e.x, e.y, v.f);
      start.current = { mode: corner ? 'handle' : 'pan', corner, cx: v.cx, cy: v.cy, f: v.f, s: v.s };
    })
    .onUpdate((e) => {
      const st = start.current; if (!st || !v) return;
      if (st.mode === 'pan') setV(clamp({ ...v, cx: st.cx + e.translationX, cy: st.cy + e.translationY }));
      else setV(clamp({ ...v, f: resize(st.corner!, st.f, e.translationX, e.translationY, v) }));
    });
  const pinchStart = useRef(1);
  const pinch = Gesture.Pinch()
    .runOnJS(true)
    .onBegin(() => { pinchStart.current = v?.s ?? 1; })
    .onUpdate((e) => { if (v) setV(clamp({ ...v, s: pinchStart.current * e.scale })); });

  const zoomBy = (k: number) => v && setV(clamp({ ...v, s: v.s * k }));

  const validate = async () => {
    if (!v || !source) return;
    setBusy(true);
    try {
      const sx = Math.max(0, Math.round((v.f.x - (v.cx - (W * v.s) / 2)) / v.s));
      const sy = Math.max(0, Math.round((v.f.y - (v.cy - (H * v.s) / 2)) / v.s));
      const sw = Math.min(W - sx, Math.round(v.f.w / v.s));
      const sh = Math.min(H - sy, Math.round(v.f.h / v.s));
      const ctx = ImageManipulator.manipulate(source.uri);
      if (rot) ctx.rotate(rot);
      ctx.crop({ originX: sx, originY: sy, width: sw, height: sh });
      if (sw > outMax) ctx.resize({ width: outMax });
      const ref = await ctx.renderAsync();
      const out = await ref.saveAsync({ compress: 0.84, format: SaveFormat.JPEG });
      onDone({ uri: out.uri, width: out.width, height: out.height }, { ratioKey, rot });
    } finally {
      setBusy(false);
    }
  };

  const f = v?.f;
  return (
    <Modal visible={!!source} animationType="fade" onRequestClose={onCancel} statusBarTranslucent>
      <StatusBar barStyle="light-content" />
      <GestureHandlerRootView style={{ flex: 1, backgroundColor: '#0d0c0c' }}>
        <View style={{ paddingTop: insets.top + 6, paddingHorizontal: space.md, height: insets.top + 60, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Button label="Annuler" kind="ghost" size="md" onPress={onCancel} />
          <AppText variant="heading">{title}</AppText>
          <Button label="Valider" size="md" loading={busy} onPress={validate} />
        </View>

        <GestureDetector gesture={Gesture.Simultaneous(pan, pinch)}>
          <View style={{ flex: 1, overflow: 'hidden' }} onLayout={(e) => setStage({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
            {source && v && (
              <Image
                source={{ uri: source.uri }}
                style={{ position: 'absolute', width: nat.w * v.s, height: nat.h * v.s, left: v.cx - (nat.w * v.s) / 2, top: v.cy - (nat.h * v.s) / 2, transform: [{ rotate: `${rot}deg` }] }}
              />
            )}
            {f && stage && (
              <>
                {/* Voile autour du cadre */}
                <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: 0, height: f.y, backgroundColor: 'rgba(13,12,12,0.66)' }} />
                <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: f.y + f.h, bottom: 0, backgroundColor: 'rgba(13,12,12,0.66)' }} />
                <View pointerEvents="none" style={{ position: 'absolute', left: 0, width: f.x, top: f.y, height: f.h, backgroundColor: 'rgba(13,12,12,0.66)' }} />
                <View pointerEvents="none" style={{ position: 'absolute', left: f.x + f.w, right: 0, top: f.y, height: f.h, backgroundColor: 'rgba(13,12,12,0.66)' }} />
                {/* Cadre, grille des tiers, poignées */}
                <View pointerEvents="none" style={{ position: 'absolute', left: f.x, top: f.y, width: f.w, height: f.h, borderWidth: 2, borderColor: '#fff', borderRadius: round ? f.w / 2 : 0 }}>
                  {[1, 2].map((i) => <View key={`v${i}`} style={{ position: 'absolute', top: 0, bottom: 0, left: (f.w * i) / 3, width: 1, backgroundColor: 'rgba(255,255,255,0.35)' }} />)}
                  {[1, 2].map((i) => <View key={`h${i}`} style={{ position: 'absolute', left: 0, right: 0, top: (f.h * i) / 3, height: 1, backgroundColor: 'rgba(255,255,255,0.35)' }} />)}
                  {(['nw', 'ne', 'sw', 'se'] as const).map((c) => (
                    <View key={c} style={{ position: 'absolute', width: 26, height: 26, borderColor: '#fff', [c.includes('n') ? 'top' : 'bottom']: -5, [c.includes('w') ? 'left' : 'right']: -5, [c.includes('n') ? 'borderTopWidth' : 'borderBottomWidth']: 5, [c.includes('w') ? 'borderLeftWidth' : 'borderRightWidth']: 5 }} />
                  ))}
                </View>
              </>
            )}
            {!v && <ActivityIndicator color={colors.text2} style={{ flex: 1 }} />}
          </View>
        </GestureDetector>

        <View style={{ paddingHorizontal: space.lg, paddingTop: space.md, paddingBottom: Math.max(insets.bottom, space.lg), gap: space.md }}>
          {RATIOS.length > 1 && <View accessibilityRole="radiogroup" style={{ flexDirection: 'row', gap: 6 }}>
            {RATIOS.map((r) => {
              const on = r.key === ratioKey;
              return (
                <Pressable key={r.key} onPress={() => setRatioKey(r.key)} accessibilityRole="radio" accessibilityState={{ checked: on }} style={{ flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: radius.md, backgroundColor: on ? colors.brandSoft : colors.surface, borderWidth: on ? 1.5 : 0, borderColor: colors.brandInk }}>
                  <AppText variant="label" color={on ? colors.brandInk : colors.text}>{r.key === 'libre' ? '↔' : r.key}</AppText>
                  <AppText variant="small" color={on ? colors.brandInk : colors.text2}>{r.label}</AppText>
                </Pressable>
              );
            })}
          </View>}
          <View style={{ flexDirection: 'row', justifyContent: 'center', gap: space.md }}>
            <ToolButton label="Dézoomer" onPress={() => zoomBy(1 / 1.15)}><ZoomOut size={20} color={colors.text} /></ToolButton>
            <ToolButton label="Zoomer" onPress={() => zoomBy(1.15)}><ZoomIn size={20} color={colors.text} /></ToolButton>
            <ToolButton label="Tourner de 90°" onPress={() => setRot((r) => (r + 90) % 360)}><RotateCw size={20} color={colors.text} /></ToolButton>
          </View>
          <AppText variant="small" color={colors.text3} style={{ textAlign: 'center' }}>Déplace l'image, pince pour zoomer, tire les coins pour ajuster.</AppText>
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
}

function ToolButton({ label, onPress, children }: { label: string; onPress: () => void; children: React.ReactNode }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} hitSlop={6} style={({ pressed }) => ({ width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: pressed ? colors.surface2 : colors.surface })}>
      {children}
    </Pressable>
  );
}
