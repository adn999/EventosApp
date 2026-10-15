import { ModoCaptura, modoGuardado } from 'src/app/services/escaner';
import { Haptico, reproducir, vibrar } from 'src/app/services/haptica';
import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { DbservicesService } from 'src/app/services/dbservices.service';
import { ShareDataService } from 'src/app/services/shared-data.service';
import { ToastrService } from 'ngx-toastr';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';
import { registroEventoDBModel } from 'src/app/models/registroEventoDBModel';
import { state, style, transition, trigger, useAnimation } from '@angular/animations';
import { transitionCollapse, transitionEntrada, transitionSalida } from '../animation';
import { VistaLoginModel } from 'src/app/models/VistaLoginModel';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

@Component({
  selector: 'app-pulsera-perdida',
  templateUrl: './pulsera-perdida.component.html',
  styleUrls: ['./pulsera-perdida.component.css'],
  animations:[trigger('mostrarTrigger', [state('hidden',style({ opacity:0})), transition('hidden => shown', [ useAnimation(transitionEntrada) ]),  ]),
  trigger('mostrarTriggerLeft', [state('hidden',style({ opacity:0})), transition('hidden => shown', [ useAnimation(transitionSalida) ]),  ]),
  trigger('mostrarTriggerCollapse', [state('hidden',style({ opacity:0})), transition('hidden => shown', [ useAnimation(transitionCollapse) ]) ]),]
})
export class PulseraPerdidaComponent implements OnInit{

  
  formRegistro!: FormGroup ;

  //listQuestions:catQuestionDBModel[]=[];   
  //el evento ya debe existir para asignarlo al objeto de la clase
  itemToEdit:registroEventoDBModel={idEvento:0, cum:'', macroEvento:'', pulsera:'', nombre:'',nombreEvento:'', entrada:0,
                                    fechaEntrada:new Date() ,fechaSalida:new Date('2000,1,1'), kit:0};
  
  
  localUser!:VistaLoginModel;
  macroEvento:string='';
  idUsuarioAregistrar:string='';
  pulseraAnterior:string='';
  avisopulsera:string='';
  lblPulsera:string='';
  lblNombre:string='';
  avisoTipoPulsera:string='';
  colorTipoPulsera:string='';
  validacionGral:boolean=false;
  idEvento:number=0;
  nombreEvento:string='';
  imagePath:SafeResourceUrl='';
  
  arrEventos: string[] = [];
  estado='hidden';
  
  @ViewChild('txtCum', {static:false} )txtCumRef!:ElementRef;
  @ViewChild('txtPulsera', {static:false} )txtPulseraRef!:ElementRef;
 
   
  // Captura: 'teclado' (cuadro de texto / lector externo) o 'camara' (solo códigos de barras). Arranca en teclado y recuerda la última opción al navegar.
  modoCaptura: ModoCaptura = modoGuardado('pulsera-perdida');
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
      {   }


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
        this.idEvento=0;
        
