import { reproducir } from 'src/app/services/haptica';
import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { Subscription, filter } from 'rxjs';
import { PluginListenerHandle } from '@capacitor/core';
import { NativeTabBar, TabEntry } from 'src/app/services/native-tabbar';
import { Capacitor } from '@capacitor/core';
import { VistaLoginModel } from 'src/app/models/VistaLoginModel';
import { ShareDataService } from 'src/app/services/shared-data.service';
import { ResumenWidgetService } from 'src/app/services/resumen-widget.service';
import { transition, trigger, useAnimation } from '@angular/animations';
import {  transitionRotateRight, transitionRotateLeft } from '../animation';

@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.css'],
  animations:[trigger('triggLeft', [ transition('0 => 1', [ useAnimation(transitionRotateLeft) ]),  ]),
  trigger('triggRight', [transition('1 => 0',[ useAnimation(transitionRotateRight) ]),  ]),]
})


export class NavbarComponent implements OnInit, OnDestroy {
  localUser!:VistaLoginModel;

  // Teléfono (iPhone/Android): menú en barra de pestañas inferior + panel "Más" (la clase la pone main.ts)
  readonly esTelefono = document.documentElement.classList.contains('es-telefono');
  readonly esTablet = document.documentElement.classList.contains('es-tablet');   // iPad / tableta Android: dock más ancho
  masAbierto = false;
  private static instancias = 0;

  // iOS: el menú puede ser la barra nativa (UITabBar, Liquid Glass) o el dock clásico de la web. Se elige en "Más"
  // y se recuerda en localStorage ('menuNativo' = '0' → clásico). Por defecto, nativo.
  static readonly esIOS = Capacitor.getPlatform() === 'ios';
  static nativo = NavbarComponent.esIOS && NavbarComponent.leerPreferencia();
  readonly esIOS = NavbarComponent.esIOS;
  get usaNativo(): boolean { return NavbarComponent.nativo; }
  private static leerPreferencia(): boolean {
    try { return localStorage.getItem('menuNativo') !== '0'; } catch { return true; }
  }
  private static readonly sfIcono: Record<string, string> = {
    '/home':'tent', '/RegistroEvento':'square.and.pencil', '/ConsultaPulsera':'magnifyingglass', '/Kit':'cart',
    '/Salud':'cross.case', '/Kpis':'chart.pie', '/RegistroComida':'fork.knife', '/EntradaSalida':'signpost.right',
    '/PulseraPerdida':'scissors', '/Menores':'figure.child', '/ProtectMem':'shield', '/ReportePM':'chart.bar',
    '/ComidaHorario':'clock', '/ComidaEvento':'takeoutbag.and.cup.and.straw',
  };
  private escuchaNativa?: Promise<PluginListenerHandle>;
  private navSub?: Subscription;
  readonly opcionesTabbar = [
    { texto:'Inicio',   ruta:'/home',            icono:'fa-campground', color:'rgb(73, 64, 134)' },
    { texto:'Registro', ruta:'/RegistroEvento',  icono:'fa-feather',    color:'rgb(78, 97, 41)' },
    { texto:'Consulta', ruta:'/ConsultaPulsera', icono:'fa-binoculars', color:'rgb(89, 192, 171)' },
    { texto:'Kit',      ruta:'/Kit',             icono:'fa-shopping-cart', color:'rgb(52, 125, 95)' },
    { texto:'Salud',    ruta:'/Salud',           icono:'fa-medkit',     color:'rgb(19, 86, 124)' },
    { texto:'KPIs',     ruta:'/Kpis',            icono:'fa-chart-pie',  color:'rgb(42, 165, 187)' },
  ];
  readonly opcionesMas = [
    { texto:'Comida',              ruta:'/RegistroComida',icono:'fa-utensils',      color:'rgb(175, 89, 28)' },
    { texto:'Check In-Out',        ruta:'/EntradaSalida', icono:'fa-map-signs',     color:'rgb(82, 56, 85)' },
    { texto:'Reposición',          ruta:'/PulseraPerdida',icono:'fa-cut',           color:'rgb(87, 33, 6)' },
    { texto:'Menores',             ruta:'/Menores',       icono:'fa-child',         color:'rgb(163, 39, 163)' },
    { texto:'Protec. Membresía',   ruta:'/ProtectMem',    icono:'fa-shield-alt',    color:'rgb(163, 39, 163)' },
    { texto:'Reporte Protec. Mem.',ruta:'/ReportePM',     icono:'fa-chart-bar',     color:'rgb(191, 142, 191)' },
    { texto:'Comida Horario',      ruta:'/ComidaHorario', icono:'fa-clock',         color:'rgb(44, 113, 218)' },
    { texto:'Comida Evento',       ruta:'/ComidaEvento',  icono:'fa-hamburger',     color:'rgb(196, 143, 63)' },
  ];

