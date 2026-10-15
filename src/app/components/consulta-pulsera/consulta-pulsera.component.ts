import { reproducir, vibrar } from 'src/app/services/haptica';
import { ChangeDetectorRef, Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { DbservicesService } from 'src/app/services/dbservices.service';
import { ShareDataService } from 'src/app/services/shared-data.service';
import { ToastrService } from 'ngx-toastr';
import { ActivatedRoute, Router } from '@angular/router';
import { BotonEscanerComponent } from '../captura/boton-escaner.component';
import Swal from 'sweetalert2';
import { registroEventoDBModel } from 'src/app/models/registroEventoDBModel';
import { formatDate } from '@angular/common';
import { state, style, transition, trigger, useAnimation } from '@angular/animations';
import { transitionCollapse, transitionCollapseFast, transitionEntrada, transitionSalida } from '../animation';
import { VistaLoginModel } from 'src/app/models/VistaLoginModel';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ModoCaptura, ResultadoContinuo, guardarModo, modoGuardado, conEventos } from 'src/app/services/escaner';

@Component({
  selector: 'app-consulta-pulsera',
  templateUrl: './consulta-pulsera.component.html',
  styleUrls: ['./consulta-pulsera.component.css'],
  animations:[trigger('mostrarTrigger', [state('hidden', style({ opacity: 0  })),
                                              transition('hidden => shown', [ useAnimation(transitionEntrada) ]),  ]),
              trigger('mostrarTriggerLeft', [ transition('hidden => shown', [ useAnimation(transitionSalida) ]),  ]),
              trigger('mostrarTriggerCollapse', [state('hidden', style({ opacity: 0  })),
                                              transition('hidden => shown', [ useAnimation(transitionCollapse) ]) ]),
              trigger('triggResult', [ transition('false => true', [ useAnimation(transitionCollapseFast) ]) ]),
            ]
})
export class ConsultaPulseraComponent implements OnInit{

 
  formRegistro!: FormGroup ;

  //listQuestions:catQuestionDBModel[]=[];   
  //el evento ya debe existir para asignarlo al objeto de la clase
  itemToEdit:registroEventoDBModel={idEvento:0, macroEvento:'', cum:'', pulsera:'', nombre:'',nombreEvento:'', entrada:0,
                                    fechaEntrada:new Date() , fechaSalida:new Date(2000,0,1), kit:0};
  
  
  localUser!:VistaLoginModel;
  macroEvento:string='';
  idUsuarioAregistrar:string='';
  nombreRegistro:string='';
  pulseraAnterior:string='';
  avisopulsera:string='';
  lblPulsera:string='';
  lblNombre:string='';
  lblCUM:string='';
  validacionGral:boolean=false;
  idEvento:number=0;
  nombreEvento:string='';
  
  arrEventos: string[] = [];
  avisoEntrasaSalida:string='';
  avisoTipoPulsera:string='';
  colorTipoPulsera:string='';
  estado='hidden';

  imagePath:SafeResourceUrl='';
  
  @ViewChild('txtPulsera', {static:false} )txtPulseraRef!:ElementRef;
  @ViewChild(BotonEscanerComponent) botonEscaner?: BotonEscanerComponent;

  // Captura: 'teclado' (cuadro de texto / lector externo) o 'camara' (solo códigos de barras). Arranca en teclado y recuerda la última opción al navegar.
  modoCaptura: ModoCaptura = modoGuardado('consulta-pulsera');
  alEscanear(valor: string): void {
    this.formRegistro.patchValue({ txtPulsera: valor });
    if (this.formRegistro.invalid) {
      vibrar('error'); this.informar({ tipo: 'error', titulo: 'Código no válido', detalle: valor });
      this.toastr.warning('Código no válido para este campo.'); return;
    }
    this.saveItem();
  }

