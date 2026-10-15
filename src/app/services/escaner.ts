import { Capacitor, PluginListenerHandle, registerPlugin } from '@capacitor/core';
import { BarcodeFormat, BarcodeScanner } from '@capacitor-mlkit/barcode-scanning';

/**
 * Escáner propio: iOS (CodigoBarras.swift, AVFoundation) hace una lectura o escaneo continuo;
 * Android (CodigoBarrasPlugin.java, CameraX + ML Kit) solo escaneo continuo.
 */
interface CodigoBarrasPlugin {
  escanear(): Promise<{ valor?: string; cancelado?: boolean }>;
  iniciarContinuo(o: { titulo: string }): Promise<void>;
  mostrarResultado(r: ResultadoContinuo): Promise<void>;
  detenerContinuo(): Promise<void>;
  addListener(ev: 'codigoContinuo', fn: (e: { valor: string }) => void): Promise<PluginListenerHandle>;
  addListener(ev: 'continuoCerrado', fn: () => void): Promise<PluginListenerHandle>;
}
const CodigoBarras = registerPlugin<CodigoBarrasPlugin>('CodigoBarras');

/** Cómo se captura el código en cada pantalla; siempre arranca en 'teclado'. */
export type ModoCaptura = 'teclado' | 'camara';

// Última opción elegida en cada pantalla. Solo vive en memoria: al navegar entre pantallas se recuerda,
// pero al cerrar sesión o reiniciar la app todo vuelve a 'teclado'.
const modos = new Map<string, ModoCaptura>();
export const modoGuardado = (clave: string): ModoCaptura => modos.get(clave) ?? 'teclado';
export const guardarModo = (clave: string, modo: ModoCaptura): void => { modos.set(clave, modo); };

export type ResultadoEscaneo =
  | { estado: 'ok'; valor: string }
  | { estado: 'cancelado' }
  | { estado: 'permiso' }          // el usuario negó el acceso a la cámara
  | { estado: 'no-disponible' };

/** Lee un código de barras con la cámara. Solo Code 128 y Code 39 (pulseras y CUM); ignora QR y demás formatos. */
export async function escanearBarras(): Promise<ResultadoEscaneo> {
  try {
    if (Capacitor.getPlatform() === 'ios') {
      const r = await CodigoBarras.escanear();
      return r.valor ? { estado: 'ok', valor: r.valor } : { estado: 'cancelado' };
    }
    // Android: escáner de Google (ML Kit); el módulo se descarga una vez si hace falta
    const { available } = await BarcodeScanner.isGoogleBarcodeScannerModuleAvailable();
    if (!available) await BarcodeScanner.installGoogleBarcodeScannerModule();
    const { barcodes } = await BarcodeScanner.scan({ formats: [BarcodeFormat.Code128, BarcodeFormat.Code39], autoZoom: true });
    const valor = barcodes[0]?.rawValue;
    return valor ? { estado: 'ok', valor } : { estado: 'cancelado' };
  } catch (e: any) {
    const msg = String(e?.code ?? e?.message ?? e).toLowerCase();
    if (msg.includes('cancel')) return { estado: 'cancelado' };
    if (msg.includes('permiso') || msg.includes('permission') || msg.includes('denied')) return { estado: 'permiso' };
    return { estado: 'no-disponible' };
  }
}

/** Resultado de procesar un código en escaneo continuo: ok (verde), ya (ámbar, ya registrado) o error (rojo). */
export interface ResultadoContinuo { tipo: 'ok' | 'ya' | 'error'; titulo: string; detalle?: string; }

/** Agrega en otra línea de la tarjeta los eventos del usuario (nombreEvento viene separado por "|"). */
export function conEventos(detalle: string, nombreEvento?: string): string {
  const eventos = (nombreEvento ?? '').split('|').map(e => e.trim()).filter(e => e);
  if (!eventos.length) return detalle;
  return [detalle, (eventos.length == 1 ? 'Evento: ' : 'Eventos: ') + eventos.join(', ')].filter(x => x).join('\n');
}

const conLimite = (p: Promise<ResultadoContinuo>, ms: number): Promise<ResultadoContinuo> =>
  Promise.race([p, new Promise<ResultadoContinuo>(r => setTimeout(() => r({ tipo: 'error', titulo: 'Sin respuesta', detalle: 'Revisa la conexión e intenta de nuevo' }), ms))]);

let continuoActivo = false;

/** Plataformas con escaneo continuo en cámara propia (la cámara no se cierra entre lecturas). */
export const camaraPropia = (): boolean => ['ios', 'android'].includes(Capacitor.getPlatform());

/**
 * Escaneo continuo: la cámara queda abierta y cada código se entrega a `procesar`, que debe resolver con el resultado.
 *  - iOS y Android: cámara propia con una tarjeta que muestra el resultado de cada lectura; termina al tocar "Terminar".
 *  - Otras plataformas: el escáner se vuelve a abrir tras cada lectura; termina al cerrarlo.
 * Devuelve cuando el usuario termina, o el motivo si no se pudo abrir la cámara.
 */
export async function escanearContinuo(titulo: string, procesar: (valor: string) => Promise<ResultadoContinuo>):
    Promise<'terminado' | 'permiso' | 'no-disponible'> {
  if (continuoActivo) return 'terminado';
  continuoActivo = true;
  try {
    if (camaraPropia()) {
      return await new Promise(async resolve => {
        const escuchas: Promise<PluginListenerHandle>[] = [];
        const fin = (motivo: 'terminado' | 'permiso' | 'no-disponible') => {
          escuchas.forEach(h => h.then(x => x.remove()));
          resolve(motivo);
        };
        escuchas.push(CodigoBarras.addListener('codigoContinuo', async e => {
          const r = await conLimite(procesar(e.valor).catch(() => ({ tipo: 'error' as const, titulo: 'No se pudo procesar' })), 11000);
          CodigoBarras.mostrarResultado(r).catch(() => { /* la cámara ya se cerró */ });
        }));
        escuchas.push(CodigoBarras.addListener('continuoCerrado', () => fin('terminado')));
        try { await CodigoBarras.iniciarContinuo({ titulo }); }
        catch (e: any) {
          const msg = String(e?.code ?? e?.message ?? e).toLowerCase();
          fin(msg.includes('permiso') ? 'permiso' : 'no-disponible');
        }
      });
    }
    // Cualquier otra plataforma con cámara: una lectura tras otra
    for (;;) {
      const r = await escanearBarras();
      if (r.estado === 'permiso' || r.estado === 'no-disponible') return r.estado;
      if (r.estado !== 'ok') return 'terminado';
      await conLimite(procesar(r.valor).catch(() => ({ tipo: 'error' as const, titulo: 'No se pudo procesar' })), 11000);
      await new Promise(res => setTimeout(res, 1600));   // tiempo para ver el aviso antes de reabrir la cámara
    }
  } finally {
    continuoActivo = false;
  }
}

/** Cierra la cámara del escaneo continuo (al salir de la pantalla). */
export function detenerContinuo(): void {
  if (continuoActivo && camaraPropia()) CodigoBarras.detenerContinuo().catch(() => { /* ya cerrada */ });
}
