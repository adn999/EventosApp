import { reproducir } from 'src/app/services/haptica';
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
import { protectMemDBModel } from 'src/app/models/protectMemDBModel';


@Component({
  selector: 'app-protectmem',
  templateUrl: './protectmem.component.html',
  styleUrls: ['./protectmem.component.css'],
  animations:[trigger('mostrarTrigger', [state('hidden',style({ opacity:0})), transition('hidden => shown', [ useAnimation(transitionEntrada) ]),  ]),
  trigger('mostrarTriggerLeft', [state('hidden',style({ opacity:0})), transition('hidden => shown', [ useAnimation(transitionSalida) ]),  ]),
  trigger('mostrarTriggerCollapse', [state('hidden',style({ opacity:0})), transition('hidden => shown', [ useAnimation(transitionCollapse) ]) ]),]
})
export class ProtectmemComponent implements OnInit {

  formRegistro!: FormGroup ;

  constructor (private readonly dbSvc:DbservicesService,
    private readonly sharedSvc:ShareDataService,
    private readonly frmBuilder:FormBuilder,
    private readonly toastr:ToastrService,    
    private readonly titleSvc:Title,
    private readonly http:HttpClient,
    private readonly router: Router,
    private readonly sanitizer:DomSanitizer)
    {   this.titleSvc.setTitle("Protección a la Membresía"); }

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
            Swal.fire('Pulsera no válida! debe ser 5 caracteres numéricos al inicio.', '', 'error');
            return;
          }
          if( this.isString( pulsera2daParte)==false )
          {
            Swal.fire('Pulsera no válida! debe ser 5 caracteres numéricos al final.', '', 'error');
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
               Swal.fire('Pulsera no válida! debe ser 2 caracteres al inicio.', '', 'error');
               return;
             }
             if( this.isString(pulsera2daParte)==true )
             {
               Swal.fire('Pulsera no válida! debe ser 7 números al final.', '', 'error');
               return;
             }
             esvalido=true;
        } 
 
        if(!esvalido){     this.playAudio("error"); return;}
       

   this.dbSvc.getRegistroEventobyPulsera(this.Pulsera,this.macroEvento, this.localUser.token, this.localUser.tokenjwt).subscribe(resp=>
     {     
       if(resp==null){this.toastr.warning("CUM No Existe"); return;}
       else//si devuelve id evento válido, se cargan sus respuestas
       {
         //Se consulta si puede recibir kit por alguno de su conjunto de eventos
         this.dbSvc.getVistaRegistroEvento(resp.cum, this.macroEvento, this.localUser.token, this.localUser.tokenjwt).subscribe(respV=>
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
                 this.toastr.warning("La Pulsera no se encuentra para registrase en este evento:"+resp.nombre);   
                 const tempP=this.Pulsera;
                 this.avisoPulsera="Pulsera: "+tempP+", no está registrada o fue dada de baja :( ";
                 this.Pulsera=''; 
                 this.playAudio("error");
                 setTimeout(() => {this.txtPulseraRef.nativeElement.focus() ; }, 250); 
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

               this.RegistrarProteccionMembresia();
             }
          
       });//fin de validación si existe la pulsera

       }//fin de else si el cum sí existe     
     });
   }
 }


 RegistrarProteccionMembresia():void
  {
    //obtenemos los datos faltantes para registrar el kit del usuario en SISAS
    this.dbSvc.getVistaRegistroEvento(this.itemToEdit.cum, this.macroEvento, this.localUser.token, this.localUser.tokenjwt).subscribe(resp=>
      {   //console.log(resp);
          this.idUsuarioAregistrar=resp.idUsuario;
          this.idPaquete=resp.idPaquete;

          if(resp!=null)
          {
          var objetoProtectMem:protectMemDBModel={id:"",macroEvento:this.macroEvento, cumpm:this.localUser.cum, cum:this.itemToEdit.cum, fecha:new Date()};
          objetoProtectMem.fecha.setHours(objetoProtectMem.fecha.getHours()-6); 
          //console.log("Datos a actualizar"+objetoAsis);
           this.dbSvc.updateProtectMem(objetoProtectMem,this.localUser.token, this.localUser.tokenjwt).subscribe(data=>
             { 
               Swal.fire('Miembro Registrado en Protección a la Membresía correctamente.', '','success');
               this.playAudio("ok");
              }); 
          }
      });
  }





 cleanForm():void{
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


  playAudio(sonido:string){
    reproducir(sonido);
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
              if(!respuesta.protectMem)
              {
                Swal.fire({
                  title: "No tienes permiso para registrar en Protección a la Membresía de este Evento :(", text:"Debes contactar al Administrador del Evento",
                  icon:"info",iconColor:'purple',color: '#purple',
                  background:'rgba(255, 255, 255, 0.87)',backdrop: `rgba(0,0,123,0.4)`,
                  showDenyButton: false,confirmButtonText: 'Enterado',confirmButtonColor:'#CD6155'
                }).then((result) => {if (result.isConfirmed) { this.router.navigate(['home' ] );} });
              }
            });

        }
  });
 

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
