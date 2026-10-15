import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { Capacitor, PluginListenerHandle } from '@capacitor/core';
import { App } from '@capacitor/app';
import { LocalNotifications } from '@capacitor/local-notifications';

const ID_SESION = 801;        // aviso: la sesión está por cerrarse por inactividad
const ID_RESUMEN_AM = 802;    // aviso diario de la mañana (KPIs)
const ID_RESUMEN_PM = 803;    // aviso diario de la noche (KPIs)
const ID_KPIS = 804;          // resumen de KPIs que se reemplaza en cada actualización (se refleja en relojes con la app del reloj)
const ID_HITO = 805;          // aviso por hito de asistencia
const HITOS = [25, 50, 75, 100];   // % de asistencia sobre registros
const MIN_INACTIVIDAD = 45;   // AUTO_LOGOUT_INTERVAL_WAIT (43) + AUTO_LOGOUT_AVISO_ESPERA (2) de ShareDataService
const MIN_AVISO = 43;         // se avisa 2 min antes
const HORA_RESUMEN_AM = 9;    // 9:00 am
const HORA_RESUMEN_PM = 21;   // 9:00 pm
const ESTATUS_FIN = 15;       // idEstatusEvento >= 15: el evento ya no está vigente

/**
 * Notificaciones locales (no necesitan servidor), solo en la app nativa y con la sesión iniciada:
 *  - Sesión por caducar: si la app pasa a segundo plano se programa un aviso para los 43 min desde la última actividad
 *    (en segundo plano la app no corre). Al volver, ShareDataService revisa el tiempo y cierra la sesión si ya pasaron 45 min.
 *  - Resumen del día: recordatorios diarios a las 9 am y 9 pm que abren la pantalla de KPIs, solo mientras el
 *    evento elegido esté vigente (idEstatusEvento < 15). Se programan o cancelan cada vez que se cargan sus permisos.
 */
@Injectable({ providedIn: 'root' })
export class NotificacionesService {
  private activo = false;
  private permiso = false;
  private ultimaActividad: () => number = () => Date.now();
  private escuchas: Promise<PluginListenerHandle>[] = [];
  private ultimaHoraResumen = '';   // hora del reloj (fecha + hora) en que se publicó el último resumen

  constructor(private readonly router: Router) {}

  async iniciarSesion(ultimaActividad: () => number): Promise<void> {
    if (!Capacitor.isNativePlatform()) return;
    this.ultimaActividad = ultimaActividad;
    if (this.activo) return;
    this.activo = true;
    try {
      const permiso = await LocalNotifications.requestPermissions();
      this.permiso = permiso.display === 'granted';
      await this.limpiarObsoletas();
    } catch { /* sin permiso: la app funciona igual, solo sin avisos */ }

    this.escuchas = [
      LocalNotifications.addListener('localNotificationActionPerformed', e => {
        const ruta = e.notification.extra?.ruta;
        if (ruta) this.router.navigateByUrl(ruta);
      }),
      App.addListener('appStateChange', ({ isActive }) => isActive ? this.alVolver() : this.alIrseASegundoPlano()),
    ];
  }

  async cerrarSesion(): Promise<void> {
    if (!Capacitor.isNativePlatform()) return;
    this.activo = false;
    this.permiso = false;
    // solo los escuchas propios: removeAllListeners() también quitaría los del widget y de la sesión
    const escuchas = this.escuchas;
    this.escuchas = [];
    await Promise.all(escuchas.map(async h => (await h).remove()));
    try { await LocalNotifications.cancel({ notifications: [{ id: ID_SESION }, { id: ID_RESUMEN_AM }, { id: ID_RESUMEN_PM }, { id: ID_KPIS }, { id: ID_HITO }] }); } catch { /* nada */ }
    this.ultimaHoraResumen = '';
  }

  /** Cancela avisos que dejó programados una versión anterior de la app (cualquier id que no sea de los actuales). */
  private async limpiarObsoletas(): Promise<void> {
    const vigentes = [ID_SESION, ID_RESUMEN_AM, ID_RESUMEN_PM, ID_KPIS, ID_HITO];
    const { notifications } = await LocalNotifications.getPending();
    const viejas = notifications.filter(n => !vigentes.includes(n.id)).map(n => ({ id: n.id }));
    if (viejas.length > 0) await LocalNotifications.cancel({ notifications: viejas });
  }