  // Escaneo continuo: cada código se consulta con el mismo flujo y la ficha (nombre, kit, entrada) se muestra en la cámara.
  private reportar?: (r: ResultadoContinuo) => void;
  procesarContinuo = (valor: string): Promise<ResultadoContinuo> => new Promise(resolve => {
    // si el flujo no informa (p. ej. falla la red), a los 11 s se libera para que la pantalla se pueda limpiar
    const fin = (r: ResultadoContinuo) => { if (this.reportar === fin) this.reportar = undefined; resolve(r); };
    this.reportar = fin;
    setTimeout(() => fin({ tipo: 'error', titulo: 'Sin respuesta', detalle: 'Revisa la conexión e intenta de nuevo' }), 11000);
    this.alEscanear(valor);
  });
  private informar(r: ResultadoContinuo): void { this.reportar?.(r); }
  /** CUM · kit · entrada y, en otra línea, sus eventos, para la tarjeta del escaneo continuo. */
  private ficha(cum: string, kit: number): string {
    return conEventos([cum, 'Kit: '+(kit==1?'Sí':'No'), this.avisoEntrasaSalida].filter(x => x).join(' · '), this.nombreEvento);
  }
   
  constructor (private readonly dbSvc:DbservicesService,
      private readonly sharedSvc:ShareDataService,
      private readonly frmBuilder:FormBuilder,
      private readonly toastr:ToastrService,    
      private readonly router: Router,
      private readonly route: ActivatedRoute,
      private readonly cdr: ChangeDetectorRef,
      private readonly sanitizer:DomSanitizer )
      {   }


//para que cambie el estado de la variable inicial para animación
ngAfterViewInit()
{
   setTimeout( () => { this.estado = 'shown';}, 200);
   // Widget / control "Escanear pulsera" de iOS: eventosscouts://consulta?escanear=1
   this.route.queryParamMap.subscribe(p => {
     if (p.get('escanear') === '1') setTimeout(() => this.escaneoDirecto(), 0);
     const buscar = p.get('buscar');
     if (buscar) setTimeout(() => this.busquedaDirecta(buscar), 0);
   });
  }
  // Siri "Buscar pulsera": eventosscouts://consulta?buscar=… (EnlacesService)
  private busquedaDirecta(valor: string): void {
    this.router.navigate([], { relativeTo: this.route, queryParams: { buscar: null }, queryParamsHandling: 'merge', replaceUrl: true });
    const intentar = (n: number) => {
      // la búsqueda necesita la sesión y el evento elegido; justo al abrir la app pueden tardar un momento
      if (this.localUser?.token && this.macroEvento) this.alEscanear(valor);
      else if (n > 0) setTimeout(() => intentar(n - 1), 500);
    };
    intentar(10);
  }

  private escaneoDirecto(): void {
    this.modoCaptura = 'camara';
    guardarModo('consulta-pulsera', 'camara');
    this.cdr.detectChanges();                       // pinta el botón de escaneo antes de usarlo
    this.router.navigate([], { relativeTo: this.route, queryParams: { escanear: null }, queryParamsHandling: 'merge', replaceUrl: true });
    setTimeout(() => this.botonEscaner?.escanear(), 500);
  }

ngOnInit(): void 
{
    this.formRegistro= this.iniciaForm();
    this.consultarLogStatus();  
    setTimeout(() => {this.txtPulseraRef.nativeElement.focus() ; }, 250); 
}
        
  
  cleanForm():void{
        if(this.reportar) return;   // escaneo continuo: un temporizador de la consulta anterior no debe borrar la que se procesa
        this.formRegistro.reset(); 
        this.formRegistro.patchValue({txtPulsera:''  });
        this.idEvento=0;
        this.nombreRegistro='';
        this.itemToEdit.cum='';
        this.avisopulsera='';
        this.lblPulsera='';
        this.lblNombre='';
        this.lblCUM='';
        this.avisoEntrasaSalida='';
        this.avisoTipoPulsera='';
        this.colorTipoPulsera='';
        this.nombreEvento='';
        this.nombreRegistro='';
        this.playAudio("click");
        setTimeout(() => {this.txtPulseraRef.nativeElement.focus() ; }, 250); 
      }
      
