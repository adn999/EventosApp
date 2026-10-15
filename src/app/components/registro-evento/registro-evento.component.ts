import { ModoCaptura, modoGuardado } from 'src/app/services/escaner';
import { reproducir, vibrar } from 'src/app/services/haptica';
//import { bootstrapApplication } from '@angular/platform-browser';
import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { catQuizzDBModel } from 'src/app/models/catQuizzDBModel';
import { DbservicesService } from 'src/app/services/dbservices.service';
import { ShareDataService } from 'src/app/services/shared-data.service';
import { ToastrService } from 'ngx-toastr';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';
import { state, style, transition, trigger, useAnimation } from '@angular/animations';
import { transitionCollapse, transitionEntrada, transitionSalida } from '../animation';

import { registroEventoDBModel } from 'src/app/models/registroEventoDBModel';
import { asistenteDBModel } from 'src/app/models/asistenteDBModel';
import { VistaLoginModel } from 'src/app/models/VistaLoginModel';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

@Component({
  selector: 'app-registro-evento',
  templateUrl: './registro-evento.component.html',
  styleUrls: ['./registro-evento.component.css'],
  animations:[trigger('mostrarTrigger', [state('hidden',style({ opacity:0})), transition('hidden => shown', [ useAnimation(transitionEntrada) ]),  ]),
  trigger('mostrarTriggerLeft', [state('hidden',style({ opacity:0})), transition('hidden => shown', [ useAnimation(transitionSalida) ]),  ]),
  trigger('mostrarTriggerCollapse', [state('hidden',style({ opacity:0})), transition('hidden => shown', [ useAnimation(transitionCollapse) ]) ]),]
})
export class RegistroEventoComponent implements OnInit {

  formRegistro!: FormGroup ;

 
  //listQuestions:catQuestionDBModel[]=[];   
  //el evento ya debe existir para asignarlo al objeto de la clase
  itemToEdit:registroEventoDBModel={idEvento:0, macroEvento:'', cum:'', pulsera:'', nombre:'', nombreEvento:'', entrada:1,
                                    fechaEntrada: new Date(),
                                    fechaSalida:new Date('2000,1,1'),
                                    kit:0};
  
  
  localUser!:VistaLoginModel;
  MacroEvento:string='';
  idUsuarioAregistrar:string='';
  nombreRegistro:string='';
  avisopulsera:string='';
  avisoTipoPulsera:string='';
 

  colorTipoPulsera:string='';
  validacionUsuario:boolean=false;
  idPaquete:number=0;
  envelopeId:number;
  nombreEvento:string='';

  arrEventos: string[] = [];
  
  imagePath:SafeResourceUrl='';
  
  @ViewChild('txtCum', {static:false} )txtCumRef!:ElementRef;
  @ViewChild('txtPulsera', {static:false} )txtPulseraRef!:ElementRef;
 
  estado='hidden';
   
  // Captura: 'teclado' (cuadro de texto / lector externo) o 'camara' (solo códigos de barras). Arranca en teclado y recuerda la última opción al navegar.
  modoCaptura: ModoCaptura = modoGuardado('registro-evento');
  alEscanear(control: string, valor: string): void {
    this.formRegistro.patchValue({ [control]: valor });
    if (this.formRegistro.invalid) { vibrar('error'); this.toastr.warning('Código no válido para este campo.'); return; }
    this.saveItem();
  }

  constructor (private readonly dbSvc:DbservicesService,
      private readonly sharedSvc:ShareDataService,
      private readonly frmBuilder:FormBuilder,
      private readonly toastr:ToastrService,    
      private readonly router: Router, 
      private readonly sanitizer:DomSanitizer)
      {
      
      }
  
//para que cambie el estado de la variable inicial para animación
ngAfterViewInit(){ setTimeout( () => { this.estado = 'shown';}, 200);}

ngOnInit(): void 
    {
        this.formRegistro= this.iniciaForm();
        this.consultarLogStatus();  
        setTimeout(() => {this.txtCumRef.nativeElement.focus() ; }, 250); 
    }
      

cleanForm():void{
      this.formRegistro.reset(); 
      this.formRegistro.patchValue({txtCum:''  });
      this.formRegistro.patchValue({txtPulsera:''  });
      this.idPaquete=0;
      this.nombreRegistro='';
      this.itemToEdit.cum='';
      this.avisopulsera='';
      this.avisoTipoPulsera='';
      this.colorTipoPulsera='';
      this.nombreEvento='';
      this.validacionUsuario=false;
      this.playAudio("click");
      setTimeout(() => {this.txtCumRef.nativeElement.focus() ; }, 250); 
    }
    

ValidaValores():boolean
    {
      var resultado:boolean=false;
      // if(!this.formRegistro.get('txtCum')?.value && !this.formRegistro.get('txtPulsera')?.value ){  resultado=true;}
       resultado=true;
      return resultado;
    }
    