  // Qué iconos caben en el dock. Teléfono y tableta: los que quepan + "Más" + "Salir". Tableta: los principales que quepan a lo ancho + "Más" +
  // "Salir" (siempre la última opción). Menores, Protección, Reporte PM y las dos Comida-horario/evento van siempre en "Más".
  dockItems: { texto:string, ruta:string, icono:string, color:string }[] = this.opcionesTabbar;
  panelItems: { texto:string, ruta:string, icono:string, color:string }[] = this.opcionesMas;
  mostrarMas = true;
  salirEnDock = false;

  // Tableta: los iconos no llevan texto; al tocar uno se muestra su nombre unos instantes
  etiquetaActiva = '';
  private temporizadorEtiqueta?: ReturnType<typeof setTimeout>;
  mostrarEtiqueta(texto: string): void {
    if (!this.esTablet) return;
    this.etiquetaActiva = texto;
    clearTimeout(this.temporizadorEtiqueta);
    this.temporizadorEtiqueta = setTimeout(() => this.etiquetaActiva = '', 1600);
  }

  @HostListener('window:resize')
  calcularDock(): void {
    if (!this.esTelefono) return;
    // Teléfono (iPhone y Android): Inicio es el primer icono del dock; el dock ocupa todo el ancho en vertical
    // y la mitad en horizontal, y el tamaño del mosaico se ajusta para que quepan todos junto a "Más" y "Salir".
    // Si quedarían demasiado pequeños, los últimos pasan a "Más".
    if (!this.esTablet) {
      const op = (ruta: string) => this.opcionesTabbar.find(o => o.ruta === ruta)!;
      const lista = ['/home', '/RegistroEvento', '/ConsultaPulsera', '/Kit', '/Kpis'];   // Salud va en "Más"
      // clientWidth: ancho visible. innerWidth crece si algo de la página se desborda (p. ej. un .row de Bootstrap
      // fuera de .container en Consulta) y el dock se calculaba más ancho que la pantalla
      const ancho = document.documentElement.clientWidth || window.innerWidth;
      const horizontal = ancho > window.innerHeight;
      let n = lista.length, tile = 46;
      const medir = () => {
        const huecos = n + 2;                                  // iconos + "Más" + "Salir"
        // vertical: de borde a borde; horizontal: la mitad del ancho. Mosaicos lo más grandes posible (máx. 54 px)
        const anchoDock = horizontal ? ancho / 2 : ancho - 12;
        tile = Math.min(54, Math.floor((anchoDock - 20 - (huecos - 1) * 6) / huecos));
      };
      medir();
      while (tile < 38 && n > 2) { n--; medir(); }
      const raiz = document.documentElement.style;
      raiz.setProperty('--dock-tile', tile + 'px');
      raiz.setProperty('--dock-gap', '6px');                   // separación mínima; el resto se reparte con space-between
      raiz.setProperty('--dock-icon', Math.round(tile * 0.52) + 'px');
      document.documentElement.classList.add('dock-ancho');
      document.documentElement.classList.toggle('dock-mitad', horizontal);   // en horizontal solo la mitad central
      this.salirEnDock = true;
      this.mostrarMas = true;
      this.dockItems = lista.slice(0, n).map(op);
      this.panelItems = [...lista.slice(n).map(op), op('/Salud'), ...this.opcionesMas];
      return;
    }
    // Tableta: los iconos principales que quepan a lo ancho (mosaico 56 + separación 10), luego "Más" y "Salir"
    // (siempre al final). Estas opciones van siempre dentro de "Más", aunque sobre espacio.
    const cabe = Math.floor((window.innerWidth - 16 - 28 + 10) / 66);   // menos margen del dock y su relleno
    const siempreEnMas = ['/Menores', '/ProtectMem', '/ReportePM', '/ComidaHorario', '/ComidaEvento'];
    const principales = [...this.opcionesTabbar, ...this.opcionesMas.filter(o => !siempreEnMas.includes(o.ruta))];
    const fijasEnMas = this.opcionesMas.filter(o => siempreEnMas.includes(o.ruta));
    const n = Math.max(Math.min(principales.length, cabe - 2), 1);   // deja sitio para "Más" y "Salir"
    this.salirEnDock = true;
    this.mostrarMas = true;
    this.dockItems = principales.slice(0, n);
    this.panelItems = [...principales.slice(n), ...fijasEnMas];      // lo que no cabe + las fijas
  }

