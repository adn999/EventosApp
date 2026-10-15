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
import { transitionCollapse, transitionCollapseFast, transitionEntrada, transitionSalida } from '../animation';

import { HttpClient} from '@angular/common/http';

import { VistaLoginModel } from 'src/app/models/VistaLoginModel';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { registroEventoComidaDBModel } from 'src/app/models/registroEventoComidaDBModel';

@Component({
  selector: 'app-registro-comida',
  templateUrl: './registro-comida.component.html',
  styleUrls: ['./registro-comida.component.css'],
  animations:[trigger('mostrarTrigger', [state('hidden',style({ opacity:0})), transition('hidden => shown', [ useAnimation(transitionEntrada) ]),  ]),
              trigger('mostrarTriggerLeft', [state('hidden',style({ opacity:0})), transition('hidden => shown', [ useAnimation(transitionSalida) ]),  ]),
              trigger('mostrarTriggerCollapse',[state('hidden',style({ opacity:0})), transition('hidden => shown', [ useAnimation(transitionCollapse) ]) ]),
              trigger('triggResult', [ transition('false => true', [ useAnimation(transitionCollapseFast) ]) ]),]
})
export class RegistroComidaComponent implements OnInit{
 

  // Captura: 'teclado' (cuadro de texto / lector externo) o 'camara' (solo códigos de barras). Arranca en teclado y recuerda la última opción al navegar.
  modoCaptura: ModoCaptura = modoGuardado('registro-comida');
  alEscanear(control: string, valor: string): void {
    this.formRegistro.patchValue({ [control]: valor });
    if (this.formRegistro.invalid) {
      vibrar('error'); this.informar({ tipo: 'error', titulo: 'Código no válido', detalle: valor });
      this.toastr.warning('Código no válido para este campo.'); return;
    }
    this.saveItem();
  }

  // Escaneo continuo: cada código pasa por el mismo flujo que el teclado y el primer resultado que se informe
  // (registrado, ya registrado o error) se muestra en la cámara, que sigue abierta para la siguiente pulsera.
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
    {  this.titleSvc.setTitle("Entrega Alimentos"); }


    formRegistro!: FormGroup ;
    @ViewChild('txtPulsera', {static:false} )txtPulseraRef!:ElementRef;
    @ViewChild('btnLimpiar') btnLimpiarRef!: ElementRef<HTMLButtonElement>;
    localUser!:VistaLoginModel;
    macroEvento:string='';
    Pulsera:string='';
    itemToEdit:registroEventoComidaDBModel={idComida_Evento:0, cum:'', cumEntrega:'', pulsera:'',fechaComida:new Date()  };

    avisoPulsera:string='';
    avisoTipoPulsera:string='';
    colorTipoPulsera:string='';
    lblPulsera:string='';
    lblNombre:string='';
    lblCUM:string='';
    validacionGral:boolean=false;
    nombreEvento:string='';
    arrEventos: string[] = [];
    estado='hidden';

    descripcionComida:string='';

    //para que cambie el estado de la variable inicial para animación
    ngAfterViewInit(){ setTimeout( () => { this.estado = 'shown';}, 200);}

