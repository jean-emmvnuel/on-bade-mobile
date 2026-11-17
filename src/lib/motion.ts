/**
 * Mouvement « à la Apple » (skill apple-design) : ressorts décrits par amortissement + rapidité,
 * élan projeté, résistance aux bords. Fonctions « worklet » utilisables dans les gestes Reanimated.
 */
import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

/** Ressort sans rebond : le réglage par défaut de l'interface (amortissement 1). */
export const SPRING_UI = { dampingRatio: 1, duration: 380 };
/** Léger rebond, seulement après un geste lancé (feuille relâchée, carte jetée). */
export const SPRING_FLICK = { dampingRatio: 0.82, duration: 340 };

/** Où un geste lancé « veut » s'arrêter (décélération d'Apple, comme le défilement). */
export function project(velocity: number, rate = 0.998) {
  'worklet';
  return ((velocity / 1000) * rate) / (1 - rate);
}

/** Au-delà d'un bord, l'élément suit de moins en moins. */
export function rubberband(overshoot: number, dimension: number, constant = 0.55) {
  'worklet';
  return (overshoot * dimension * constant) / (dimension + constant * Math.abs(overshoot));
}

/** iOS « Réduire la transparence » : on remplace les matières floues par des fonds pleins. */
export function useReduceTransparency() {
  const [on, setOn] = useState(false);
  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceTransparencyEnabled?.().then((v) => alive && setOn(v)).catch(() => {});
    const sub = AccessibilityInfo.addEventListener?.('reduceTransparencyChanged', setOn);
    return () => { alive = false; sub?.remove?.(); };
  }, []);
  return on;
}
