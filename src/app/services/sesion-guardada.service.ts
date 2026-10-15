import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { NativeBiometric } from '@capgo/capacitor-native-biometric';
import { VistaLoginModel } from '../models/VistaLoginModel';

const CLAVE_SESION = 'mx.org.scouts.eventos.sesion';   // Keychain (iOS) / Keystore (Android), sin biometría
const CLAVE_ACTIVIDAD = 'sesionUltimaActividad';        // localStorage: no es dato sensible
const CLAVE_EVENTO = 'sesionMacroEvento';
const CLAVE_RUTA = 'sesionRuta';
const CLAVE_ESTADO = 'appEstado';                       // { sesion, plano, t }: para saber si la app se cerró sola
const CLAVE_MOTIVO = 'sesionMotivoCierre';              // se muestra al recargar tras un cierre automático
const CLAVE_BITACORA = 'bitacoraApp';
const MAX_BITACORA = 60;

export type MotivoCierre = 'inactividad' | 'expirada';
export interface EstadoApp { sesion: boolean; plano: 'frente' | 'fondo'; t: number; }

/**
 * Sesión que sobrevive a que iOS/Android cierren la app (o solo su WebView) por memoria estando en segundo plano.
 * El usuario y los tokens van cifrados en el almacenamiento seguro del sistema; la hora de la última actividad,
 * el evento elegido y la pantalla van en localStorage. En el navegador no se guarda nada (la sesión sigue en memoria).
 * También lleva una bitácora corta de arranques y cierres para diagnosticar (localStorage 'bitacoraApp').
 */
@Injectable({ providedIn: 'root' })
export class SesionGuardadaService {
  readonly activa = Capacitor.isNativePlatform();

  async guardar(u: VistaLoginModel): Promise<void> {
    if (!this.activa) return;
    try { await NativeBiometric.setData({ key: CLAVE_SESION, value: JSON.stringify(u) }); } catch { /* sin almacenamiento seguro */ }
  }

  async leer(): Promise<VistaLoginModel | null> {
    if (!this.activa) return null;
    try {
      const { value } = await NativeBiometric.getData({ key: CLAVE_SESION });
      const u = JSON.parse(value) as VistaLoginModel;
      return u?.cum ? u : null;
    } catch { return null; }
  }

  async borrar(): Promise<void> {
    [CLAVE_ACTIVIDAD, CLAVE_EVENTO, CLAVE_RUTA].forEach(k => this.quitar(k));
    if (!this.activa) return;
    try { await NativeBiometric.deleteData({ key: CLAVE_SESION }); } catch { /* no había nada */ }
  }

  get ultimaActividad(): number { return Number(this.get(CLAVE_ACTIVIDAD)) || 0; }
  set ultimaActividad(t: number) { this.set(CLAVE_ACTIVIDAD, String(t)); }

  get macroEvento(): string { return this.get(CLAVE_EVENTO) ?? ''; }
  set macroEvento(m: string) { m ? this.set(CLAVE_EVENTO, m) : this.quitar(CLAVE_EVENTO); }

  get ruta(): string { return this.get(CLAVE_RUTA) ?? ''; }
  set ruta(r: string) { this.set(CLAVE_RUTA, r); }

  get estado(): EstadoApp | null { try { return JSON.parse(this.get(CLAVE_ESTADO) ?? 'null'); } catch { return null; } }
  set estado(e: EstadoApp) { this.set(CLAVE_ESTADO, JSON.stringify(e)); }

  /** Lee y borra el motivo del último cierre automático. */
  tomarMotivo(): MotivoCierre | null { const m = this.get(CLAVE_MOTIVO) as MotivoCierre | null; this.quitar(CLAVE_MOTIVO); return m; }
  set motivo(m: MotivoCierre) { this.set(CLAVE_MOTIVO, m); }

  /** Agrega un renglón a la bitácora (se consulta con el inspector de Safari/Chrome o con leerBitacora()). */
  anotar(evento: string): void {
    const b = this.leerBitacora();
    b.push(`${new Date().toLocaleString('es-MX')} · ${evento}`);
    this.set(CLAVE_BITACORA, JSON.stringify(b.slice(-MAX_BITACORA)));
  }
  leerBitacora(): string[] { try { return JSON.parse(this.get(CLAVE_BITACORA) ?? '[]'); } catch { return []; } }

  private get(k: string): string | null { try { return localStorage.getItem(k); } catch { return null; } }
  private set(k: string, v: string): void { try { localStorage.setItem(k, v); } catch { /* sin storage */ } }
  private quitar(k: string): void { try { localStorage.removeItem(k); } catch { /* sin storage */ } }
}
