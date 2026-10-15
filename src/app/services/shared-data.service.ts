import { Injectable } from '@angular/core';
import { respuestaModel } from '../models/respuestaModel';
import { BehaviorSubject, Observable, filter } from 'rxjs';
import { VistaLoginModel } from '../models/VistaLoginModel';
import { NavigationEnd, Router } from '@angular/router';
import { Capacitor, PluginListenerHandle } from '@capacitor/core';
import { App } from '@capacitor/app';
import Swal from 'sweetalert2';
import { VistaMacroEventosbyCUM } from '../models/VistaMacroEventosbyCUM';
import { VistaConsultaMiembros } from '../models/VistaConsultaMiembros';
import { NotificacionesService } from './notificaciones.service';
import { SesionGuardadaService } from './sesion-guardada.service';


const respuestaInicial:respuestaModel={ id:0, id_pregunta:0,   isRequired:0, tipoReactivo:0, respuesta:'', cum:'' }
const userSession:VistaLoginModel={ idUsuario:'',cum:'', nombre:'',email:'', password:'', token:'', tokenjwt:'' };

const userEventoPermisos:VistaMacroEventosbyCUM={macroEvento:'', idEvento:0,idEstatusEvento:0,cum:'',idUsuario:'', 
                                                 asistencia:false, entregaKit:false,comidas:false,fichaSalud:false,protectMem:false  };
const userCatalogosPermisos:VistaConsultaMiembros={ cum:'', cargos:'' };

const userMacroEvento:string='';


@Injectable({  providedIn: 'root' })

export class ShareDataService {


  minutesToMilliseconds = (minutes: number) => minutes * 60000;
  AUTO_LOGOUT_INTERVAL_WAIT = this.minutesToMilliseconds(43);//minutos de inactividad antes de advertir (la sesión se cierra a los 45)
  AUTO_LOGOUT_AVISO_ESPERA = this.minutesToMilliseconds(2);//tiempo para responder al aviso: 43 + 2 = 45 min
  readonly LIMITE_INACTIVIDAD = this.AUTO_LOGOUT_INTERVAL_WAIT + this.AUTO_LOGOUT_AVISO_ESPERA;

  // La inactividad se mide con la hora de la última interacción (no con un temporizador que corre), así sigue siendo
  // correcta aunque iOS congele la app en segundo plano o la cierre y se recupere la sesión guardada.
  private ultimaActividad = Date.now();
  private ultimoGuardado = 0;
  private temporizador?: ReturnType<typeof setTimeout>;
  private avisoAbierto = false;
  private cerrando = false;
  private escuchando = false;
  private estadoApp?: Promise<PluginListenerHandle>;


  constructor(private readonly router:Router, private readonly notifs:NotificacionesService,
              private readonly sesion:SesionGuardadaService)
  {
    // pantalla actual, para regresar a ella si el sistema cierra la app
    this.router.events.pipe(filter(e => e instanceof NavigationEnd)).subscribe(e =>
      { if(this.LoginStatus$.value.cum.length>0){ this.sesion.ruta=(e as NavigationEnd).urlAfterRedirects; } });
   }

  private LoginStatus$= new BehaviorSubject<VistaLoginModel>(userSession);

  //devuelve el subject privado pregunta$ como un observable
  get currentStatu$():Observable<VistaLoginModel>{return this.LoginStatus$.asObservable();}

  //función que recibe valor y lo asigna al subjectBehavior que recibe un elem tipo string
  //setStatusJwt(item:VistaLoginModel):void
  //{ this.LoginStatus$.next(item); 
  //  if(item.cum.length>0){this.initializeInactiveListener(); }
  //}