  // ── Barra nativa de iOS ──
  private idRutaActual(): string {
    const url = this.router.url.split('?')[0];
    const todas = [...this.opcionesTabbar, ...this.opcionesMas];
    return todas.find(o => url === o.ruta || url.startsWith(o.ruta + '/'))?.ruta ?? '';
  }

  // iPad: barra lateral nativa en vez de pestañas abajo (iPadOS 26/27). Para volver a las pestañas, poner false.
  static readonly LATERAL_EN_IPAD = true;
  private escuchaAncho?: Promise<PluginListenerHandle>;

  private mostrarNativa(): void {
    const entrada = (o: { texto: string, ruta: string, color: string }): TabEntry =>
      ({ id: o.ruta, title: o.texto, icon: NavbarComponent.sfIcono[o.ruta] ?? 'circle', color: o.color });
    const sistema: TabEntry[] = [
      { id: 'salir', title: 'Salir', icon: 'lock.open', color: 'rgb(173, 69, 21)' },
      { id: 'clasico', title: 'Usar menú clásico', icon: 'arrow.uturn.backward' }];
    const lateral = this.esTablet && NavbarComponent.LATERAL_EN_IPAD;
    document.documentElement.classList.toggle('barra-lateral', lateral);
    if (lateral) {
      // todas las opciones en la barra lateral; Salir y menú clásico abajo
      NativeTabBar.show({ items: [...this.opcionesTabbar, ...this.opcionesMas].map(entrada), more: sistema, selected: this.idRutaActual(), lateral: true })
        .then(r => this.anchoLateral(r.width))
        .catch(() => { NavbarComponent.nativo = false; document.documentElement.classList.remove('barra-lateral'); });
      return;
    }
    // iPhone: 5 pestañas + Más (como el dock clásico: Inicio, Registro, Consulta, Kit, KPIs). iPad: caben más (hasta 7) + Más.
    // Menores, Protección, Reporte PM y Comida horario/evento siempre en "Más" en iPad.
    const op = (ruta: string) => this.opcionesTabbar.find(o => o.ruta === ruta)!;
    const principales = this.esTablet ? [...this.opcionesTabbar, ...this.opcionesMas.slice(0, 3)]
      : ['/home', '/RegistroEvento', '/ConsultaPulsera', '/Kit', '/Kpis'].map(op);
    const n = this.esTablet ? 7 : 5;
    const fijas = this.opcionesMas.slice(3);
    const resto = this.esTablet ? [...principales.slice(n), ...fijas]
      : [op('/Salud'), ...this.opcionesMas];
    const more: TabEntry[] = [...resto.map(entrada), ...sistema];
    NativeTabBar.show({ items: principales.slice(0, n).map(entrada), more, selected: this.idRutaActual() })
      .then(r => document.documentElement.style.setProperty('--tabbar-nativo', Math.ceil(r.height) + 'px'))
      .catch(() => { /* el plugin no está en este build: se queda el dock web */ NavbarComponent.nativo = false; });
  }

  private anchoLateral(px: number): void {
    const raiz = document.documentElement.style;
    raiz.setProperty('--lateral-nativo', Math.ceil(px) + 'px');
    raiz.setProperty('--tabbar-nativo', '0px');
  }

  private alTocarNativa(id: string): void {
    this.playAudio('click');
    if (id === 'salir') this.closeSesion();
    else if (id === 'clasico') this.cambiarMenu(false);
    else this.router.navigateByUrl(id);
  }