    saveItem()
    {
      //si no tiene valor el nombre del usuario o el paquete es 0 porque no se encontró el usuario, se consulta primero 
      if( this.validacionUsuario==false )
      {
        // si no tiene valor de cum ni pulsera, sólo retorna, no hace nada
        if(this.formRegistro.get('txtCum')?.value==''){return;}
       // this.toastr.info("Buscando CUM","Validando si está registrado para el evento" ) ;
        this.dbSvc.getVistaRegistroEvento(this.formRegistro.get('txtCum')?.value, this.MacroEvento,this.localUser.token, this.localUser.tokenjwt ).subscribe(resp=>
        { 
            //console.log(resp);
            this.itemToEdit.nombre=resp.nombre+' '+resp.primerApellido+' '+resp.segundoApellido;
            this.itemToEdit.cum =resp.cum;
            this.itemToEdit.pulsera='';
            this.itemToEdit.idEvento=resp.idEvento;
            this.itemToEdit.nombreEvento=resp.nombreEvento;
            this.idUsuarioAregistrar=resp.idUsuario;
            this.idPaquete=resp.idPaquete;
            this.nombreRegistro= this.itemToEdit.nombre;
            this.envelopeId= resp.envelopeStatus;
            this.imagePath='../../../assets/gifLogo.gif';

              //se consulta imagen del usuario
              this.dbSvc.getImage(resp.cum, this.localUser.token, this.localUser.tokenjwt).subscribe(respObjGenerico=>
                {  
                 // console.log("valor de imagen"+ respObjGenerico.objetoGenerico)
                  if(respObjGenerico.objetoGenerico!=null)
                    {
                       this.imagePath = this.sanitizer.bypassSecurityTrustResourceUrl('data:image/jpg;base64,' 
                        + respObjGenerico.objetoGenerico);
                    }
                  else{this.imagePath='';}
                 });

            if(this.idPaquete==0) //si no tiene paquete es que no se localizó en el preregistro
            {
             this.createMsg('CUM No Localizado! Favor de registrarse al evento');
             this.validacionUsuario=false;
             this.formRegistro.patchValue({txtCum:''  });
             this.avisopulsera='';
             setTimeout(() => {this.txtCumRef.nativeElement.focus() ; }, 250); 
            }
            else//Sí existe en el preregistro, por lo que se valida que no se le haya asignado una pulsera antes
            {
              //se valida si requiere permiso y si está firmado de lo contrario, no se puede inscribir
              if(this.envelopeId==1)
                {
                  this.createMsg('Menor de edad sin permiso firmado! Favor de firmar su permiso antes de ingresar al evento');
                  this.validacionUsuario=false;
                  this.formRegistro.patchValue({txtCum:''  });
                  this.avisopulsera='';
                  setTimeout(() => 
                    { this.txtCumRef.nativeElement.focus() ; 
                      this.cleanForm();
                    }, 4000); 
                  return;
                }
               if(this.envelopeId==2)
                {
                   Swal.fire({
                          title: "Menor de edad con permiso Firmado!",
                          text: 'Listo para seguir con el registro : )',
                          timer: 2000, // 2000 milliseconds = 2 seconds
                          showConfirmButton: false ,// Optionally hide the confirmation button
                          icon:'success', didClose: () => { this.txtPulseraRef.nativeElement.focus() ;  }
                      });
                   this.playAudio("info");
                }

              //se consulta para validar que no tenga una pulsera anterior
              this.dbSvc.getRegistroEventobyCUM( this.itemToEdit.cum, this.MacroEvento, this.localUser.token, this.localUser.tokenjwt).subscribe(respu=>
                { 
                  //console.log(respu);
                  this.itemToEdit.pulsera=respu.pulsera;
                  if(respu.pulsera=='')//si no tiene pulsera, se le puede asignar, de lo contario se muestra la pulsera asignada
                  { this.validacionUsuario=true; 
                    this.toastr.info("CUM Localizado!","Listo para asignar su pulsera : )", { timeOut: 4000, closeButton:false, progressBar:true } ) ;
                    this.playAudio("info");
                     this.avisopulsera="Listo para ingresar la pulsera.";
                     this.nombreEvento=this.itemToEdit.nombreEvento;
                  
                     this.arrEventos = this.nombreEvento.split("|");

                    //  console.log(this.arrEventos);

                       //enfocará al cuadro de texto siguiente
                     setTimeout(() => {this.txtPulseraRef.nativeElement.focus() ; }, 250); 
                  }
                  else //ya tiene pulsera, por lo que no se asignará nada
                  { 
                    this.createMsg('Usuario ya Registado!  El usuario ya tiene una pulsera asignada.');
                    this.formRegistro.patchValue({txtPulseraRef: this.itemToEdit.pulsera });
                    this.avisopulsera="La pulsera: "+this.itemToEdit.pulsera+" ya fue asignada al usuario :"+this.itemToEdit.nombre;
                    this.nombreEvento=this.itemToEdit.nombreEvento;
                    this.arrEventos = this.nombreEvento.split("|");
                    
                    this.validacionUsuario=false;
                    this.formRegistro.patchValue({txtCum:''  });
                    setTimeout(() => {
                      this.txtCumRef.nativeElement.focus();
                      this.cleanForm(); }, 3000); 
                  }

                     //se consulta el color de la pulsera secun el macroevento, en caso de que exista
                     this.dbSvc.getMacrocolorbyCUM(resp.cum,resp.macroEvento, this.localUser.token, this.localUser.tokenjwt).subscribe(respColor=>
                      {
                      // console.log("valor"+respColor.descripcion);
                        if(respColor.descripcion!='')
                          {
                          this.avisoTipoPulsera=respColor.descripcion;
                          this.colorTipoPulsera=respColor.color;
                          }
                        else
                          {
                            this.avisoTipoPulsera="";
                            this.colorTipoPulsera="";
                          }
                      });

                 
                });
            
            }//fin de else cuando Sí está en el preregistro
           
          });
      }//fin de if validacion de usuario

   
     //si existe en el preregistro y no tiene pulsera asignada se puede capturar pulsera y verificar que no sea usada para asignar al usuario
      if(this.validacionUsuario==true )
      {
        const pulseraTemp= this.formRegistro.get('txtPulsera')?.value;
       // const c=pulseraTemp.substring(3, 4);//posición 3 a la posicion 4 tomar lo que encuentre: "ROJA"-> "A"
       // console.log("posicion:"+c);
       
        /* if (c >= '0' && c <= '9')//valida si es numérico
         { 
          Swal.fire('Pulsera no válida! el CUM tiene máx 3 caracteres, la Pulsera debe tener más caracteres.', '', 'error');
         return;
          }*/
       let esvalido=false;
       if( this.isString( pulseraTemp.substring(0,5))==false )//si comienza con 5 numeros, es pulsera
        {
           const pulsera1eraParte= pulseraTemp.substring(0, 5) ;//debe ser solo numeros
           const pulsera2daParte=pulseraTemp.substring(5, 10);//debe ser solo texto

          //  console.log("No Es numero:"+pulsera1eraParte+" ? : "+ isNaN(pulsera1eraParte)  );
          //  console.log("No Es numero:"+pulsera2daParte+" ? : "+ isNaN( pulsera2daParte) );

          //se valida que la primera parte solo sea numeros
          if( this.isString( pulsera1eraParte)==true )
          {
            this.createMsg('Pulsera no válida! debe ser 5 números al inicio.');
            return;
          }
          //se valida que la segunda parte no sea numerica
          if( this.isString( pulsera2daParte)==false )
          {
            this.createMsg('Pulsera no válida! debe ser 5 caracteres al final.');
            return;
          }
          esvalido=true;
        }

        if( this.isString( pulseraTemp.substring(0,2))==true )//si comienza con 2 letras, es cum
        { 
            const pulsera1eraParte= pulseraTemp.substring(0, 2) ;//debe ser solo numeros
            const pulsera2daParte=pulseraTemp.substring(3, 10);//debe ser solo texto
            //se valida que la primera parte solo sea un cum tres letras
            if( this.isString(pulsera1eraParte)==false )
            {
              this.createMsg('Pulsera no válida! debe ser 2 caracteres al inicio.');
              return;
            }
            //se valida que la segunda parte no sea numerica
            if( this.isString(pulsera2daParte)==true )
            {
              this.createMsg('Pulsera no válida! debe ser 7 números al final.');
              return;
            }
             esvalido=true;
        } 

        if(!esvalido){   return;}
      
        
        this.dbSvc.getRegistroEventobyPulsera( pulseraTemp, this.MacroEvento, this.localUser.token, this.localUser.tokenjwt).subscribe(resp=>
          { 
           // console.log(resp);
            this.itemToEdit.pulsera=resp.pulsera;
            this.itemToEdit.macroEvento=this.MacroEvento;
            if(resp.pulsera=='')//si no tiene pulsera, se le puede asignar, de lo contario se muestra la pulsera asignada
            {   
              this.dbSvc.getRegistroEventoBajabyPulsera(pulseraTemp, this.localUser.token, this.localUser.tokenjwt).subscribe(respB=>
              { 
               // console.log(respB);
                this.itemToEdit.pulsera=respB.pulsera;
                if(respB.pulsera=='')//si la pulsera no existe en ninguna base, se asigna
                {
                  if(pulseraTemp=='')
                  { 
                     this.createMsg('Pulsera no válida! Favor de capturar una pulsera.');
                  }
                  else
                  {
                    //this.toastr.success("Asignando pulsera...","" ) ;
                    this.itemToEdit.pulsera=pulseraTemp;
                    this.addNewItem(this.itemToEdit);
                  }
                 
                }
                else//si se encontró en las pulseras dadas de baja, no hay asignación
                {
                  this.createMsg('Pulsera ya Registrada! La pulsera ya fue asignada y dada de baja.');
                  this.itemToEdit.pulsera='';
                  this.playAudio("error");
                  this.avisopulsera="La pulsera: "+pulseraTemp+" ya fue dada de baja y era del usuario: "
                                   + respB.nombre+ " con CUM: "+respB.cum;      
                  this.nombreEvento="Evento:"+respB.nombreEvento;
                }
              });
            }
            else //La pulsera ya esta asignada previamente, por lo que no se asignará nada
            {
              this.createMsg('Pulsera ya Registada! El usuario ya tiene una pulsera asignada.');
              this.itemToEdit.pulsera='';
              this.playAudio("error");
              this.avisopulsera="La pulsera: "+pulseraTemp+" ya fue asignada al usuario: "+ resp.nombre
                               + " con CUM: "+resp.cum+ " al Evento:"+resp.nombreEvento;
              this.nombreEvento="Evento:"+resp.nombreEvento;
            }

              //se consulta el color de la pulsera secun el macroevento, en caso de que exista
              this.dbSvc.getMacrocolorbyCUM(resp.cum,resp.macroEvento, this.localUser.token, this.localUser.tokenjwt).subscribe(respColor=>
                {
                  console.log("valor"+respColor.descripcion);
                  if(respColor.descripcion!='')
                    {
                     this.avisoTipoPulsera= " Tipo de Pulsera:"+respColor.descripcion;
                     this.colorTipoPulsera=respColor.color;
                    }
                  else
                    {
                      this.avisoTipoPulsera="";
                      this.colorTipoPulsera="";
                    }
                 });
            
          });
        
        }//fin de if para validar pulsera
 
    }

    