    ngOnInit(): void
    {  this.formRegistro= this.iniciaForm();
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
                  this.createMsg('Pulsera no válida! debe ser 5 números al inicio.');
                  return;
                }
                if( this.isString( pulsera2daParte)==false )
                {
                  this.createMsg('Pulsera no válida! debe ser 5 caracteres al final.');
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
             
 
       this.dbSvc.getRegistroEventobyPulsera(this.Pulsera, this.macroEvento, this.localUser.token, this.localUser.tokenjwt).subscribe(resp=>
      {
       
        if(resp==null){this.toastr.warning("CUM No Existe"); this.informar({ tipo: 'error', titulo: 'CUM no existe', detalle: this.Pulsera });}
        else//si devuelve id evento válido, se cargan sus respuestas
        {
          //console.log("Respuesta: "+resp);
          this.itemToEdit.cum=resp.cum;
          this.itemToEdit.pulsera=resp.pulsera;
          this.itemToEdit.cumEntrega=this.localUser.cum;
          
      /*     this.itemToEdit.macroEvento=resp.macroEvento;
          this.itemToEdit.idEvento=resp.idEvento;
          this.itemToEdit.nombre=resp.nombre;    
          this.itemToEdit.nombreEvento=resp.nombreEvento; 
          this.itemToEdit.entrada=resp.entrada;
          this.itemToEdit.fechaEntrada=resp.fechaEntrada;
          this.itemToEdit.fechaSalida=resp.fechaSalida; */

          
          
          if(resp.idEvento==0)
          {
            this.createMsg('La Pulsera no se encuentra para Registar comida en este evento '+resp.nombre);
            const tempP=this.Pulsera;
            this.avisoPulsera="Pulsera: "+tempP+", no está registrada o fue dada de baja :( ";
            this.Pulsera=''; 
            setTimeout(() => {this.txtPulseraRef.nativeElement.focus() ; }, 120); 
            this.cleanForm();
          }
          else
          {
            this.avisoPulsera="Pulsera localizada correctamente";
            this.nombreEvento=resp.nombreEvento;
            this.arrEventos = this.nombreEvento.split("|");
            this.lblPulsera=resp.pulsera;
            this.lblCUM= resp.cum;
            this.lblNombre=resp.nombre ;

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

             //Se consulta si puede recibir kit por alguno de su conjunto de eventos
            this.dbSvc.getVistaRegistroEvento(resp.cum, this.macroEvento, this.localUser.token, this.localUser.tokenjwt).subscribe(respV=>
            {
              if(respV.incluyeAlimentos==null ||respV.incluyeAlimentos==false)
              { 
                  this.createMsg('Su Paquete-Evento no incluye Alimentos.', true);
                  this.playAudio("error");
        
                return;
              }
              else
              {  
                this.dbSvc.getRegistroEventoVistaComidaEvento(resp.cum, this.macroEvento, this.localUser.token, this.localUser.tokenjwt).subscribe(respVC=>
                {
                  if(respVC.idComida_Evento==0)
                  {
                    this.createMsg(respVC.descripcionComida, true);
                    return;
                  }
                  else
                    {
                      this.itemToEdit.idComida_Evento=respVC.idComida_Evento
                      this.descripcionComida=respVC.descripcionComida;
                      this.RegistrarComida();
                    }
                });

              } });

          this.Pulsera='';   
          setTimeout(() => {this.txtPulseraRef.nativeElement.focus() ; }, 200); 
                
         }//fin de evento sí existe
            
        }//fin de cum sí existe 
      });
    }
  }


  RegistrarComida():void
  {
    this.dbSvc.getRegistroEventoComida(this.itemToEdit.idComida_Evento, this.itemToEdit.cum, 
                                        this.localUser.token, this.localUser.tokenjwt ).subscribe(consulta=>
     {
      if(consulta.idComida_Evento>0)
        {
          this.playAudio("info", "ya");
          this.informar({ tipo: 'ya', titulo: 'Ya registrado anteriormente', detalle: conEventos(this.descripcionComida+' · '+this.lblNombre, this.nombreEvento) });
          this.createMsg("Alimento: "+this.descripcionComida+" Ya Registrado Anteriormente!");
        }
      else
        {

          this.dbSvc.postRegistroEventoComida(this.itemToEdit.idComida_Evento, this.itemToEdit.cum, this.itemToEdit.cumEntrega, this.itemToEdit.pulsera,
                                            this.localUser.token, this.localUser.tokenjwt ).subscribe(data=>
          { 
            if(data.idComida_Evento>0)
            { 
              this.playAudio("info");
              this.informar({ tipo: 'ok', titulo: this.descripcionComida+' registrado', detalle: conEventos(this.lblNombre+' · '+this.lblCUM, this.nombreEvento) });
               Swal.fire({
                      title: "Alimento: "+this.descripcionComida+" Registrado!!!",
                      text: '',
                      timer: 1600, // 2000 milliseconds = 2 seconds
                      showConfirmButton: false ,// Optionally hide the confirmation button
                      icon:'success'
                  });

                setTimeout(() => {  this.cleanForm(); }, 2000); 
               
            }
            else{ this.informar({ tipo: 'error', titulo: 'Algo salió mal', detalle: 'No se registró el alimento' }); Swal.fire("Algo salió mal",'','error'); }
          }); 
        }


    });

        this.formRegistro.patchValue({txtPulsera:''  });
        setTimeout(() => {this.txtPulseraRef.nativeElement.focus() ; }, 2000); 
     
 
  }


  cleanForm():void{
    if(this.reportar) return;   // escaneo continuo: un temporizador de la pulsera anterior no debe borrar la que se procesa
    this.formRegistro.reset(); 
    this.formRegistro.patchValue({txtPulsera:''  });
    this.Pulsera='';
    this.avisoPulsera='';
    this.avisoTipoPulsera='';
    this.colorTipoPulsera='';
    this.nombreEvento='';
    this.lblPulsera='';
    this.lblNombre='';
    this.lblCUM='';
     this.playAudio("click");
    setTimeout(() => {this.txtPulseraRef.nativeElement.focus() ; }, 250); 
    this.itemToEdit.idComida_Evento=0;
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
                if( respuesta.comidas == false )
                {
                  Swal.fire({
                   title: "No tienes permiso para registrar Comidas de este Evento :(", text:"Debes contactar al Administrador del Evento",
                    icon:"info",iconColor:'purple',color: '#purple',
                    background:'rgba(255, 255, 255, 0.87)',backdrop: `rgba(0,0,123,0.4)`,
                    showDenyButton: false,
                    confirmButtonText: 'Enterado',confirmButtonColor:'#CD6155'
                  }).then((result) => {if (result.isConfirmed) { this.router.navigate(['home' ] );} });
            
                }
                else //si tiene permiso pero no es horario
                {
                  this.dbSvc.getRegistroEventoComidaValidaComidaHorario(this.localUser.token, this.localUser.tokenjwt ).subscribe(data=>
                  { 
                    if(data==false)
                    {
                    var tabladatos="";
                     this.dbSvc.getRegistroEventoComidacatComidaHorario(this.localUser.token, this.localUser.tokenjwt ).subscribe(datos=>
                     { 
                       datos.forEach(item=> 
                        {
                         tabladatos+= '<tr><td>'+item.descripcion+'</td><td>De '+item.hora_inicial+' Hrs</td><td>A '+item.hora_final+' Hrs</td></tr>' 
                        });

                         Swal.fire({
                                title: "No es horario para registrar Comidas",
                                      html:
                                      '<table id="userTable" class="content-table" style="width:100%;">' +
                                          '<thead>' +
                                          '<tr><th>Comida</th><th>Empieza</th><th>Termina</th></tr>' +
                                          '</thead>' +
                                          '<tbody>' +tabladatos+'</tbody>' +
                                     '</table>',

                                      icon:"info",iconColor:'purple',color: '#purple',
                                      background:'rgba(255, 255, 255, 0.87)',backdrop: `rgba(0,0,123,0.4)`,
                                      showDenyButton: false,
                                      confirmButtonText: 'Enterado',confirmButtonColor:'#CD6155'
                                }).then((result) => {if (result.isConfirmed) { this.router.navigate(['home' ] );} });

                     });
 
                     
                    }
                  }); 
                }


              });
  
          }
    });


  }

   /** conEventosUsuario: el usuario sí se encontró (p. ej. su paquete no incluye alimentos); la tarjeta muestra también sus eventos. */
   createMsg(msg:string, conEventosUsuario=false):void
   {
      this.informar({ tipo: 'error', titulo: msg, detalle: conEventosUsuario ? conEventos(this.lblNombre, this.nombreEvento) : this.lblNombre });
      Swal.fire({
                      title: msg,
                      text: '',
                      timer: 1200, // 2000 milliseconds = 2 seconds
                      showConfirmButton: false ,// Optionally hide the confirmation button
                      icon:'error', didClose: () => {   this.cleanForm();
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
    {//  console.log(Number(x));
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
