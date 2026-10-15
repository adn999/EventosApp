import { ModoCaptura, modoGuardado } from 'src/app/services/escaner';
import { reproducir, vibrar } from 'src/app/services/haptica';
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
import { asistenteDBModel } from 'src/app/models/asistenteDBModel';
import { VistaLoginModel } from 'src/app/models/VistaLoginModel';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

@Component({
  selector: 'app-entrada-salida',
  templateUrl: './entrada-salida.component.html',
  styleUrls: ['./entrada-salida.component.css'],
  animations:[trigger('mostrarTrigger', [state('hidden',style({ opacity:0})), transition('hidden => shown', [ useAnimation(transitionEntrada) ]),  ]),
              trigger('mostrarTriggerLeft', [state('hidden',style({ opacity:0})), transition('hidden => shown', [ useAnimation(transitionSalida) ]),  ]),
              trigger('mostrarTriggerCollapse',[state('hidden',style({ opacity:0})), transition('hidden => shown', [ useAnimation(transitionCollapse) ]) ]),
              trigger('triggResult', [ transition('false => true', [ useAnimation(transitionCollapseFast) ]) ]),]
})
export class EntradaSalidaComponent implements OnInit {

  // Captura: 'teclado' (cuadro de texto / lector externo) o 'camara' (solo códigos de barras). Arranca en teclado y recuerda la última opción al navegar.
  modoCaptura: ModoCaptura = modoGuardado('entrada-salida');
  alEscanear(control: string, valor: string): void {
    this.formRegistro.patchValue({ [control]: valor });
    if (this.formRegistro.invalid) { vibrar('error'); this.toastr.warning('Código no válido para este campo.'); return; }
    this.saveItem();
  }

  constructor (private readonly dbSvc:DbservicesService,
    private readonly sharedSvc:ShareDataService,
    private readonly frmBuilder:FormBuilder,
    private readonly toastr:ToastrService,    
    private readonly titleSvc:Title,
    private readonly http:HttpClient,
    private readonly router: Router,
    private readonly sanitizer:DomSanitizer)
    {  this.titleSvc.setTitle("Entrega Kit"); }


    formRegistro!: FormGroup ;
    @ViewChild('txtPulsera', {static:false} )txtPulseraRef!:ElementRef;
    localUser!:VistaLoginModel;
    macroEvento:string='';
    Pulsera:string='';
    itemToEdit:registroEventoDBModel={idEvento:0, cum:'', macroEvento:'', pulsera:'', nombre:'', nombreEvento:'', kit:0,
                                      fechaEntrada:new Date() ,fechaSalida:new Date('2000,1,1'), entrada:0 };

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
    imagePath:SafeResourceUrl='';

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
       
        if(!esvalido){return;}


       this.dbSvc.getRegistroEventobyPulsera(this.Pulsera, this.macroEvento, this.localUser.token, this.localUser.tokenjwt).subscribe(resp=>
      {
       
        if(resp==null){this.toastr.warning("CUM No Existe");}
        else//si devuelve id evento válido, se cargan sus respuestas
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
          this.imagePath='../../../assets/gifLogo.gif';
          
          if(this.itemToEdit.idEvento==0)
          {
            this.createMsg('La Pulsera no se encuentra para Registar Entrada o Salida ');
            const tempP=this.Pulsera;
            this.avisoPulsera="Pulsera: "+tempP+", no está registrada o fue dada de baja :( ";
            this.Pulsera=''; 
            setTimeout(() => {this.txtPulseraRef.nativeElement.focus() ; }, 250); 
          }
        else
        {
          this.avisoPulsera="Pulsera localizada correctamente";
          this.nombreEvento=this.itemToEdit.nombreEvento;
          this.arrEventos = this.nombreEvento.split("|");
          this.lblPulsera=this.itemToEdit.pulsera;
          this.lblCUM= resp.cum;
          this.lblNombre=this.itemToEdit.nombre ;

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
               }
              else{this.imagePath='';}
             });


          this.Pulsera='';   
        
          //se actualiza el valor al contrario que tenga 
          this.RegistrarEntradaSalida();     
          this.playAudio("ok");
            setTimeout(() => {this.txtPulseraRef.nativeElement.focus(); this.cleanForm(); }, 4000);   
        }
           
  
        }     
      });
    }
  }


  RegistrarEntradaSalida():void
  {
   //cambiamos el valor de entradasalida dependiendo del actual
    if(this.itemToEdit.entrada==1){ this.itemToEdit.entrada=0;  
                                    this.itemToEdit.fechaSalida=new Date();
                                    this.itemToEdit.fechaSalida.setHours(this.itemToEdit.fechaSalida.getHours()-6);   }
                              else{ this.itemToEdit.entrada=1; 
                                    this.itemToEdit.fechaEntrada=new Date();
                                    this.itemToEdit.fechaEntrada.setHours(this.itemToEdit.fechaEntrada.getHours()-6);  }

    this.dbSvc.postRegistroEventoAsistencia(this.itemToEdit,this.localUser.token, this.localUser.tokenjwt).subscribe(data=>
      { 
        if(this.itemToEdit.entrada==1)
        {this.toastr.success("Entrada Registrada!!!","", { timeOut: 4000, closeButton:true, progressBar:true } ) ;}
        else{ this.toastr.info("Salida Registrada!!!","", { timeOut: 4000, closeButton:true, progressBar:true } ) ;}

        this.formRegistro.patchValue({txtPulsera:''  });
        setTimeout(() => {this.txtPulseraRef.nativeElement.focus() ; }, 250); 
      }); 
    
  }


  cleanForm():void{
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
    setTimeout(() => {this.txtPulseraRef.nativeElement.focus() ; }, 250); 
    this.itemToEdit.idEvento=0;
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
                if(!respuesta.asistencia)
                {
                  Swal.fire({
                    title: "No tienes permiso para Registrar Entradas o Salidas de este Evento :(", text:"Debes contactar al Administrador del Evento",
                    icon:"info",iconColor:'purple',color: '#purple',
                    background:'rgba(255, 255, 255, 0.87)',backdrop: `rgba(0,0,123,0.4)`,
                    showDenyButton: false,
                    confirmButtonText: 'Enterado',confirmButtonColor:'#CD6155'
                  }).then((result) => {if (result.isConfirmed) { this.router.navigate(['home' ] );} });
            
                }
              });
  
          }
    });


  }



  playAudio(sonido:string){
    reproducir(sonido);
  }


   createMsg(msg:string):void
     {
        Swal.fire({
                        title: msg,
                        text: '',
                        timer: 1600, // 2000 milliseconds = 2 seconds
                        showConfirmButton: false ,// Optionally hide the confirmation button
                        icon:'error',
                        didClose: () => { this.cleanForm();
                                          this.txtPulseraRef.nativeElement.focus(); }
                    });
        this.playAudio("error");
        return;
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
