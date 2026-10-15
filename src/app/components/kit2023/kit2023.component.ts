import { ChangeDetectionStrategy, Component, ElementRef, OnInit, Signal, ViewChild } from '@angular/core';
import { ActivatedRoute, Params, Router } from '@angular/router';
import { VistaLoginModel } from 'src/app/models/VistaLoginModel';
import {  respuestaModel } from 'src/app/models/respuestaModel';
import { respuestaDBModel } from 'src/app/models/respuestaDBModel';
import { vwReactivoModel } from 'src/app/models/vwReactivoModel';
import { DbservicesService } from 'src/app/services/dbservices.service';
import { environment } from 'src/environments/environment';
import { Title } from '@angular/platform-browser';
import { ShareDataService } from 'src/app/services/shared-data.service';
import { ToastrService } from 'ngx-toastr';
import { registroEventoDBModel } from 'src/app/models/registroEventoDBModel';
import Swal from 'sweetalert2';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import {toSignal} from  '@angular/core/rxjs-interop';//para cambiar observables a signal

import { HttpClient} from '@angular/common/http';
import { asistenteDBModel } from 'src/app/models/asistenteDBModel';
import { state, style, transition, trigger, useAnimation } from '@angular/animations';
import { transitionCollapse, transitionEntrada, transitionSalida } from '../animation';
 
@Component({
  selector: 'app-kit2023',
  templateUrl: './kit2023.component.html',
  styleUrls: ['./kit2023.component.css'],
  animations:[trigger('mostrarTrigger', [state('hidden',style({ opacity:0})), transition('hidden => shown', [ useAnimation(transitionEntrada) ]),  ]),
              trigger('mostrarTriggerLeft', [state('hidden',style({ opacity:0})), transition('hidden => shown', [ useAnimation(transitionSalida) ]),  ]),
              trigger('mostrarTriggerCollapse', [state('hidden',style({ opacity:0})), transition('hidden => shown', [ useAnimation(transitionCollapse) ]) ]),]
})
export class Kit2023Component implements OnInit  {


constructor(private readonly ar:ActivatedRoute,
            private readonly router: Router, 
            private readonly dbSvc:DbservicesService,
            private readonly sharedSvc:ShareDataService,
            private readonly titleSvc:Title,
            private readonly toastr:ToastrService,
            private readonly http:HttpClient ,
            private readonly sanitizer:DomSanitizer)
            {
              this.titleSvc.setTitle("Foods");
            }
//arrayPreguntas:PreguntaModel[]=[];

@ViewChild('txtPulsera', {static:false} )txtPulseraRef!:ElementRef;
 
arrReactivos:vwReactivoModel[]=[];
arrRespuestas:respuestaModel[]=[];
idUsuarioTest!:string;

cuestinarioValido=false;
isAnswered=false;

idUsuarioAregistrar!:string;
idPaquete:number=0;

localUser!:VistaLoginModel;
macroEvento:string='';
IdCuestionarioEvento:number=0;
Pulsera:string='';
avisoPulsera:string='';
lblPulsera:string='';
lblNombre:string='';
lblCum:string='';
avisoTipoPulsera:string='';
colorTipoPulsera:string='';
nombreEvento:string='';
imagePath:SafeResourceUrl='';
datosJson:any;
arrEventos: string[] = [];

itemToEdit:registroEventoDBModel={idEvento:0,macroEvento:'', cum:'', pulsera:'', nombre:'', nombreEvento:'',
                                   entrada:0,fechaEntrada:new Date() ,fechaSalida:new Date('2000,1,1'), kit:0};
  
estado='hidden';

  //para que cambie el estado de la variable inicial para animación
ngAfterViewInit(){ setTimeout( () => { this.estado = 'shown';}, 200);}

ngOnInit(): void
 {  //no carga las preguntas vacías hasta que se carga el cum
  this.consultarLogStatus();  
  setTimeout(() => {this.txtPulseraRef.nativeElement.focus() ; }, 250); 
  this.leerArchivo();
 }
  

  leerArchivo() 
 {
  const title = 'json-read-example';
  var studentData:any;
  const url: string = '../../../assets/connections.json';
  this.http.get(url).subscribe(res => {  studentData = res;
                                 this.datosJson=res; 
                                 this.IdCuestionarioEvento=this.datosJson.IdCuestionarioEvento;  });
 } 