      saveItem()
      {
          const pulseraTemp= this.formRegistro.get('txtPulsera')?.value;
          if(pulseraTemp==''){return;}

           
  this.dbSvc.getRegistroEventobyCUM( pulseraTemp, this.macroEvento, this.localUser.token, this.localUser.tokenjwt).subscribe(respPulsera=>
      { 
          //si no se localizó por cum, se busca por pulsera
          if(respPulsera.idEvento==0)
          {

          this.dbSvc.getRegistroEventobyPulsera(pulseraTemp,this.macroEvento, this.localUser.token, this.localUser.tokenjwt).subscribe(resp=>
            { 
             // console.log(resp);
              this.itemToEdit.pulsera=resp.pulsera;
              this.itemToEdit.fechaEntrada=resp.fechaEntrada;
              this.itemToEdit.entrada=resp.entrada;
              this.itemToEdit.fechaSalida=resp.fechaSalida;
              if(resp.pulsera=='')//si no tiene pulsera, se le puede asignar, de lo contario se muestra la pulsera asignada
              {   
                this.dbSvc.getRegistroEventoBajabyPulsera(pulseraTemp, this.localUser.token, this.localUser.tokenjwt).subscribe(respB=>
                { 
                 // console.log(respB);
                  this.itemToEdit.pulsera=respB.pulsera;
                  if(respB.pulsera=='')//si la pulsera no existe en ninguna base, se asigna
                  {     
                      this.informar({ tipo: 'error', titulo: 'No registrada en este evento', detalle: pulseraTemp });
                      this.createMsg('La Pulsera:'+pulseraTemp+' No está registrada en este Evento.');
                      this.playAudio("error");
                      this.avisopulsera='La Pulsera:'+pulseraTemp+' No está registrada con nosotros.';
                      //setTimeout(() => {this.txtPulseraRef.nativeElement.focus() ; }, 250);      
                      this.cleanForm();
                  }
                  else//si se encontró en las pulseras dadas de baja, no hay asignación
                  {
                    this.itemToEdit.pulsera='';
                    this.validacionGral=false;
                    this.formRegistro.patchValue({txtPulseraRef: pulseraTemp });
                    this.toastr.success("Pulsera ya Registada!","El usuario ya tiene una pulsera asignada." ) ;     
                    const isKit=respB.kit==1?'Sí':'No';
                    this.avisopulsera="La pulsera fue dada de baja por reposición. Se entregó Kit:"+isKit; 
                    this.lblPulsera=pulseraTemp;
                    this.lblCUM= respB.cum;
                    this.lblNombre=respB.nombre ;
                    this.nombreEvento=respB.nombreEvento;    
                    this.arrEventos = this.nombreEvento.split("|");
                  
                    if(this.itemToEdit.entrada==1){this.avisoEntrasaSalida="Ingresó al Evento:"+ formatDate(this.itemToEdit.fechaEntrada, 'dd-MMM-YYYY HH:mm:ss','en-US');  }
                    else{this.avisoEntrasaSalida="Salió del Evento:"+formatDate(this.itemToEdit.fechaSalida, 'dd-MMM-YYYY HH:mm:ss', 'en-US');}
                    this.informar({ tipo: 'ya', titulo: 'Baja por reposición · '+respB.nombre, detalle: this.ficha(respB.cum, respB.kit) });
                    this.cleanForm();
                  }
                });
              }
              else //si la pulsera ya esta asignada previamente
              {
                this.itemToEdit.pulsera='';
                this.validacionGral=false;
                this.formRegistro.patchValue({txtPulseraRef: '' });
                this.toastr.success("Pulsera ya Registada!","El usuario ya tiene una pulsera asignada." );
                const isKit=resp.kit==1?'Sí':'No';     
                this.avisopulsera="Pulsera asignada correctamente. Se entregó Kit:"+isKit;
                this.lblPulsera=pulseraTemp;
                this.lblCUM=resp.cum;
                this.lblNombre=resp.nombre ;
                this.imagePath='../../../assets/gifLogo.gif';
                this.nombreEvento=resp.nombreEvento; 
                this.arrEventos = this.nombreEvento.split("|");
                if(this.itemToEdit.entrada==1){this.avisoEntrasaSalida="Ingresó al Evento:"+ formatDate(this.itemToEdit.fechaEntrada, 'dd-MMM-YYYY HH:mm:ss','en-US');  }
                else{this.avisoEntrasaSalida="Salió del Evento:"+formatDate(this.itemToEdit.fechaSalida, 'dd-MMM-YYYY HH:mm:ss', 'en-US');}

                 //se consulta el color de la pulsera secun el macroevento, en caso de que exista
                 this.dbSvc.getMacrocolorbyCUM(resp.cum,resp.macroEvento, this.localUser.token, this.localUser.tokenjwt).subscribe(respColor=>
                  {
                   // console.log("valor"+respColor.descripcion);
                    if(respColor.descripcion!='')
                      {
                       this.avisoTipoPulsera= respColor.descripcion;
                       this.colorTipoPulsera=respColor.color;
                      }
                    else
                      {
                        this.avisoTipoPulsera="";
                        this.colorTipoPulsera="";
                      }
                   });

                   //se consulta imagen del usuario
                   this.dbSvc.getImage(resp.cum, this.localUser.token, this.localUser.tokenjwt).subscribe(respObjGenerico=>
                    {  
                      if(respObjGenerico.objetoGenerico!=null)
                        {
                           this.imagePath = this.sanitizer.bypassSecurityTrustResourceUrl('data:image/jpg;base64,' 
                            + respObjGenerico.objetoGenerico);

                         // console.log("valor image64:"+this.imagePath);
                        }
                      else
                        {
                          this.imagePath='';
                        }
                     });

                     this.informar({ tipo: 'ok', titulo: resp.nombre, detalle: this.ficha(resp.cum, resp.kit) });
                     this.playAudio("ok");

              }

            });

          }
          else//si se localizó por cum, se muestra la información
          {
            this.itemToEdit.pulsera='';
            this.validacionGral=false;
            this.formRegistro.patchValue({txtPulseraRef: '' });
            this.toastr.success("Pulsera ya Registada!","El usuario ya tiene una pulsera asignada." );
            //al localizar por CUM, la entrada/salida viene en esta misma respuesta (antes se usaban valores viejos o los iniciales)
            this.itemToEdit.entrada=respPulsera.entrada;
            this.itemToEdit.fechaEntrada=respPulsera.fechaEntrada;
            this.itemToEdit.fechaSalida=respPulsera.fechaSalida;
            const isKit=respPulsera.kit==1?'Sí':'No';     
            this.avisopulsera="Pulsera asignada correctamente. Se entregó Kit:"+isKit;
            this.lblPulsera=pulseraTemp;
            this.lblCUM=respPulsera.cum;
            this.lblNombre=respPulsera.nombre ;
            this.imagePath='../../../assets/gifLogo.gif';
            this.nombreEvento=respPulsera.nombreEvento; 
            this.arrEventos = this.nombreEvento.split("|");
            if(this.itemToEdit.entrada==1){this.avisoEntrasaSalida="Ingresó al Evento:"+ formatDate(this.itemToEdit.fechaEntrada, 'dd-MMM-YYYY HH:mm:ss','en-US');  }
            else{this.avisoEntrasaSalida="Salió del Evento:"+formatDate(this.itemToEdit.fechaSalida, 'dd-MMM-YYYY HH:mm:ss', 'en-US');}

             //se consulta el color de la pulsera secun el macroevento, en caso de que exista
             this.dbSvc.getMacrocolorbyCUM(respPulsera.cum,respPulsera.macroEvento, this.localUser.token, this.localUser.tokenjwt).subscribe(respColor=>
              {
               // console.log("valor"+respColor.descripcion);
                if(respColor.descripcion!='')
                  {
                   this.avisoTipoPulsera= respColor.descripcion;
                   this.colorTipoPulsera=respColor.color;
                  }
                else
                  {
                    this.avisoTipoPulsera="";
                    this.colorTipoPulsera="";
                  }
               });

               //se consulta imagen del usuario
               this.dbSvc.getImage(respPulsera.cum, this.localUser.token, this.localUser.tokenjwt).subscribe(respObjGenerico=>
                {  
                  if(respObjGenerico.objetoGenerico!=null)
                    {
                       this.imagePath = this.sanitizer.bypassSecurityTrustResourceUrl('data:image/jpg;base64,' 
                        + respObjGenerico.objetoGenerico);

                     // console.log("valor image64:"+this.imagePath);
                    }
                  else
                    {
                      this.imagePath='';
                    }
                 });

                 this.informar({ tipo: 'ok', titulo: respPulsera.nombre, detalle: this.ficha(respPulsera.cum, respPulsera.kit) });
                 this.playAudio("ok");

          }

      });
        
        this.formRegistro.patchValue({txtPulsera:''  });

      }

    