    addNewItem(itemToEdit: registroEventoDBModel) 
    {
    
     const objetoAsis:asistenteDBModel={idPaquete:this.idPaquete, idUsuario:this.idUsuarioAregistrar, usuarioLista:this.localUser.idUsuario};
     //console.log("Datos a actualizar"+objetoAsis);
      this.dbSvc.updateAsistenteAsistencia(objetoAsis,this.localUser.token, this.localUser.tokenjwt).subscribe(data=>
        { 
          this.toastr.success('Usuario Registrado en SISAS! El usuario ya tiene su asistencia actualizada.');
          this.playAudio("info");
        }); 

     //se actualiza la fecha más reciente cuando se hace el registro con la primer fecha de entrada
     itemToEdit.fechaEntrada=new Date(); itemToEdit.fechaEntrada.setHours(itemToEdit.fechaEntrada.getHours()-6);

   
     this.dbSvc.postRegistroEventoAsistencia(itemToEdit,this.localUser.token, this.localUser.tokenjwt).subscribe(data=>
      { 
      
            Swal.fire({
                          title: "Registro Exitoso!",
                          text: 'La pulsera se asignó de forma correcta!!!   Bienvenido  :) ',
                          timer: 2000, // 2000 milliseconds = 2 seconds
                          showConfirmButton: false ,// Optionally hide the confirmation button
                          icon:'success',didClose: () => { this.txtPulseraRef.nativeElement.focus(); this.cleanForm(); }
                      });
          this.playAudio("info");
          this.formRegistro.reset();
         
      }); 


    }



    consultarLogStatus():void
    {
      //consultamos el id de la persona que se logeó para los registro de Asistentes
      this.sharedSvc.currentStatu$.subscribe(respuesta=>{this.localUser=respuesta;});
      this.sharedSvc.currentUserMacroEvento$.subscribe(respuesta=>
        {this.MacroEvento=respuesta;
        
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
                      title: "No tienes permiso para registrar Asistencia en este Evento :(", text:"Debes contactar al Administrador del Evento",
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


    isString(x:string):boolean 
    {
    if ( isNaN((Number(x)) )   ) 
    {
    //  console.log(Number(x));
      return true; 
    }
    return false;
    }

     createMsg(msg:string):void
       {
          Swal.fire({
                          title: msg,
                          text: '',
                          timer: 1600, // 2000 milliseconds = 2 seconds
                          showConfirmButton: false ,// Optionally hide the confirmation button
                          icon:'error'
                      });
          this.playAudio("error");
          return;
        }

    iniciaForm():FormGroup
    {
      return this.frmBuilder.group({
                            txtCum:['',[Validators.required,Validators.minLength(10)] ], 
                            txtPulsera:['' ],                     
                          });
    }


}// fin de OnInit General
