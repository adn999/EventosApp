import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { AccessControl, BiometryType, NativeBiometric } from '@capgo/capacitor-native-biometric';

// Inicio de sesión opcional con Face ID (iPhone) o huella/rostro (Android).
// Las credenciales se guardan en el Keychain/Keystore protegidas por la biometría del dispositivo.
// Solo funciona en la app nativa; en navegador todo devuelve "no disponible".
@Injectable({ providedIn: 'root' })
export class BiometriaService {
  private readonly server = 'mx.org.scouts.eventos';
  ultimoError = '';
  private readonly claveRechazo = 'biometria-no-preguntar';

  /** Nombre del método disponible ('' si el dispositivo no tiene biometría configurada). */
  async metodoDisponible(): Promise<string> {
    if (!Capacitor.isNativePlatform()) return '';
    try {
      const r = await NativeBiometric.isAvailable();
      if (!r.isAvailable) return '';
      switch (r.biometryType) {
        case BiometryType.FACE_ID: return 'Face ID';
        case BiometryType.TOUCH_ID: return 'Touch ID';
        case BiometryType.FINGERPRINT: return 'huella digital';
        case BiometryType.FACE_AUTHENTICATION: return 'reconocimiento facial';
        default: return 'biometría';
      }
    } catch { return ''; }
  }

  async hayCredencialesGuardadas(): Promise<boolean> {
    if (!Capacitor.isNativePlatform()) return false;
    try { return (await NativeBiometric.isCredentialsSaved({ server: this.server })).isSaved; }
    catch { return false; }
  }

  async guardar(cum: string, password: string): Promise<boolean> {
    try {
      await NativeBiometric.setCredentials({
        username: cum, password, server: this.server, accessControl: AccessControl.BIOMETRY_ANY,
      });
      return true;
    } catch { return false; }
  }

  /** Pide la biometría y devuelve las credenciales guardadas; null si se cancela o falla. */
  async obtener(): Promise<{ cum: string; password: string } | null> {
    try {
      // Las credenciales se guardaron con accessControl: se leen con getSecureCredentials,
      // que muestra Face ID / huella (getCredentials solo lee las no protegidas).
      const c = await NativeBiometric.getSecureCredentials({
        server: this.server,
        reason: 'Inicia sesión en Eventos Scouts',
        title: 'Iniciar sesión',
        negativeButtonText: 'Cancelar',
      });
      return { cum: c.username, password: c.password };
    } catch (e: any) {
      this.ultimoError = e?.message ?? String(e);
      return null;
    }
  }

  async borrar(): Promise<void> {
    try { await NativeBiometric.deleteCredentials({ server: this.server }); } catch { /* nada guardado */ }
  }

  /** El usuario dijo "No, gracias": no volver a preguntar hasta que lo active a mano. */
  yaRechazo(): boolean { try { return localStorage.getItem(this.claveRechazo) === '1'; } catch { return false; } }
  recordarRechazo(v: boolean): void { try { v ? localStorage.setItem(this.claveRechazo, '1') : localStorage.removeItem(this.claveRechazo); } catch { /* sin storage */ } }
}
