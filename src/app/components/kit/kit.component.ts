import { ModoCaptura, ResultadoContinuo, modoGuardado, conEventos } from 'src/app/services/escaner';
import { Haptico, reproducir, vibrar } from 'src/app/services/haptica';
import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { DbservicesService } from 'src/app/services/dbservices.service';
import { ShareDataService } from 'src/app/services/shared-data.service';
import { ToastrService } from 'ngx-toastr';
import { Router } from '@angular/router';
import { Title } from '@angular/platform-browser';
import Swal from 'sweetalert2';
import { registroEventoDBModel } from 'src/app/models/registroEventoDBModel';
import { state, style, transition, trigger, useAnimation } from '@angular/animations';
import { transitionCollapse, transitionEntrada, transitionSalida } from '../animation';

import { HttpClient} from '@angular/common/http';
import { asistenteDBModel } from 'src/app/models/asistenteDBModel';
import { VistaLoginModel } from 'src/app/models/VistaLoginModel';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
 
@Component({
  selector: 'app-kit',
  templateUrl: './kit.component.html',
  styleUrls: ['./kit.component.css'],
  animations:[trigger('mostrarTrigger', [state('hidden',style({ opacity:0})), transition('hidden => shown', [ useAnimation(transitionEntrada) ]),  ]),
              trigger('mostrarTriggerLeft', [state('hidden',style({ opacity:0})), transition('hidden => shown', [ useAnimation(transitionSalida) ]),  ]),
              trigger('mostrarTriggerCollapse', [state('hidden',style({ opacity:0})), transition('hidden => shown', [ useAnimation(transitionCollapse) ]) ]),]
})
export class KitComponent implements OnInit  {

  formRegistro!: FormGroup ;

  // Captura: 'teclado' (cuadro de texto / lector externo) o 'camara' (solo códigos de barras). Arranca en teclado y recuerda la última opción al navegar.
  modoCaptura: ModoCaptura = modoGuardado('kit');
  alEscanear(control: string, valor: string): void {
    this.formRegistro.patchValue({ [control]: valor });
    if (this.formRegistro.invalid) {
      vibrar('error'); this.informar({ tipo: 'error', titulo: 'Código no válido', detalle: valor });
      this.toastr.warning('Código no válido para este campo.'); return;
    }
    this.saveItem();
  }

  // Escaneo continuo: cada código pasa por el mismo flujo y el resultado (entregado, ya entregado o error) se muestra en la cámara.
  private reportar?: (r: ResultadoContinuo) => void;
  procesarContinuo = (valor: string): Promise<ResultadoContinuo> => new Promise(resolve => {
    // si el flujo no informa (p. ej. falla la red), a los 11 s se libera para que la pantalla se pueda limpiar
    const fin = (r: ResultadoContinuo) => { if (this.reportar === fin) this.reportar = undefined; resolve(r); };
    this.reportar = fin;
    setTimeout(() => fin({ tipo: 'error', titulo: 'Sin respuesta', detalle: 'Revisa la conexión e intenta de nuevo' }), 11000);
    this.alEscanear('txtPulsera', valor);
  });
  private informar(r: ResultadoContinuo): void { this.reportar?.(r); }