        this.itemToEdit.cum='';
        this.avisopulsera='';
        this.lblNombre='';
        this.lblPulsera='';
        this.avisoTipoPulsera='';
        this.colorTipoPulsera='';
        this.playAudio("click");
        this.nombreEvento='';
        setTimeout(() => {this.txtCumRef.nativeElement.focus() ; }, 250);     
      }

      saveItem()
      {       
        //si no tiene valor el nombre del usuario o el paquete es 0 porque no se encontró el usuario, se consulta primero 
        if(this.lblNombre=='' || this.idEvento==0 )
        {
         // this.toastr.info("Buscando CUM","Validando si está registrado para el evento" ) ;
          this.dbSvc.getRegistroEventobyCUM( this.formRegistro.get('txtCum')?.value,this.macroEvento, this.localUser.token, this.localUser.tokenjwt).subscribe(resp=>
          { 
             // console.log(resp);
              this.itemToEdit.nombre=resp.nombre;
              this.itemToEdit.cum =resp.cum;
              this.itemToEdit.macroEvento=resp.macroEvento;
              this.itemToEdit.pulsera='';
              this.itemToEdit.kit=resp.kit;
              this.itemToEdit.entrada=resp.entrada;
              this.itemToEdit.idEvento=resp.idEvento;
              this.itemToEdit.nombreEvento=resp.nombreEvento;
              this.itemToEdit.fechaEntrada=resp.fechaEntrada;
              this.itemToEdit.fechaSalida=resp.fechaSalida;
              this.pulseraAnterior=resp.pulsera;
              this.idEvento=resp.idEvento;
              this.lblNombre=this.itemToEdit.nombre;
              this.lblPulsera=this.pulseraAnterior;
              this.imagePath='../../../assets/gifLogo.gif';
            
              if(resp.idEvento==0) //si no tiene dato es que no se localizó en el registro
              {
               this.createMsg('CUM No Localizado! Favor de registrarse al evento y asignar pulsera'); 
               this.formRegistro.patchValue({txtCum:''  });
               this.formRegistro.patchValue({txtPulsera:''  });
               setTimeout(() => {this.txtCumRef.nativeElement.focus() ; }, 250);  
               this.validacionGral=false;
               }
              else//Sí existe en el preregistro, por lo que se valida que no se le haya asignado una pulsera antes
              {
                this.toastr.info("CUM Localizado!","Listo para asignar su nueva pulsera : )   " ) ;
                this.avisopulsera="Listo para ingresar la pulsera que será asignada.";
                this.nombreEvento=this.itemToEdit.nombreEvento;
                this.arrEventos = this.nombreEvento.split("|");
                
                 //se consulta el color de la pulsera secun el macroevento, en caso de que exista
                 this.dbSvc.getMacrocolorbyCUM(resp.cum,resp.macroEvento, this.localUser.token, this.localUser.tokenjwt).subscribe(respColor=>
                  {
                   // console.log("valor"+respColor.descripcion);
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
                   
                     //se consulta imagen del usuario
                     this.dbSvc.getImage(resp.cum, this.localUser.token, this.localUser.tokenjwt).subscribe(respObjGenerico=>
                      {  
                      if(respObjGenerico.objetoGenerico!=null)
                        {
                          this.imagePath = this.sanitizer.bypassSecurityTrustResourceUrl('data:image/jpg;base64,'+ respObjGenerico.objetoGenerico);
                        }
                      else{this.imagePath='';}
                      });

                 //enfocará al cuadro de texto siguiente
                setTimeout(() => {this.txtPulseraRef.nativeElement.focus() ; }, 250);     
              }//fin de else cuando Sí está con pulsera asignada previamente   
          });
        }
  
     
       //si existe en el preregistro y notiene pulsera asignada se puede capturar pulsera y verificar que no sea usada para asignar al usuario
        if(this.idEvento>0 && this.itemToEdit.pulsera==''  )
        {
          const pulseraTemp= this.formRegistro.get('txtPulsera')?.value;
          
          let esvalido=false;
          if( this.isString( pulseraTemp.substring(0,5))==false )//si comienza con 5 numeros, es pulsera
            {
              const pulsera1eraParte= pulseraTemp.substring(0, 5) ;//debe ser solo numeros
              const pulsera2daParte=pulseraTemp.substring(5, 10);//debe ser solo texto
          
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
          
                  
          if(!esvalido){ this.playAudio("error"); return;}
          

          this.dbSvc.getRegistroEventobyPulsera(pulseraTemp,this.macroEvento,this.localUser.token, this.localUser.tokenjwt).subscribe(resp=>
            { 
             // console.log(resp);
              this.itemToEdit.pulsera=resp.pulsera;
              if(resp.pulsera=='')//si no tiene pulsera, se le puede asignar, de lo contario se muestra la pulsera asignada
              {   
                this.dbSvc.getRegistroEventoBajabyPulsera(pulseraTemp, this.localUser.token, this.localUser.tokenjwt).subscribe(respB=>
                { 
                  //console.log(respB);
                  this.itemToEdit.pulsera=respB.pulsera;
                  if(respB.pulsera=='')//si la pulsera no existe en ninguna base, se asigna
                  {
                    if(pulseraTemp=='')
                    {       
                      this.createMsg('Pulsera no válida! Favor de capturar una pulsera.');
                      this.playAudio("error");
                    }
                    else
                    {
                      this.validacionGral=true;
                      //this.toastr.success("Asignando pulsera...","" ) ;
                      this.itemToEdit.pulsera=pulseraTemp;
                      this.addNewItem(this.itemToEdit);
                    }
                   
                  }
                  else//si se encontró en las pulseras dadas de baja, no hay asignación
                  {
                    this.itemToEdit.pulsera='';
                    this.validacionGral=false;
                    this.formRegistro.patchValue({txtPulsera:''  });
                     this.playAudio("info", "ya");
                    this.toastr.warning("Pulsera ya Registada!","El usuario ya tiene una pulsera asignada." ) ;     
                    this.avisopulsera="La pulsera: "+pulseraTemp+" ya fue dada de baja y era del usuario: "+ respB.nombre
                                     + " con CUM: "+respB.cum; 
                    this.nombreEvento=respB.nombreEvento;   
                    this.arrEventos = this.nombreEvento.split("|");
                    
                    setTimeout(() => {this.txtPulseraRef.nativeElement.focus() ; }, 250);       
                  }
                });
              }
              else //La pulsera ya esta asignada previamente, por lo que no se asignará nada
              {
                this.itemToEdit.pulsera='';
                this.validacionGral=false;
                this.formRegistro.patchValue({txtPulsera:''  });
                 this.playAudio("info", "ya");
                this.toastr.warning("Pulsera ya Registada!","El usuario ya tiene una pulsera asignada." ) ;     
                this.avisopulsera="La pulsera: "+pulseraTemp+" ya fue asignada al usuario: "+ resp.nombre
                                 + " con CUM: "+resp.cum;
                this.nombreEvento=this.itemToEdit.nombreEvento;
                this.arrEventos = this.nombreEvento.split("|");
                
                setTimeout(() => {this.txtPulseraRef.nativeElement.focus() ; }, 250);     
              }
              
            });       
          }//fin de if para validar pulsera
        
      }
  
  addNewItem(itemToEdit: registroEventoDBModel) 
      {
       const itemOld:registroEventoDBModel={idEvento:this.idEvento, macroEvento:this.macroEvento, cum:itemToEdit.cum, pulsera:this.pulseraAnterior, 
                                            nombre:itemToEdit.nombre, nombreEvento:itemToEdit.nombreEvento, entrada:itemToEdit.entrada,
                                            fechaEntrada:itemToEdit.fechaEntrada, fechaSalida:itemToEdit.fechaSalida, kit:itemToEdit.kit};
       this.dbSvc.postRegistroEventoBajaPulsera(itemOld,this.localUser.token, this.localUser.tokenjwt).subscribe(data=>
        { 
          this.createMsg('Pulsera anterior respaldada! La pulsera anterior se ha dado de baja');
           this.playAudio("error");
        }); 

       this.dbSvc.postRegistroEventoAsistencia(itemToEdit,this.localUser.token, this.localUser.tokenjwt).subscribe(data=>
        { 
           this.playAudio("ok");
            Swal.fire('La nueva pulsera se asignó de forma correcta, no la pierdas ;) ', '', 'success');
            this.formRegistro.reset();
            this.cleanForm();
        }); 
      }
  
      consultarLogStatus():void
      {
        //consultamos el id de la persona que se logeó para los registro de Asistentes
          this.sharedSvc.currentStatu$.subscribe(respuesta=>{ this.localUser=respuesta;}); 
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
                          title: "No tienes permiso para reosición de Pulseras de este Evento :(", text:"Debes contactar al Administrador del Evento",
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
  
   

   createMsg(msg:string):void
    {
        Swal.fire({
                        title: msg,
                        text: '',
                        timer: 1600, // 2000 milliseconds = 2 seconds
                        showConfirmButton: false ,// Optionally hide the confirmation button
                        icon:'error', didClose: () => {   this.cleanForm(); this.txtCumRef.nativeElement.focus() ;}
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
                              txtCum:['',[Validators.required,Validators.minLength(10)] ], 
                              txtPulsera:['' ],                      
                                     });
      }
  
  }// fin de OnInit General
  