  /** Se llama con el estatus del evento elegido: programa los avisos diarios si está vigente y los cancela si no. */
  async actualizarResumen(idEstatusEvento: number): Promise<void> {
    if (!Capacitor.isNativePlatform() || !this.activo || !this.permiso) return;
    try {
      if (idEstatusEvento < ESTATUS_FIN) await this.programarResumen();
      else await LocalNotifications.cancel({ notifications: [{ id: ID_RESUMEN_AM }, { id: ID_RESUMEN_PM }] });
    } catch { /* nada */ }
  }

  /**
   * Publica los KPIs como notificación para verlos en el reloj (Huawei Health, etc. reenvía las notificaciones del teléfono):
   *  - un resumen con id fijo, que reemplaza al anterior, una vez por cada hora del reloj (5:00, 6:00…; ResumenWidgetService
   *    llama en punto) o siempre, si se pide con `forzar`, como al tocar Recargar en KPIs;
   *  - un aviso aparte al cruzar 25, 50, 75 y 100 % de asistencia (la primera vez solo se guarda el punto de partida).
   * Solo se llama con la app abierta: sin servidor de push el sistema no la deja actualizar en segundo plano.
   */
  async publicarKpis(macro: string, k: { asistencia: number; registros: number; kitEntregados: number; kitIncluye: number; comidasEntregadas: number }, forzar = false): Promise<void> {
    if (!Capacitor.isNativePlatform() || !this.activo || !this.permiso) return;
    const n = (v: number) => v.toLocaleString('es-MX');
    const texto = `Asistencia ${n(k.asistencia)} de ${n(k.registros)} · Kits ${n(k.kitEntregados)} de ${n(k.kitIncluye)} · Comidas ${n(k.comidasEntregadas)}`;
    const ahora = new Date();
    const hora = `${ahora.toDateString()} ${ahora.getHours()}`;
    const pronto = () => ({ at: new Date(ahora.getTime() + 1000) });
    try {
      if (forzar || hora !== this.ultimaHoraResumen) {
        this.ultimaHoraResumen = hora;
        await LocalNotifications.schedule({ notifications: [{ id: ID_KPIS, title: macro || 'Eventos Scouts', body: texto, schedule: pronto(), extra: { ruta: '/Kpis' } }] });
      }
      const pct = k.registros > 0 ? Math.floor(k.asistencia * 100 / k.registros) : 0;
      const hito = Math.max(0, ...HITOS.filter(h => pct >= h));
      const clave = `kpiHito:${macro}`;
      const previo = localStorage.getItem(clave);
      if (previo === null) { localStorage.setItem(clave, String(hito)); return; }
      if (hito > Number(previo)) {
        localStorage.setItem(clave, String(hito));
        await LocalNotifications.schedule({ notifications: [{ id: ID_HITO, title: `Asistencia al ${hito} %`, body: texto, schedule: pronto(), extra: { ruta: '/Kpis' } }] });
      }
    } catch { /* sin permiso o sin almacenamiento */ }
  }

  private async programarResumen(): Promise<void> {
    const aviso = (id: number, hour: number, title: string, body: string) => ({
      id, title, body, schedule: { on: { hour, minute: 0 }, allowWhileIdle: true }, extra: { ruta: '/Kpis' },
    });
    await LocalNotifications.schedule({ notifications: [
      aviso(ID_RESUMEN_AM, HORA_RESUMEN_AM, 'Buenos días', 'Revisa los indicadores del evento: asistencia, kits y comidas.'),
      aviso(ID_RESUMEN_PM, HORA_RESUMEN_PM, 'Resumen del día', 'Revisa cómo cerró la jornada: asistencia, kits y comidas.'),
    ] });
  }

  private async alIrseASegundoPlano(): Promise<void> {
    const avisoEn = this.ultimaActividad() + MIN_AVISO * 60000;
    if (avisoEn <= Date.now()) return;   // ya pasó: el aviso de la app está en pantalla
    try {
      await LocalNotifications.schedule({ notifications: [{
        id: ID_SESION,
        title: 'Tu sesión está por cerrarse',
        body: `Por inactividad se cerrará en ${MIN_INACTIVIDAD - MIN_AVISO} min. Abre la app para continuar.`,
        schedule: { at: new Date(avisoEn), allowWhileIdle: true },
      }] });
    } catch { /* sin permiso */ }
  }

  private async alVolver(): Promise<void> {
    try { await LocalNotifications.cancel({ notifications: [{ id: ID_SESION }] }); } catch { /* nada */ }
  }
}