  onLogin():void
  {
    if(this.Pulsera.length>0)
    {

        /* const pulsera1eraParte= this.Pulsera.substring(0, 5) ;//debe ser solo numeros
        const pulsera2daParte=this.Pulsera.substring(5, 10);//debe ser solo texto
        //se valida que la primera parte solo sea numeros
        if( this.isString(pulsera1eraParte)==true )
        {
          Swal.fire('Pulsera no válida! debe ser 5 caracteres numéricos al inicio.', '', 'error');
          return;
        }
        //se valida que la segunda parte no sea numerica
        if( this.isString( pulsera2daParte)==false )
        {
          Swal.fire('Pulsera no válida! debe ser 5 caracteres numéricos al final.', '', 'error');
          return;
        } */

          const pulsera1eraParte= this.Pulsera.substring(0, 3) ;//debe ser solo numeros
          const pulsera2daParte= this.Pulsera.substring(3, 10);//debe ser solo texto
                  //se valida que la primera parte solo sea un cum tres letras
                  if( this.isString(pulsera1eraParte)==false )
                  {
                    Swal.fire('Pulsera no válida! debe ser 3 caracteres al inicio.', '', 'error');
                    return;
                  }
                  //se valida que la segunda parte no sea numerica
                  if( this.isString(pulsera2daParte)==false )
                  {
                    Swal.fire('Pulsera no válida! debe ser 7 números al final.', '', 'error');
                    return;
                  }

    this.dbSvc.getRegistroEventobyPulsera(this.Pulsera, this.macroEvento, this.localUser.token, this.localUser.tokenjwt).subscribe(resp=>
      {
        if(resp==null){this.toastr.warning("CUM No Existe");}
        else//si devuelve id evento válido, se cargan sus respuestas
        {

            //Se consulta si puede recibir kit por alguno de su conjunto de eventos
            this.dbSvc.getVistaRegistroEvento(resp.cum, this.macroEvento, this.localUser.token, this.localUser.tokenjwt).subscribe(respV=>
              {
                if(respV.incluyeAlimentos==null ||respV.incluyeAlimentos==false)
                { 
                  Swal.fire('Su evento no incluye Alimentos :[','','warning');
                  return;
                }
                else
                { 
                  //console.log(resp);
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
                    this.toastr.warning("La Pulsera no se encuentra para Kit y/o alientos:"+resp.nombre);   
                    const tempP=this.Pulsera;
                    this.avisoPulsera="Pulsera: "+tempP+", no está registrada o fue dada de baja :( ";
                    this.Pulsera=''; 
                    this.arrReactivos=[];
                    setTimeout(() => {this.txtPulseraRef.nativeElement.focus() ; }, 250); 
                  }
                else
                {
                  this.avisoPulsera="Pulsera localizada correctamente.";
                  this.nombreEvento=this.itemToEdit.nombreEvento;
                  this.arrEventos = this.nombreEvento.split("|");
                  this.lblCum=this.itemToEdit.cum;
                  this.lblNombre=this.itemToEdit.nombre;
                  this.lblPulsera=this.itemToEdit.pulsera;
                  this.imagePath='../../../assets/gifLogo.gif';

                  this.Pulsera='';   

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

                  setTimeout(() => {this.txtPulseraRef.nativeElement.focus() ; }, 250); 

                  //se deben cargar las pregunta por que son componentes autónomos
                  this.CargarCuestionario(this.macroEvento );
                }
              }//fin de else en caso de que SÍ merece comidas

              });//fin de consulta si incluye comidas
        }     
      });
    }
  }

  cleanForm():void{
    this.Pulsera='';
     //vaciamos array si tenia otras respuestas de otra usuario
    this.arrReactivos=[];
    this.avisoPulsera='';
    this.lblCum='';
    this.lblNombre='';
    this.lblPulsera='';
    this.avisoTipoPulsera='';
    this.colorTipoPulsera='';
    this.nombreEvento='';
    setTimeout(() => {this.txtPulseraRef.nativeElement.focus() ; }, 250); 
    this.itemToEdit.idEvento=0;
  }
  

  //-----FUNCIONES de CUESTIONARIO


Muestra(val:respuestaModel):void
{
  //si ya existe el elemento
  const tempArray= this.arrRespuestas.filter(x => x.id_pregunta !== val.id_pregunta ); 
  this.arrRespuestas=[...tempArray];//agregamos todos, menos el que se va a validar
  //si es válido, lo agrega al arreglo de respuestas, de lo contrario lo quita
  this.validaRespuesta(val);

   //si el conteo de las respuestas válidas es el correcto, habilita el botón enviar
   if(this.arrRespuestas.length===this.arrReactivos.length){this.cuestinarioValido=true;}
   else{this.cuestinarioValido=false;}
}

