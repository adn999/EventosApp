import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';

/** ok: éxito · ya: ya estaba registrado (advertencia) · error: falló o no es válido */
export type Haptico = 'ok' | 'ya' | 'error';

const tipo: Record<Haptico, NotificationType> = {
  ok: NotificationType.Success,
  ya: NotificationType.Warning,
  error: NotificationType.Error,
};

const patronWeb: Record<Haptico, number | number[]> = {
  ok: 30,
  ya: [30, 60, 30],
  error: [60, 40, 60],
};

/** Vibración de respuesta en iPhone y Android (en el navegador usa navigator.vibrate si existe). */
export function vibrar(h: Haptico | null): void {
  if (!h) return;
  if (Capacitor.isNativePlatform()) {
    Haptics.notification({ type: tipo[h] }).catch(() => { /* sin motor háptico */ });
  } else {
    navigator.vibrate?.(patronWeb[h]);
  }
}

/** Toque ligero para botones y menú (sustituye al sonido "pop"). */
export function toque(): void {
  if (Capacitor.isNativePlatform()) {
    Haptics.impact({ style: ImpactStyle.Light }).catch(() => { /* sin motor háptico */ });
  } else {
    navigator.vibrate?.(10);
  }
}

/** Vibración de cada resultado; null = toque ligero. */
export function hapticoDe(sonido: string): Haptico | null {
  switch (sonido) {
    case 'ok': case 'info': return 'ok';
    case 'error': return 'error';
    default: return null;
  }
}

/** Solo respuesta háptica, sin audio: ok/info/error vibran según el resultado; "click" y cualquier otro, un toque ligero. */
export function sentir(sonido: string, haptico?: Haptico): void {
  const h = haptico ?? hapticoDe(sonido);
  if (h) vibrar(h); else toque();
}

/** Respuesta de la app a botones, menú y resultados de operaciones: solo vibración, sin sonido. */
export function reproducir(sonido: string, haptico?: Haptico): void {
  sentir(sonido, haptico);
}