  constructor (private readonly dbSvc:DbservicesService,
    private readonly sharedSvc:ShareDataService,
    private readonly frmBuilder:FormBuilder,
    private readonly toastr:ToastrService,    
    private readonly titleSvc:Title,
    private readonly http:HttpClient,
    private readonly router: Router,
    private readonly sanitizer:DomSanitizer)
    {   this.titleSvc.setTitle("Entrega Kit"); }

//arrayPreguntas:PreguntaModel[]=[];

@ViewChild('txtPulsera', {static:false} )txtPulseraRef!:ElementRef;
 

idUsuarioAregistrar!:string;
idPaquete:number=0;

localUser!:VistaLoginModel;
macroEvento:string='';
Pulsera:string='';
avisoPulsera:string='';
lblPulsera:string='';
lblNombre:string='';
lblCum:string='';
avisoTipoPulsera:string='';
colorTipoPulsera:string='';
validacionGral:boolean=false;
nombreEvento:string='';

arrEventos: string[] = [];
imagePath:SafeResourceUrl='';
datosJson:any;

itemToEdit:registroEventoDBModel={idEvento:0, macroEvento:'', cum:'', pulsera:'', nombre:'', nombreEvento:'', entrada:0, 
                                  fechaEntrada:new Date() ,fechaSalida:new Date('2000,1,1'), kit:0};
  
estado='hidden';
//para que cambie el estado de la variable inicial para animación
ngAfterViewInit(){ setTimeout( () => { this.estado = 'shown';}, 200);}

ngOnInit(): void
 {  
  this.formRegistro= this.iniciaForm();
  this.consultarLogStatus();  
  setTimeout(() => {this.txtPulseraRef.nativeElement.focus() ; }, 250); 
 }
  

 
  saveItem():void
  {
    this.Pulsera= this.formRegistro.get('txtPulsera')?.value;
    if(this.Pulsera.length>0)
    {

       let esvalido=false;
       if( this.isString(this.Pulsera.substring(0,5))==false )//si comienza con 5 numeros, es pulsera
        {
          const pulsera1eraParte= this.Pulsera.substring(0, 5) ;//debe ser solo numeros
          const pulsera2daParte=this.Pulsera.substring(5, 10);//debe ser solo texto
          if( this.isString(pulsera1eraParte)==true )
          {
            this.createMsg('Pulsera no válida! debe ser 5 caracteres numéricos al inicio.');
            return;
          }
          if( this.isString( pulsera2daParte)==false )
          {
            this.createMsg('Pulsera no válida! debe ser 5 caracteres numéricos al final.');
            return;
          }
          esvalido=true;
        }

       if( this.isString(this.Pulsera.substring(0,2))==true )//si comienza con 2 letras, es cum
        { 
             const pulsera1eraParte= this.Pulsera.substring(0, 2) ; 
             const pulsera2daParte=this.Pulsera.substring(3, 10); 
         
             if( this.isString(pulsera1eraParte)==false )
             {
               this.createMsg('Pulsera no válida! debe ser 2 caracteres al inicio.');
               return;
             }
             if( this.isString(pulsera2daParte)==true )
             {
               this.createMsg('Pulsera no válida! debe ser 7 números al final.');
               return;
             }
             esvalido=true;
        } 
 
        if(!esvalido){ this.informar({ tipo: 'error', titulo: 'Código no reconocido', detalle: this.Pulsera }); return;}
       


    this.dbSvc.getRegistroEventobyPulsera(this.Pulsera,this.macroEvento, this.localUser.token, this.localUser.tokenjwt).subscribe(resp=>
      {
       
        if(resp==null){this.toastr.warning("CUM No Existe"); this.informar({ tipo: 'error', titulo: 'CUM no existe', detalle: this.Pulsera }); return;}
        else//si devuelve id evento válido, se cargan sus respuestas
        {
          //Se consulta si puede recibir kit por alguno de su conjunto de eventos
          this.dbSvc.getVistaRegistroEvento(resp.cum, this.macroEvento, this.localUser.token, this.localUser.tokenjwt).subscribe(respV=>
            {
              
              if(respV.incluyeKit==null || respV.incluyeKit==false)
              {
               this.informar({ tipo: 'error', titulo: 'Su evento no incluye el Kit', detalle: conEventos(resp.nombre+' · '+resp.cum, resp.nombreEvento) });
               this.createMsg('Su evento no incluye el Kit :[');
               this.cleanForm();
               this.playAudio("error");
               return;
              } 
              //si su evento sí incluye kit
              else
              {
                //console.log("Respuesta: "+resp);
                this.itemToEdit.cum=resp.cum;
                this.itemToEdit.macroEvento=resp.macroEvento;
                this.itemToEdit.idEvento=resp.idEvento;
                this.itemToEdit.nombre=resp.nombre;
                this.itemToEdit.pulsera=resp.pulsera;
                this.itemToEdit.nombreEvento=resp.nombreEvento;
                this.itemToEdit.kit=resp.kit;
                this.itemToEdit.entrada=resp.entrada;
                this.itemToEdit.fechaEntrada=resp.fechaEntrada;
                this.itemToEdit.fechaSalida=resp.fechaSalida;
                if(this.itemToEdit.idEvento==0)
                {   
                  this.createMsg('La Pulsera no se encuentra para Kit:'+resp.nombre);
                  this.playAudio("error");
                  const tempP=this.Pulsera;
                  this.avisoPulsera="Pulsera: "+tempP+", no está registrada o fue dada de baja :( ";
                  this.Pulsera=''; 
                  setTimeout(() => {this.txtPulseraRef.nativeElement.focus(); this.cleanForm(); }, 3000); 
                }
              else
              {
                this.avisoPulsera="Pulsera localizada correctamente";
                this.lblCum=this.itemToEdit.cum;
                this.lblNombre=this.itemToEdit.nombre;
                this.lblPulsera=this.itemToEdit.pulsera;
                this.imagePath='../../../assets/gifLogo.gif';

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
                        this.imagePath = this.sanitizer.bypassSecurityTrustResourceUrl('data:image/jpg;base64,'+ respObjGenerico.objetoGenerico);
                      }
                    else{this.imagePath='';}
                    });

                this.nombreEvento=this.itemToEdit.nombreEvento;
                this.arrEventos = this.nombreEvento.split("|");
                this.Pulsera='';   
                setTimeout(() => {this.txtPulseraRef.nativeElement.focus() ; }, 250); 

                //si el registro no tiene el kit entregado , se va al metodo
                if(this.itemToEdit.kit==0)
                {this.EntregarKit();}
                else
                {
                  this.informar({ tipo: 'ya', titulo: 'Kit entregado anteriormente', detalle: conEventos(this.lblNombre+' · '+this.lblCum, this.nombreEvento) });
                  this.createMsg("Kit Anteriormente Entregado!, ya fue entregado previamente.");
                  this.playAudio("info", "ya");
                  this.formRegistro.patchValue({txtPulsera:''  });
                }
              }
           
      
           }//fin del else cuando su evento sí incluye kit

        });//fin de validación si es que el evento incluye kit


   
        }//fin de else si el cum sí existe     
      });
    }
  }

  cleanForm():void{
    if(this.reportar) return;   // escaneo continuo: un temporizador de la pulsera anterior no debe borrar la que se procesa
    this.formRegistro.reset(); 
    this.formRegistro.patchValue({txtPulsera:''  });
    this.Pulsera='';
    this.avisoPulsera='';
    this.lblCum='';
    this.lblNombre='';
    this.lblPulsera='';
    this.avisoTipoPulsera='';
    this.colorTipoPulsera='';
    this.nombreEvento='';
    this.playAudio("click");
    setTimeout(() => {this.txtPulseraRef.nativeElement.focus() ; }, 250); 
    this.itemToEdit.idEvento=0;
  }
  
 

  EntregarKit():void
  {
    //obtenemos los datos faltantes para registrar el kit del usuario en SISAS
    this.dbSvc.getVistaRegistroEvento(this.itemToEdit.cum, this.macroEvento, this.localUser.token, this.localUser.tokenjwt).subscribe(resp=>
      {   //console.log(resp);
          this.idUsuarioAregistrar=resp.idUsuario;
          this.idPaquete=resp.idPaquete;

          if(resp!=null)
          {
          const objetoAsisKit:asistenteDBModel={idPaquete:this.idPaquete, idUsuario:this.idUsuarioAregistrar, usuarioLista:this.localUser.idUsuario};
          //console.log("Datos a actualizar"+objetoAsis);
           this.dbSvc.updateAsistenteKit(objetoAsisKit,this.localUser.token, this.localUser.tokenjwt).subscribe(data=>
             { 
               this.toastr.success("Kit Registrado en SISAS!","El usuario ya tiene su Kit actualizado.",{ timeOut: 3000, closeButton:true, progressBar:true } ) ;     
              this.playAudio("info");
              }); 
          }

      });
    
    this.itemToEdit.kit=1;

    
    this.dbSvc.postRegistroEventoAsistencia(this.itemToEdit,this.localUser.token, this.localUser.tokenjwt).subscribe(data=>
      { 
       
               this.informar({ tipo: 'ok', titulo: 'Kit entregado', detalle: conEventos(this.itemToEdit.nombre+' · '+this.itemToEdit.cum, this.itemToEdit.nombreEvento) });
               Swal.fire({
                             title: "Kit Entregado!!!",
                             text: 'Se ha entregado el Kit Exitosamente',
                             timer: 2000, // 2000 milliseconds = 2 seconds
                             showConfirmButton: false ,// Optionally hide the confirmation button
                             icon:'success'
                         });
        this.formRegistro.patchValue({txtPulsera:''  });
        this.playAudio("info");
        setTimeout(() => {this.txtPulseraRef.nativeElement.focus();  this.cleanForm(); }, 4000); 
      }); 

    
  }



consultarLogStatus():void
{ //consultamos el id de la persona que se logeó para los registro de Asistentes
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
              if(!respuesta.entregaKit)
              {
                Swal.fire({
                  title: "No tienes permiso para entregar Kits de este Evento :(", text:"Debes contactar al Administrador del Evento",
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

 createMsg(msg:string):void
   {
      this.informar({ tipo: 'error', titulo: msg, detalle: this.lblNombre });
      Swal.fire({
                      title: msg,
                      text: '',
                      timer: 1500, // 2000 milliseconds = 2 seconds
                      showConfirmButton: false ,// Optionally hide the confirmation button
                      icon:'error', didClose: () => { this.cleanForm(); 
                                                      this.txtPulseraRef.nativeElement.focus(); }
                  });
      this.playAudio("error");
      return;
    }


  playAudio(sonido:string, haptico?:Haptico){
    reproducir(sonido, haptico);
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

iniciaForm():FormGroup
{
  return this.frmBuilder.group({
    txtPulsera:['',[Validators.required,Validators.minLength(5)] ],   });
}

}