  //función que recibe valor y lo asigna al subjectBehavior que recibe un elem tipo string
  //ultimaActividad: al recuperar una sesión guardada, la hora de la última interacción antes de que se cerrara la app
  setStatus(item:VistaLoginModel, ultimaActividad:number=Date.now()):void
  { this.LoginStatus$.next(item); 
    if(item.cum.length>0)
    {
      this.ultimaActividad=ultimaActividad;
      this.sesion.ultimaActividad=ultimaActividad;
      this.sesion.guardar(item);
      this.sesion.estado={ sesion:true, plano:'frente', t:Date.now() };
      this.initializeInactiveListener();
      this.notifs.iniciarSesion(() => this.ultimaActividad);
    }
    else
    {
      clearTimeout(this.temporizador);
      this.estadoApp?.then(h => h.remove()); this.estadoApp=undefined;
      this.sesion.borrar();
      this.sesion.estado={ sesion:false, plano:'frente', t:Date.now() };
      this.sesion.anotar('Sesión cerrada');
      this.notifs.cerrarSesion();
    }
  }

  //sin respuesta al aviso o la app estuvo cerrada/en segundo plano más del límite: se cierra la sesión
  private cerrarPorInactividad():void
  {
    if(this.cerrando) return;
    this.cerrando=true;
    this.sesion.motivo='inactividad';
    this.sesion.anotar(`Cierre por inactividad (${Math.round((Date.now()-this.ultimaActividad)/60000)} min sin uso)`);
    this.salir();
  }

  private salir():void
  {
    const userVacio:VistaLoginModel={ idUsuario:'',cum:'', nombre:'',email:'', password:'', token:'',tokenjwt:'' };
    this.setStatus(userVacio);
    this.router.navigate(['home' ] );
    window.location.reload();//se recarga para que reinicie el contador
  }

   //observable para el MacroEvento Agrupador con el que se va a registrar
   private UserMacroEvento$= new BehaviorSubject<string>(userMacroEvento);
   get currentUserMacroEvento$():Observable<string> { return this.UserMacroEvento$.asObservable();  }
   setUserMacroEvento(item:string):void { this.UserMacroEvento$.next(item); this.sesion.macroEvento=item; } 
  //observable para los permisos del evento
  private EventoPermisos$= new BehaviorSubject<VistaMacroEventosbyCUM>(userEventoPermisos);
  get currentEventoPermisos$():Observable<VistaMacroEventosbyCUM> {  return this.EventoPermisos$.asObservable();  }
  setEventoPermisos(item:VistaMacroEventosbyCUM):void
  { this.EventoPermisos$.next(item);
    if(item.macroEvento.length>0){ this.notifs.actualizarResumen(item.idEstatusEvento); } } 

   //observable para los permisos de catalogos
   private CatalogosPermisos$= new BehaviorSubject<VistaConsultaMiembros>(userCatalogosPermisos);
   get currentCatalogosPermisos$():Observable<VistaConsultaMiembros> { return this.CatalogosPermisos$.asObservable();  }
   setCatalogosPermisos(item:VistaConsultaMiembros):void { this.CatalogosPermisos$.next(item);} 



  initializeInactiveListener(){
    this.cerrando=false;
    // Cuenta como actividad tocar, desplazar, escribir/escanear con teclado y mover el mouse.
    // Se registra una sola vez aunque se inicie sesión varias veces.
    if(!this.escuchando)
    {
      this.escuchando=true;
      ['pointerdown','touchstart','keydown','wheel','scroll','mousemove'].forEach(ev =>
        document.addEventListener(ev, this.registrarActividad, { capture:true, passive:true }));
    }
    // En la app nativa, al volver de segundo plano se revisa cuánto tiempo pasó sin uso
    if(Capacitor.isNativePlatform() && !this.estadoApp)
    {
      this.estadoApp=App.addListener('appStateChange', ({ isActive }) => {
        if(this.LoginStatus$.value.cum.length==0) return;
        this.sesion.estado={ sesion:true, plano:isActive?'frente':'fondo', t:Date.now() };
        this.sesion.anotar(isActive?'Vuelve a primer plano':'Pasa a segundo plano');
        if(isActive){ this.revisarInactividad(); }
        else{ this.sesion.ultimaActividad=this.ultimaActividad; }
      });
    }
    this.programar();
  }

