
import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { ActivatedRoute, Params, Router } from '@angular/router';
import { VistaLoginModel } from 'src/app/models/VistaLoginModel';
import {  respuestaModel } from 'src/app/models/respuestaModel';
import { respuestaDBModel } from 'src/app/models/respuestaDBModel';
import { vwReactivoModel } from 'src/app/models/vwReactivoModel';
import { DbservicesService } from 'src/app/services/dbservices.service';
import { environment } from 'src/environments/environment';
import { Title } from '@angular/platform-browser';
import { ShareDataService } from 'src/app/services/shared-data.service';
 
@Component({
  selector: 'app-survey-salida',
  templateUrl: './survey-salida.component.html',
  styleUrls: ['./survey-salida.component.css']
})
export class SurveySalidaComponent implements OnInit  {


constructor(private readonly ar:ActivatedRoute,
            private readonly router: Router, 
            private readonly dbSvc:DbservicesService,
            private readonly sharedSvc:ShareDataService,
            private readonly titleSvc:Title )
            {
              this.titleSvc.setTitle("Encuesta de Salida :( ");
            }
//arrayPreguntas:PreguntaModel[]=[];
arrReactivos:vwReactivoModel[]=[];
arrRespuestas:respuestaModel[]=[];
idUsuarioTest!:string;
usuario:VistaLoginModel={idUsuario:"",nombre:"",password:"", email:"", cum:"", token:"", tokenjwt:''};
cuestinarioValido=false;
isAnswered=false;
tokenJWT:string='';


ngOnInit(): void { 
  this.consultarLogStatus();
  //en esta sección se deberá recolectar el id del usuario 
  this.ar.params.subscribe( (params:Params)=>{this.idUsuarioTest=params['id']; } );
  this.CargarUsuario(this.idUsuarioTest);
  //se deben cargar las pregunta por que son componentes autónomos
  this.CargarCuestionario(environment.idCuestionarioSalida);
  }
  

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


CargarCuestionario(idAgrupador:number):void
{
  //nos suscribimos al observable del servicio y recibimos su respuesta que son los datos
   this.dbSvc.getReactivos(idAgrupador,this.idUsuarioTest, this.tokenJWT ).subscribe(respuesta=> 
    {
     //this.arrayPreguntas=[...respuesta];
      this.arrReactivos=[...respuesta];
       
          //  console.log("los reactivos",this.arrReactivos);       
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

CargarUsuario(idUsuario:string):void
{
 //obtenemos token 
 this.sharedSvc.currentStatu$.subscribe(respuesta=>
  {
   this.usuario=respuesta;
   this.dbSvc.getUsuario(idUsuario,this.usuario.token, this.usuario.tokenjwt).subscribe(respuesta=>{this.usuario=respuesta;});
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



  console.log("valor arreglo Respuestas:", this.arrRespuestas);
  console.log("valor arreglo Reactivos:", this.arrReactivos);
   
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
         this.dbSvc.saveRespuesta(resp, this.tokenJWT).subscribe(resp=>
         {  //console.log("guardado");  
         } );
         }    
    });
}


onClickSubmit():void{   // 'testsurvey' 'home'
 // this.router.navigate(['testsurvey', this.idUsuarioTest  ] );
  window.location.reload();
}

consultarLogStatus():void
{
  this.sharedSvc.currentStatu$.subscribe(respuesta=>
    { 
      this.tokenJWT=respuesta.tokenjwt;
     //console.log("Valor del token login:", this.tokenLocal);
    });
}

}
