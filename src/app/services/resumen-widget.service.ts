import { Injectable } from '@angular/core';
import { Capacitor, registerPlugin } from '@capacitor/core';
import { App } from '@capacitor/app';
import { combineLatest, forkJoin, catchError, of } from 'rxjs';
import { DbservicesService } from './dbservices.service';
import { ShareDataService } from './shared-data.service';
import { NotificacionesService } from './notificaciones.service';
import { SpinnerService } from 'src/app/components/spinner/spinner.service';
import { reporteDiaDBModel } from 'src/app/models/reporteDiaDBModel';
import { VistaLoginModel } from 'src/app/models/VistaLoginModel';

/** Puente al plugin nativo ResumenWidget (Swift en iOS, Java en Android): deja los totales donde los lee el widget. */
const ResumenWidget = registerPlugin<{
  guardar(o: { macroEvento: string; asistencia: number; registros: number; kitEntregados: number; kitIncluye: number;
               comidasEntregadas: number; comidas: number }): Promise<void>;
  guardarDia(o: { macroEvento: string; dias: { dia: string; total: number }[] }): Promise<void>;
  limpiar(): Promise<void>;
}>('ResumenWidget');

/** Puente al plugin nativo SesionReloj (solo iOS): pasa la sesión a la app del Apple Watch, que consulta los KPIs por su cuenta. */
const SesionReloj = registerPlugin<{
  enviar(o: { jwt: string; token: string; macroEvento: string; api: string }): Promise<void>;
  borrar(): Promise<void>;
}>('SesionReloj');

const CADA_MIN = 10;
const MS_TRAS_EN_PUNTO = 2000;   // margen para que el reloj ya marque la nueva hora

/**
 * Mantiene al día los KPIs del widget de iOS y de Android: consulta los mismos reportes que la pantalla de KPIs al iniciar sesión,
 * al abrir o dejar la app, cada 10 min y en cada hora en punto (para la notificación de KPIs) mientras está abierta.
 * Al cerrar sesión borra los números del widget.
 * El widget solo recibe totales (nunca el token ni datos de personas). La app del Apple Watch sí recibe la sesión para consultar
 * por su cuenta; se le borra al cerrar sesión desde el menú (no al cerrarse por inactividad: sigue hasta que caduque el JWT).
 */
@Injectable({ providedIn: 'root' })
export class ResumenWidgetService {
  private usuario: VistaLoginModel | null = null;
  private macroEvento = '';
  private enCurso = false;
  private temporizador?: ReturnType<typeof setInterval>;
  private enPunto?: ReturnType<typeof setTimeout>;

  constructor(private readonly dbSvc: DbservicesService,
              private readonly sharedSvc: ShareDataService,
              private readonly spinSvc: SpinnerService,
              private readonly notifSvc: NotificacionesService) {}

  iniciar(): void {
    if (!Capacitor.isNativePlatform()) return;   // iPhone, iPad y Android (widget de cada uno)
    combineLatest([this.sharedSvc.currentStatu$, this.sharedSvc.currentUserMacroEvento$]).subscribe(([u, m]) => {
      this.usuario = u; this.macroEvento = m;
      if (u.cum.length === 0) {
        clearInterval(this.temporizador); this.temporizador = undefined;
        clearTimeout(this.enPunto); this.enPunto = undefined;
        ResumenWidget.limpiar().catch(() => { /* plugin ausente */ });
      } else if (m.length > 0) {
        if (Capacitor.getPlatform() === 'ios') {
          SesionReloj.enviar({ jwt: u.tokenjwt, token: u.token, macroEvento: m, api: this.dbSvc.rutaApi() }).catch(() => { /* plugin ausente */ });
        }
        this.actualizar();
        this.temporizador ??= setInterval(() => this.actualizar(), CADA_MIN * 60000);
        if (!this.enPunto) this.programarEnPunto();
      }
    });
    App.addListener('appStateChange', () => this.actualizar());   // al abrir y al dejar la app
  }

  /** Cierre de sesión hecho por el usuario: el Apple Watch borra la sesión y deja de consultar. */
  cerrarSesionReloj(): void {
    if (Capacitor.getPlatform() === 'ios') SesionReloj.borrar().catch(() => { /* plugin ausente */ });
  }

  /** Actualiza en la siguiente hora en punto (5:00, 6:00…) y se vuelve a programar; se recalcula cada vez para no desfasarse. */
  private programarEnPunto(): void {
    const ahora = new Date();
    const siguiente = new Date(ahora);
    siguiente.setHours(ahora.getHours() + 1, 0, 0, 0);
    this.enPunto = setTimeout(() => {
      this.actualizar();
      this.programarEnPunto();
    }, siguiente.getTime() - ahora.getTime() + MS_TRAS_EN_PUNTO);
  }

  private actualizar(): void {
    const u = this.usuario;
    if (!u || u.cum.length === 0 || !this.macroEvento || this.enCurso) return;
    this.enCurso = true;
    const macro = this.macroEvento;
    // Las consultas se lanzan al suscribirse: la bandera solo cubre ese instante, así que no afecta a otras llamadas
    this.spinSvc.silencioso = true;
    forkJoin([
      this.dbSvc.getReporteRegistros(macro, u.token, u.tokenjwt).pipe(catchError(() => of(null))),
      this.dbSvc.getReporteConteoComida(macro, u.tokenjwt).pipe(catchError(() => of(null))),
      this.dbSvc.getReporteDia(macro, u.token, u.tokenjwt).pipe(catchError(() => of(null))),
    ]).subscribe(([reg, com, dia]) => {
      this.enCurso = false;
      if (!reg || !com) return;                       // si falla una, el widget conserva los números anteriores
      ResumenWidget.guardar({
        macroEvento: macro,
        asistencia: reg.totalAsistencia, registros: reg.totalRegistros,
        kitEntregados: reg.totalEntregaKit, kitIncluye: reg.totalIncluyeKit,
        comidasEntregadas: com.comidasEntregadas, comidas: com.comidas,
      }).catch(() => { /* plugin ausente */ });
      this.notifSvc.publicarKpis(macro, { asistencia: reg.totalAsistencia, registros: reg.totalRegistros,
        kitEntregados: reg.totalEntregaKit, kitIncluye: reg.totalIncluyeKit, comidasEntregadas: com.comidasEntregadas });
      if (dia) this.guardarDia(macro, dia);
    });
    this.spinSvc.silencioso = false;
  }

  /** Agrupa el reporte (día y hora) en bloques de 12 h: AM (0-11) y PM (12-23); sin hora reconocible deja la fila tal cual. */
  private guardarDia(macro: string, filas: reporteDiaDBModel[]): void {
    const porBloque = new Map<string, number>();
    for (const f of filas) {
      const hora = /\d+/.exec(String(f.diaHora ?? ''));
      const pm = /pm/i.test(String(f.diaHora)) || (hora !== null && Number(hora[0]) >= 12 && !/am/i.test(String(f.diaHora)));
      const etiqueta = hora === null ? `${f.dia.slice(0, 3)} ${f.diaHora ?? ''}`.trim() : `${f.dia.slice(0, 3)} ${pm ? 'PM' : 'AM'}`;
      porBloque.set(etiqueta, (porBloque.get(etiqueta) ?? 0) + f.total);
    }
    const dias = [...porBloque].map(([dia, total]) => ({ dia, total }));
    ResumenWidget.guardarDia({ macroEvento: macro, dias }).catch(() => { /* plugin ausente */ });
  }
}