       createMsg(msg:string):void
             {
                Swal.fire({
                                title: msg,
                                text: '',
                                timer: 1600, // 2000 milliseconds = 2 seconds
                                showConfirmButton: false ,// Optionally hide the confirmation button
                                icon:'error',
                                 didClose: () => { this.formRegistro.patchValue({txtPulsera:''  }); 
                                                   this.txtPulseraRef.nativeElement.focus(); }
                            });
                this.playAudio("error");
                return;
              }


      isString(x:string):boolean 
      {
      if ( isNaN((Number(x)) )   ) 
      {
      //  console.log(Number(x));
        return true; 
      }
      return false;
      }

      
      playAudio(sonido:string){
        reproducir(sonido);
      }


  
      consultarLogStatus():void
      {
        //consultamos el id de la persona que se logeó para los registro de Asistentes
        this.sharedSvc.currentStatu$.subscribe(respuesta=>{this.localUser=respuesta;});
        this.sharedSvc.currentUserMacroEvento$.subscribe(respuesta=>
          {this.macroEvento=respuesta;
          
            if(respuesta.length==0)
              {
                Swal.fire({
                  title: "No ha seleccionado el Evento!", text:"Debes seleccionar un evento primero",
                  icon:"info",iconColor:'purple',color: '#purple',
                  background:'rgba(255, 255, 255, 0.87)',backdrop: `rgba(0,0,123,0.4)`,
                  showDenyButton: false,
                  confirmButtonText: 'Enterado',confirmButtonColor:'#CD6155'
                }).then((result) => {if (result.isConfirmed) { this.router.navigate(['home' ] );} });
              }
              else//si sí eligió un macroevento
              {
                this.sharedSvc.currentEventoPermisos$.subscribe(respuesta=>
                  { 
                    if(!respuesta.asistencia)
                    {
                      Swal.fire({
                        title: "No tienes permiso para consultar Pulseras de este Evento :(", text:"Debes contactar al Administrador del Evento",
                        icon:"info",iconColor:'purple',color: '#purple',
                        background:'rgba(255, 255, 255, 0.87)',backdrop: `rgba(0,0,123,0.4)`,
                        showDenyButton: false,
                        confirmButtonText: 'Enterado',confirmButtonColor:'#CD6155'
                      }).then((result) => {if (result.isConfirmed) { this.router.navigate(['home' ] );} });
                      this.playAudio("error");
                
                    }
                  });
      
              }
        });
      
      }
  
      iniciaForm():FormGroup
      {
        return this.frmBuilder.group({
          txtPulsera:['',[Validators.required,Validators.minLength(5)] ],  });
      }


  
  }// fin de OnInit General
  