CargarCuestionario(macroEvento:string):void
{
  //nos suscribimos al observable del servicio y recibimos su respuesta que son los datos
   this.dbSvc.getReactivosbyMacroEvento(macroEvento, this.itemToEdit.cum  , this.localUser.tokenjwt).subscribe(respuesta=> 
    {
     //this.arrayPreguntas=[...respuesta];
      this.arrReactivos=[...respuesta];
       
      if(this.arrReactivos[0].idAgrupador==0)
        {  
          Swal.fire({
            title: "No hay Comidas para registrar en este Evento :(", text:"Debes contactar al Admin. del Evento para agregar comidas a registrar",
            icon:"info",confirmButtonText: 'Enterado',});
        }
            console.log("los reactivos",this.arrReactivos);       
         this.isAnswered=true;
         this.arrReactivos.forEach(element => 
          {   //validamos si ya se contestó todo correctamente
           if(element.respuesta==''){this.isAnswered=false;} 

           //cargarmos las respuestas para que valide cuantas son las restantes
           const newresp:respuestaModel={ id:0,id_pregunta:element.id_pregunta, tipoReactivo:element.tipoReactivo,
                                          isRequired:element.isRequired,  cum:element.cum, respuesta:element.respuesta  } 
            this.arrRespuestas.push(newresp);                         
          });

           if(this.isAnswered ){console.log("todos los reactivos tienen respuestas");}
    });

}

validaRespuesta(val:respuestaModel):void{
 
if(val.cum==''){return;}

  //si es tipo 1 texto,2 texto largo  y 3 Fecha pregunta de texto corto
  if(val.tipoReactivo==1 || val.tipoReactivo==2 || val.tipoReactivo==3)
  {
    if(val.isRequired)
    {
    if(val.respuesta!=="" || val.respuesta.length>5)
    { this.arrRespuestas.push(val);   } 
    }else{  this.arrRespuestas.push(val); }
  }

  //si es 4 número
  if(val.tipoReactivo==4 )
  {
    if(val.isRequired)
    {
      if( val.respuesta!=null)
      { 
        const numero=Number(val.respuesta);
        if(!Number.isNaN(val.respuesta) ) 
          { if(numero>0)
            { val.respuesta=val.respuesta.toString();
              this.arrRespuestas.push(val);} 
          }
      } 
    }else{ val.respuesta=val.respuesta.toString(); this.arrRespuestas.push(val);}
  }
//5 es true-false y 6 es select
  if(val.tipoReactivo==5 || val.tipoReactivo==6 )
  {
    if(val.isRequired) {
    if(   val.respuesta!="Seleccione..." && val.respuesta!="Otro"   && val.respuesta.length>2)
    { this.arrRespuestas.push(val);} 
    } else{ this.arrRespuestas.push(val);}
  }
  //7 es check y si es obligatorio lo valida
  if(val.tipoReactivo==7  )
  {
    if(val.isRequired)
    { // console.log("valor de resp:", val.strRespuesta);
    if(val.respuesta)
    { val.respuesta=val.respuesta.toString();  this.arrRespuestas.push(val);} 
    }else{val.respuesta=val.respuesta.toString(); this.arrRespuestas.push(val);}
  }

  //si es checklistbox
  if(val.tipoReactivo==8 )
  {
    if(val.isRequired)
    { // console.log("valor de resp:", val.strRespuesta);
    if(val.respuesta.length>2)
    {  this.arrRespuestas.push(val);} 
    }else{  this.arrRespuestas.push(val);}
  }

   
  
  //si es cel o email o cum
  if(val.tipoReactivo==9 || val.tipoReactivo==10|| val.tipoReactivo==11 )
  {
    if(val.isRequired)
    { // console.log("valor de resp:", val.respuesta);
    if(val.respuesta.length>9)
    {  this.arrRespuestas.push(val);} 
    }else{  this.arrRespuestas.push(val);}
  }

 // console.log("valor arreglo Respuestas:", this.arrRespuestas);
 // console.log("valor arreglo Reactivos:", this.arrReactivos);
   
  if( this.arrRespuestas.length===this.arrReactivos.length){this.cuestinarioValido=true; }
  this.saveRespuestas();
  
}

//guarda las respuesta actuales y si ya existían, reemplaza las respuestas
saveRespuestas():void
{
  this.arrRespuestas.forEach(resp => 
    {
         if(resp.cum!='')//para que no guarde inicialmente todas las preguntas sin contestar
         {
         this.dbSvc.saveRespuesta(resp, this.localUser.tokenjwt).subscribe(resp=>
         { // console.log("guardado");  
         } );
         }    
    });
}

onClickSubmit():void{    window.location.reload(); }




 isString(x:string):boolean 
 {
  if ( isNaN((Number(x)) )   ) 
  {
  //  console.log(Number(x));
    return true; 
  }
  return false;
 }


 consultarLogStatus():void
 {
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
              if(!respuesta.comidas)
              {
                Swal.fire({
                  title: "No tienes permiso para registrar Comidas de este Evento :(", text:"Debes contactar al Administrador del Evento",
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


}//fin de onInit
