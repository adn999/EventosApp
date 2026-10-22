import { Injectable, NgZone } from '@angular/core';
import { Router } from '@angular/router';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import Swal from 'sweetalert2';

/** El login y el inicio viven en /home: desde ahí "atrás" ya no tiene a dónde regresar. */
const RAIZ = /^\/(home)?([?#]|$)/i;

/**
 * Botón / gesto "atrás" de Android. Sin este manejador Capacitor regresa en el historial del WebView
 * y, cuando ya no queda historial, cierra la app.
 * Orden: cerrar lo que esté encima (aviso, menú o lista de Material, panel "Más") → regresar de pantalla
 * → en el inicio, mandar la app al fondo (como cualquier app de Android) sin cerrarla.
 */
@Injectable({ providedIn: 'root' })
export class BotonAtrasService {
  constructor(private readonly router: Router, private readonly zone: NgZone) {}

  iniciar(): void {
    if (Capacitor.getPlatform() !== 'android') return;
    App.addListener('backButton', ({ canGoBack }) => this.zone.run(() => this.atras(canGoBack)));
  }

  private atras(canGoBack: boolean): void {
    if (document.querySelector('.exit-video-overlay')) return;   // cerrando sesión: se deja terminar el video
    if (Swal.isVisible()) { Swal.close(); return; }
    // mat-menu, mat-select y diálogos se cierran al tocar su fondo
    const encima = document.querySelector<HTMLElement>('.cdk-overlay-backdrop') ?? document.querySelector<HTMLElement>('.mas-fondo');
    if (encima) { encima.click(); return; }
    if (RAIZ.test(this.router.url)) { App.minimizeApp(); return; }
    if (canGoBack) history.back(); else this.router.navigateByUrl('/home');
  }
}
