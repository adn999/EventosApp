import { Router } from '@angular/router';
import { Capacitor } from '@capacitor/core';
import { Dialog } from '@capacitor/dialog';
import { ToastrService } from 'ngx-toastr';
import Swal from 'sweetalert2';
import { DbservicesService } from './dbservices.service';
import { MotivoCierre, SesionGuardadaService } from './sesion-guardada.service';
import { ShareDataService } from './shared-data.service';

/** true si el JWT trae fecha de expiración y ya pasó (si no se puede leer, se deja que el servidor decida). */
function jwtVencido(jwt: string): boolean {
  try {
    const exp = JSON.parse(atob(jwt.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))).exp;
    return typeof exp === 'number' && exp * 1000 <= Date.now();
  } catch { return false; }
}

const minutos = (ms: number) => Math.round(ms / 60000);

function avisarCierre(motivo: MotivoCierre): void {
  const texto = motivo === 'inactividad'
    ? 'Pasaron más de 45 minutos sin usar la app. Vuelve a iniciar sesión para continuar.'
    : 'Tu sesión expiró. Vuelve a iniciar sesión para continuar.';
  // En la app, alerta nativa del sistema (vidrio de iOS 27 / Material en Android); en el navegador, SweetAlert
  const nativa = () => Dialog.alert({ title: 'Se cerró tu sesión', message: texto, buttonTitle: 'Entendido' });
  const web = () => Swal.fire({ title: 'Se cerró tu sesión', text: texto, icon: 'info', confirmButtonText: 'Entendido' });
  setTimeout(() => Capacitor.isNativePlatform() ? nativa().catch(web) : web(), 800);
}

/**
 * APP_INITIALIZER: antes de mostrar la primera pantalla, recupera la sesión si la app (o su WebView) se cerró sin
 * que el usuario saliera: iOS/Android la terminan por memoria en segundo plano, o el usuario la deslizó para cerrarla.
 * Solo se recupera si no pasó el límite de inactividad; también registra en la bitácora cómo terminó la ejecución anterior.
 */
export function restaurarSesion(shared: ShareDataService, db: DbservicesService, sesion: SesionGuardadaService,
                                router: Router, toastr: ToastrService): () => Promise<void> {
  return async () => {
    const previo = sesion.estado;
    const motivo = sesion.tomarMotivo();
    const u = await sesion.leer();
    if (!u) {
      sesion.anotar('Arranque sin sesión');
      if (motivo) avisarCierre(motivo);
      return;
    }

    const ahora = Date.now();
    const plano = previo?.plano === 'fondo' ? 'en segundo plano' : 'en primer plano';
    sesion.anotar(`La app se había cerrado sin salir de la sesión (estaba ${plano}; última señal hace ${minutos(ahora - (previo?.t ?? ahora))} min)`);

    const inactivo = ahora - sesion.ultimaActividad;
    const cierre: MotivoCierre | null = !sesion.ultimaActividad || inactivo >= shared.LIMITE_INACTIVIDAD ? 'inactividad'
                                      : jwtVencido(u.tokenjwt) ? 'expirada' : null;
    if (cierre) {
      sesion.anotar(`No se recupera la sesión: ${cierre === 'inactividad' ? `${minutos(inactivo)} min sin uso` : 'token vencido'}`);
      shared.setStatus({ idUsuario: '', cum: '', nombre: '', email: '', password: '', token: '', tokenjwt: '' });
      avisarCierre(cierre);
      return;
    }

    const macroEvento = sesion.macroEvento;
    const ruta = sesion.ruta;
    shared.setStatus(u, sesion.ultimaActividad);
    sesion.anotar(`Sesión recuperada (${minutos(inactivo)} min desde la última actividad)`);
    db.getVistaConsultaMiembros(u.cum, u.token, u.tokenjwt).subscribe(r => shared.setCatalogosPermisos(r));
    if (macroEvento) {
      shared.setUserMacroEvento(macroEvento);
      db.getVistaMacroEventosbyCUM(u.cum, macroEvento, u.token, u.tokenjwt).subscribe(p => {
        shared.setEventoPermisos(p);
        if (ruta && ruta !== '/' && ruta !== '/home') router.navigateByUrl(ruta);
      });
    }
    setTimeout(() => toastr.info('El sistema cerró la app mientras no la usabas; se recuperó tu sesión.', 'La app se reinició'), 800);
  };
}