  /** Alterna entre la barra nativa de iOS y el dock clásico (sin recargar la página, para no perder la sesión). */
  cambiarMenu(nativo: boolean): void {
    NavbarComponent.nativo = nativo;
    try { localStorage.setItem('menuNativo', nativo ? '1' : '0'); } catch { /* sin storage */ }
    document.documentElement.classList.toggle('menu-nativo', nativo);
    this.masAbierto = false;
    if (nativo) this.mostrarNativa(); else { NativeTabBar.hide(); document.documentElement.classList.remove('barra-lateral'); }
  }

  itemsMenu=[0,0,0,0,0,0,0,0,0,0];
  itemsMenuOff=[0,0,0,0,0,0,0,0,0,0];


  constructor(private readonly router: Router,
              private readonly sharedSvc: ShareDataService,
              private readonly resumenWidget: ResumenWidgetService){}

ngOnInit(): void {
  this.sharedSvc.currentStatu$.subscribe(respuesta=>{this.localUser=respuesta;});
  this.calcularDock();
  if (this.esTelefono && ++NavbarComponent.instancias === 1) document.body.classList.add('con-tabbar');
  if (NavbarComponent.esIOS) {
    document.documentElement.classList.toggle('menu-nativo', NavbarComponent.nativo);
    this.escuchaNativa = NativeTabBar.addListener('tabSelected', e => this.alTocarNativa(e.id));
    this.escuchaAncho = NativeTabBar.addListener('anchoLateral', e => this.anchoLateral(e.width));
    this.navSub = this.router.events.pipe(filter(e => e instanceof NavigationEnd)).subscribe(() => {
      if (NavbarComponent.nativo) NativeTabBar.select({ id: this.idRutaActual() });
    });
    if (NavbarComponent.nativo) this.mostrarNativa();
  }
}

ngOnDestroy(): void {
  // Cada página trae su propio navbar: la clase se quita solo cuando ya no queda ninguno
  if (this.esTelefono && --NavbarComponent.instancias === 0) document.body.classList.remove('con-tabbar');
  this.navSub?.unsubscribe();
  this.escuchaNativa?.then(h => h.remove());
  this.escuchaAncho?.then(h => h.remove());
  // Cada página trae su navbar: se oculta la barra nativa solo si, tras el cambio de página, no quedó ninguno
  if (NavbarComponent.esIOS) setTimeout(() => { if (NavbarComponent.instancias === 0) NativeTabBar.hide(); }, 150);
}

  IrReactivo():void{
    this.router.navigate(['contacto-reactive'],{queryParams: {name:'nombre desde Pito Perez desde navigator'}}  );
  }

  IrPlantilla():void{
    this.router.navigate(['EncuestaSalida', this.localUser.idUsuario ] );
  }


  mouseOn(n:number):void{ setTimeout( () => { this.itemsMenu[n] = 1; this.cambioInic(n); }, 400); }
  cambioInic(n:number):void{setTimeout( () => { this.itemsMenu[n] = 0; },400);     }


  mouseOff(n:number):void{ setTimeout( () => { this.itemsMenuOff[n] = 1; this.cambioOff(n); },5); }
  cambioOff(n:number):void{setTimeout( () => { this.itemsMenuOff[n] = 0; },100);     }

  showExitVideo = false;
  isExitFading  = false;

  closeSesion(): void {
    this.showExitVideo = true;
  }

  onExitVideoTimeUpdate(video: HTMLVideoElement): void {
    if (!this.isExitFading && video.duration - video.currentTime <= 1.2) {
      this.isExitFading = true;
    }
  }

  onExitVideoEnded(): void {
    const userVacio: VistaLoginModel = { idUsuario: '', cum: '', nombre: '', email: '', password: '', token: '', tokenjwt: '' };
    this.resumenWidget.cerrarSesionReloj();
    this.sharedSvc.setStatus(userVacio);
    // La barra nativa vive fuera del WebView: recargar la página no la quita
    const recargar = () => { this.router.navigate(['home']); window.location.reload(); };
    if (NavbarComponent.esIOS) NativeTabBar.hide().then(recargar, recargar); else recargar();
  }



  playAudio(sonido:string){
    reproducir(sonido);
  }



}
