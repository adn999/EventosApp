import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { ShareDataService } from './shared-data.service';

const RUTAS: Record<string, string> = {
  consulta: '/ConsultaPulsera',
  registro: '/RegistroEvento',
  kit: '/Kit',
  kpis: '/Kpis',
};

/**
 * Enlaces profundos `eventosscouts://consulta | registro | kit | kpis` (widgets y control de iOS).
 * `eventosscouts://consulta?escanear=1` abre Consulta y lanza la cámara.
 * `eventosscouts://consulta?buscar=NAL2390004` abre Consulta y busca esa pulsera o CUM (atajo de Siri "Buscar pulsera").
 * Si no hay sesión iniciada, el destino se guarda y se abre al entrar.
 */
@Injectable({ providedIn: 'root' })
export class EnlacesService {
  private conSesion = false;
  private pendiente: string | null = null;

  constructor(private readonly router: Router, private readonly sharedSvc: ShareDataService) {}

  iniciar(): void {
    if (!Capacitor.isNativePlatform()) return;
    this.sharedSvc.currentStatu$.subscribe(u => {
      this.conSesion = u.cum.length > 0;
      if (this.conSesion && this.pendiente) {
        const destino = this.pendiente;
        this.pendiente = null;
        setTimeout(() => this.router.navigateByUrl(destino), 400);
      }
    });
    App.addListener('appUrlOpen', e => this.abrir(e.url));
    App.getLaunchUrl().then(l => { if (l?.url) this.abrir(l.url); }).catch(() => { /* sin enlace de arranque */ });
  }

  private abrir(url: string): void {
    const m = /^[a-z][a-z0-9+.-]*:\/\/([^/?#]+)(?:[^?#]*)(?:\?([^#]*))?/i.exec(url);
    const ruta = m && RUTAS[m[1].toLowerCase()];
    if (!ruta) return;
    const params = new URLSearchParams(m![2] ?? '');
    const buscar = (params.get('buscar') ?? '').replace(/[^A-Za-z0-9]/g, '').toUpperCase();   // sin espacios ni guiones del dictado
    const destino = buscar ? `${ruta}?buscar=${encodeURIComponent(buscar)}`
                  : params.get('escanear') === '1' ? `${ruta}?escanear=1` : ruta;
    if (this.conSesion) this.router.navigateByUrl(destino); else this.pendiente = destino;
  }
}