  private registrarActividad = ():void => {
    if(this.avisoAbierto || this.LoginStatus$.value.cum.length==0) return;
    const ahora=Date.now();
    if(ahora-this.ultimaActividad<1000) return;
    this.ultimaActividad=ahora;
    // se guarda cada 30 s (y siempre al pasar a segundo plano) para no escribir en cada toque
    if(ahora-this.ultimoGuardado>30000){ this.sesion.ultimaActividad=ahora; this.ultimoGuardado=ahora; }
    this.programar();
  };

  private programar():void
  {
    clearTimeout(this.temporizador);
    const espera=this.ultimaActividad+this.AUTO_LOGOUT_INTERVAL_WAIT-Date.now();
    this.temporizador=setTimeout(() => this.revisarInactividad(), Math.max(0, espera));
  }

  private revisarInactividad():void
  {
    if(this.LoginStatus$.value.cum.length==0) return;
    const inactivo=Date.now()-this.ultimaActividad;
    if(inactivo>=this.LIMITE_INACTIVIDAD){ this.cerrarPorInactividad(); }
    else if(this.avisoAbierto){ return; }
    else if(inactivo>=this.AUTO_LOGOUT_INTERVAL_WAIT){ this.mostrarAviso(this.LIMITE_INACTIVIDAD-inactivo); }
    else{ this.programar(); }
  }

  private mostrarAviso(restante:number):void
  {
    this.avisoAbierto=true;
    // si la app pasa a segundo plano con el aviso abierto, al volver se revisa de nuevo con la hora real
    clearTimeout(this.temporizador);
    this.temporizador=setTimeout(() => this.revisarInactividad(), restante);
    Swal.fire({
      title: "No hay actividad detectada",
      text:"¿Desea salir del sitio?",
      icon:"question",
      iconColor:'purple',
      color: '#purple',
      //background: '#fff url(../../../assets/paper.jpg)',
      background:'rgba(255, 255, 255, 0.87)',
      backdrop: `rgba(0,0,123,0.4)`,
      showDenyButton: true,
     // showCancelButton: true,
      confirmButtonText: 'Salir',confirmButtonColor:'#CD6155',
      denyButtonText: 'Continuar',denyButtonColor:'#16A085',
      timer: restante, timerProgressBar: true   // sin respuesta, sale como con «Salir»
    }).then((result) => {
      this.avisoAbierto=false;
      if(this.cerrando) return;
      if (result.dismiss === Swal.DismissReason.timer) { this.cerrarPorInactividad(); }
      else if (result.isConfirmed) { this.sesion.anotar('Salir desde el aviso de inactividad'); this.salir(); }
      else {
        // «Continuar» o cerrar el aviso: el usuario está presente
        this.ultimaActividad=Date.now(); this.sesion.ultimaActividad=this.ultimaActividad;
        this.programar();
        if (result.isDenied) Swal.fire('La sesión continua...', '', 'info');
      }
    });
  }

  cleanComponentSubscriptions(){
      clearTimeout(this.temporizador);
  }
  // Limpiar la suscripción del timer cuando el componente se destruye
  ngOnDestroy(){
     this.cleanComponentSubscriptions();
  }




  

/*   //behaviorSubject almacena la ultima variable en cache de modo que al suscribirse, se obtiene su último valor
  private pregunta$=new BehaviorSubject<respuestaModel>(respuestaInicial);

  //es de tipo observable que devuelve un observable(subject), 
  get SelectedPregunta$():Observable<respuestaModel>
  { //devuelve el subject privado pregunta$ como un observable
     return this.pregunta$.asObservable();  }

  //función que recibe valor y lo asigna al subjectBehavior que recibe un elem tipo model pregunta
  setRespuesta(item:respuestaModel):void{ 
    this.pregunta$.next(item); 
    console.log(" en set service", item); } */



    
}
