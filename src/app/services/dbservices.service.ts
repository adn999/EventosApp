import { HttpClient, HttpErrorResponse, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable, Signal } from '@angular/core';
import { environment } from 'src/environments/environment';
import { respuestaModel } from '../models/respuestaModel';
import { Observable, catchError, throwError } from 'rxjs';
import { vwReactivoModel } from '../models/vwReactivoModel';
import { VistaLoginModel } from '../models/VistaLoginModel';
import { respuestaDBModel } from '../models/respuestaDBModel';
import { catQuizzDBModel } from '../models/catQuizzDBModel';
import { catQuestionDBModel } from '../models/catQuestionDBModel';
import { catTipoReactivoDBModel } from '../models/catTipoReactivoDBModel';
import { VistaRegistroEvento } from '../models/VistaRegistroEvento';
import { registroEventoDBModel } from '../models/registroEventoDBModel';
import { asistenteDBModel } from '../models/asistenteDBModel';
import {toSignal} from  '@angular/core/rxjs-interop';//para cambiar observables a signal
import { VistaSaludGeneral } from '../models/VistaSaludGeneralModel';
import { VistaSaludVacunas } from '../models/VistaSaludVacunas';
import { VistaSaludFicha } from '../models/VistaSaludFicha';
import { VistaSaludFichaPsicologica } from '../models/VistaSaludFichaPsicologica';
import { HistorialMedicoDBModel } from '../models/HistorialMedicoDBModel';
import Swal from 'sweetalert2';
import { Router } from '@angular/router';
import { _MatCheckboxRequiredValidatorModule } from '@angular/material/checkbox';
import { VistaConsultaMiembros } from '../models/VistaConsultaMiembros';
import { VistaMacroEventosbyCUM } from '../models/VistaMacroEventosbyCUM';
import { macrocolorDBModel } from '../models/macrocolorDBModel';
import { respuestaGenericaModel } from '../models/respuestaGenericaModel';
import { protectMemDBModel } from '../models/protectMemDBModel';
import { reporteRegistrosDBModel } from '../models/reporteRegistrosDBModel';
import { reporteRegistrosColorDBModel } from '../models/reporteRegistrosColorDBModel';
import { reporteRankingStaffRegistroDBModel } from '../models/reporteRankingStaffRegistroDBModel';
import { reporteRankingStaffKitDBModel } from '../models/reporteRankingStaffKitDBModel';
import { reporteMenoresFallaDBModel } from '../models/reporteMenoresFallaDBModel';
import { reporteDocuSealDBModel } from '../models/reporteDocuSealDBModel';
import { reporteDiaDBModel } from '../models/reporteDiaDBModel';
import { catComidaHorarioDBModel } from '../models/catComidaHorarioDBModel';
import { VistaComidaEvento } from '../models/VistaComidaEvento';
import { registroEventoComidaDBModel } from '../models/registroEventoComidaDBModel';
import { EventoDBModel } from '../models/EventoDBModel';
import { catComidasDBModel } from '../models/catComidasDBModel';
import { reporteConteoComidasDBModel } from '../models/reporteConteoComidasDBModel';
import { reporteRankingStaffAlimentosDBModel } from '../models/reporteRankingStaffAlimentosDBModel';
import { SesionGuardadaService } from './sesion-guardada.service';


@Injectable({ providedIn: 'root' })

export class DbservicesService {

  constructor(private readonly http:HttpClient,
              private readonly router: Router,
              private readonly sesion: SesionGuardadaService  ) { }
private intOpt=2; //1 UAT o 2 PROD
private readonly strPathUAT = environment.routeUAT;

private readonly strPathProd = environment.routeProd;

/** Ruta base de la API según el ambiente (la usa la app del Apple Watch para consultar por su cuenta). */
rutaApi():string { return this.intOpt==1? this.strPathUAT : this.strPathProd; }
//private readonly strPathProd= environment.routeProdFromUAT;

private readonly strurlcatTipoReactivo = environment.apiURLcat_TipoReactivo;
private readonly strurlcatQuizz = environment.apiURLcat_Quizz;
private readonly strurlcat_Questions =environment.apiURLcat_Questions;
private readonly strurlRespuestas =environment.apiURLRespuestas;

private readonly strurlLogin =environment.apiURLLogin;
private readonly strurlLoginToken =environment.apiURLLoginToken;
private readonly strurlLoginGetCumInfo=environment.apiURLLoginGetCumInfo;
private readonly strurlMiembroConsultaCUM =environment.apiURLMiembroConsultaCUM;

private readonly strurlVistaRegistroEvento=environment.apiURLVistaRegistroEvento;
private readonly strurlAsistentesAsistencia=environment.apiURLAsistentesAsistencia;
private readonly strurlAsistentesKit=environment.apiURLAsistentesKit;

private readonly strurlPermisoscatMacroEventos=environment.apiURLPermisoscatMacroEventos;
private readonly strurlPermisosVistaConsultaMiembros=environment.apiURLPermisosVistaConsultaMiembros;
private readonly strurlPermisosVistaMacroEventosbyCUM=environment.apiURLPermisosVistaMacroEventosbyCUM;

private readonly strurlRegistroEvento=environment.apiURLRegistroEvento;
private readonly strurlRegistroEventobyCUM=environment.apiURLRegistroEventobyCUM;
private readonly strurlRegistroEventobyPulsera=environment.apiURLRegistroEventobyPulsera;
private readonly strurlRegistroEventoGetImg=environment.apiURLRegistroEventoGetImg;

private readonly strurlRegistroEventoBajabyPulsera = environment.apiURLRegistroEventoBajabyPulsera;
private readonly strurlRegistroEventoBajaPulsera= environment.apiURLRegistroEventoBajaPulsera;
private readonly strurlRegistroEventoMacrocolorbyCUM= environment.apiURLRegistroEventoMacrocolorbyCUM;

private readonly strurlRegistroEventoReporteRegistros= environment.apiURLRegistroEventoReporteRegistros;
private readonly strurlRegistroEventoReporteTarjetas= environment.apiURLRegistroEventoReporteTarjetas;
private readonly strurlRegistroEventoReporteColores= environment.apiURLRegistroEventoReporteColores;
private readonly strurlRegistroEventoReporteDocuSeal= environment.apiURLRegistroEventoReporteDocuSeal;
private readonly strurlRegistroEventoReporteDia= environment.apiURLRegistroEventoReporteDia;
private readonly strurlRegistroEventoReportePdf= environment.apiURLRegistroEventoReportePdf;

private readonly strurlRegistroEventoReporteRankingStaffRegistro= environment.apiURLRegistroEventoReporteRankingStaffRegistro;
private readonly strurlRegistroEventoReporteRankingStaffKit= environment.apiURLRegistroEventoReporteRankingStaffKit;
private readonly strurlRegistroEventoReporteRankingStaffComidas= environment.apiURLRegistroEventoReporteRankingStaffComidas;

private readonly strurlProtectMembyId= environment.apiURLProtectMembyId;
private readonly strurlProtectMem= environment.apiURLProtectMem;
private readonly strurlProtectMemReporte= environment.apiURLProtectMemReporte;
 
private readonly strurlVistaSaludGeneral= environment.apiURLVistaSaludGeneral;
private readonly strurlVistaSaludFicha= environment.apiURLVistaSaludFicha;
private readonly strurlVistaSaludFichaPsicologica= environment.apiURLVistaSaludFichaPsicologica;
private readonly strurlVistaSaludVacunas= environment.apiURLVistaSaludVacunas;

private readonly strurlSaludHistorialbyCUM = environment.apiURLSaludHistorialbyCUM;
private readonly strurlSaludHistorial = environment.apiURLSaludHistorial;

private readonly strurlDocuSealGetUnnotifiedMinors = environment.apiURLDocuSealGetUnnotifiedMinors;
private readonly strurlDocuSealSendUnnotifiedMinors = environment.apiURLDocuSealSendUnnotifiedMinors;
private readonly strurlDocuSealGetUnnotifiedMinorsDetails = environment.apiURLDocuSealGetUnnotifiedMinorsDetails;
private readonly strurlDocuSealGetMinorsWithInvalidPhoneDetails = environment.apiURLDocuSealGetMinorsWithInvalidPhoneDetails;

private readonly strurlRegistroEventoComidacatComidas= environment.apiURLRegistroEventocatComidas;
private readonly strurlRegistroEventoComidacatComidaHorario=environment.apiURLRegistroEventoComidacatComidaHorario;
private readonly strurlRegistroEventoComidaGetcatComidaHorario=environment.apiURLRegistroEventoComidaGetcatComidaHorario;
private readonly strurlRegistroEventoComidaPostcatComidaHorario=environment.apiURLRegistroEventoComidaPostcatComidaHorario;

private readonly strurlRegistroEventoComida=environment.apiURLRegistroEventoComida;
private readonly strurlRegistroEventoComidaGetEventoComida=environment.apiURLRegistroEventoComidaGetEventoComida;
private readonly strurlRegistroEventoComidaVistaComidaEvento=environment.apiURLRegistroEventoComidaVistaComidaEvento;
private readonly strurlRegistroEventoComidaValidaComidaHorario=environment.apiURLRegistroEventoComidaValidaComidaHorario;

private readonly strurlRegistroEventoComidacatMacroEventosAlimentos=environment.apiURLRegistroEventoComidacatMacroEventosAlimentos;
private readonly strurlRegistroEventoComidacatEventosAlimentos=environment.apiURLRegistroEventoComidacatEventosAlimentos;
private readonly strurlRegistroEventoComidaGetVistaComidasbyidEvento=environment.apiURLRegistroEventoComidaGetVistaComidasbyidEvento;
private readonly strurlRegistroEventoComidaPostcatComidaEvento=environment.apiURLRegistroEventoComidaPostcatComidaEvento;

private readonly strurlRegistroEventoComidareporteConteoComida=environment.apiURLRegistroEventoComidareporteConteoComida;

//servicio para obtener imagen 
getImage( cum:string, token:string, jwt:string):Observable<respuestaGenericaModel>
{
  const path= this.intOpt==1? `${this.strPathUAT}`:`${this.strPathProd}`;
  const url= `${path}${this.strurlRegistroEventoGetImg}`;
  
  let _headers=new HttpHeaders().set('Authorization','Bearer '+jwt);
  let _params= new HttpParams().set('cum',cum).set('token',token);

  var respObj= this.http.post<respuestaGenericaModel>(url,null,{headers:_headers, params:_params}).pipe(catchError(this.handleError));
  return respObj; 
}


getcatTipoReactivo(jwt:string):Observable<catTipoReactivoDBModel[]>
{  
  const path= this.intOpt==1? `${this.strPathUAT}`:`${this.strPathProd}`;
  const url= `${path}${this.strurlcatTipoReactivo}`; 
  let _headers=new HttpHeaders().set('Authorization','Bearer '+jwt);
   //  console.log("dirección url:", url );
    var checkresp= this.http.get<catTipoReactivoDBModel[]>( url,{headers:_headers} ).pipe(catchError(this.handleError));   
    return checkresp;
}
 
//------------CATALOGO Cat_Questions preguntas que componen un quizz-cuestionario
getcatQuestions(idAgrupador:number, jwt:string):Observable<catQuestionDBModel[]>
{ 
  const path= (this.intOpt==1)? `${this.strPathUAT}`:`${this.strPathProd}`;
  const url=`${path}${this.strurlcat_Questions}/byGroup`; //  console.log("dirección url:", url );
  let _headers=new HttpHeaders().set('Authorization','Bearer '+jwt);
  let _params= new HttpParams().set('idAgrupador',idAgrupador);
  var checkresp= this.http.get<catQuestionDBModel[]>( `${url}`, {headers:_headers, params:_params}).pipe(catchError(this.handleError));  
    return checkresp;
}

savecatQuestion(item:catQuestionDBModel, jwt:string):Observable<catQuestionDBModel>{
  const path= (this.intOpt==1)? `${this.strPathUAT}`:`${this.strPathProd}`;
  const url= `${path}${this.strurlcat_Questions}`; 
  let _headers=new HttpHeaders().set('Authorization','Bearer '+jwt);
  //el item recibido es igual al body solicitado
  return this.http.post<catQuestionDBModel>(url,item, {headers:_headers}).pipe(catchError(this.handleError));
}
updatecatQuestion(item:catQuestionDBModel,jwt:string):Observable<void>{
  const path= (this.intOpt==1)? `${this.strPathUAT}`:`${this.strPathProd}`;
  const url= `${path}${this.strurlcat_Questions}`; 
  let _headers=new HttpHeaders().set('Authorization','Bearer '+jwt);
  return this.http.put<void>( `${url}/${item.id}`,item, {headers:_headers});
}
//-------------------------------------------------------------------------------
getcatQuizzes(jwt:string):Observable<catQuizzDBModel[]>
{  
  const path= (this.intOpt==1)? `${this.strPathUAT}`:`${this.strPathProd}`;
  let _headers=new HttpHeaders().set('Authorization','Bearer '+jwt);
  const url= `${path}${this.strurlcatQuizz}`; 
   //  console.log("dirección url:", url );
    var checkresp= this.http.get<catQuizzDBModel[]>( url, {headers:_headers} ).pipe(catchError(this.handleError));   
    return checkresp;
}
  
savecatQuizz(item:catQuizzDBModel,jwt:string):Observable<catQuizzDBModel>{
  const path= (this.intOpt==1)? `${this.strPathUAT}`:`${this.strPathProd}`;
  const url= `${path}${this.strurlcatQuizz}`;
  let _headers=new HttpHeaders().set('Authorization','Bearer '+jwt);
  const body={idAgrupador:item.idAgrupador, nombreEncuesta:item.nombreEncuesta};
  //console.log("como quedó el body:",body);
  return this.http.post<catQuizzDBModel>(url,body, {headers:_headers}).pipe(catchError(this.handleError));
}
updatecatQuizz(item:catQuizzDBModel,jwt:string):Observable<void>{
  const path= (this.intOpt==1)? `${this.strPathUAT}`:`${this.strPathProd}`;
  const url= `${path}${this.strurlcatQuizz}`;
  let _headers=new HttpHeaders().set('Authorization','Bearer '+jwt);
  const body={idAgrupador:item.idAgrupador, nombreEncuesta:item.nombreEncuesta};
  return this.http.put<void>( `${url}/${item.idAgrupador}` ,body, {headers:_headers});
}

//---------------------------------------------------------------------------------------------
getReactivos(idAgrupador:number, idUsuario:string, jwt:string):Observable<vwReactivoModel[]>
{
  const path= (this.intOpt==1)? `${this.strPathUAT}`:`${this.strPathProd}`;
  const url=`${path}${this.strurlRespuestas}/Reactivos`;
  let _headers=new HttpHeaders().set('Authorization','Bearer '+jwt);
  let _params= new HttpParams().set('idAgrupador',idAgrupador).set('idUsuario',idUsuario);
//  console.log("dirección url:", url ); 
  var checkresp= this.http.post<vwReactivoModel[]>( `${url}`, null,{headers:_headers, params:_params} ).pipe(catchError(this.handleError));
  return checkresp;
}

getReactivosbyMacroEvento(macroEvento:string, cum:string, jwt:string):Observable<vwReactivoModel[]>
{
  const path= (this.intOpt==1)? `${this.strPathUAT}`:`${this.strPathProd}`;
  const url=`${path}${this.strurlRespuestas}/ReactivosbyMacroEvento`;
  let _headers=new HttpHeaders().set('Authorization','Bearer '+jwt);
  let _params= new HttpParams().set('macroEvento',macroEvento).set('cum',cum);
 // console.log("datos:", macroEvento+' y '+cum ); 
  var checkresp= this.http.post<vwReactivoModel[]>( `${url}`, null,{headers:_headers, params:_params} ).pipe(catchError(this.handleError));
  return checkresp;
}

/* getReactivos(idAgrupador:number, idUsuario:string): Signal<vwReactivoModel[]> {
  const path= (this.intOpt==1)? `${this.strPathUAT}`:`${this.strPathProd}`;
  const url=`${path}${this.strurlRespuestas}/Reactivos?idAgrupador=${idAgrupador}&idUsuario=${idUsuario}`;
  const miobservable = this.http.get<vwReactivoModel[]>(url ).pipe(catchError(this.handleError));  
  return toSignal(miobservable, {requireSync:true});
} */

saveRespuesta(item:respuestaModel, jwt:string):Observable<respuestaDBModel>{
  const path= (this.intOpt==1)? `${this.strPathUAT}`:`${this.strPathProd}`;
  const url= `${path}${this.strurlRespuestas}`;
  let _headers=new HttpHeaders().set('Authorization','Bearer '+jwt);
  //definimos el body para enviar datos
  const body={id_pregunta:item.id_pregunta, cum:item.cum, respuesta:item.respuesta};
  //console.log("como quedó el body:",body);
  return this.http.post<respuestaDBModel>(url,body,{headers:_headers}).pipe(catchError(this.handleError));
}

//---------------------------------FUNCIONES para LOGN y obtener datos básicos de usuario-----------------------------------------------------

DoLogin(usu:string, pass:string):Observable<string>{
  const path= (this.intOpt==1)? `${this.strPathUAT}`:`${this.strPathProd}`;
  const url= `${path}${this.strurlLogin}`;  // console.log("dirección url:", url );
  //definimos el body para enviar datos
  const body={cum:usu, pwd:pass};
  //console.log("como quedó el body:",body);
  return this.http.post(url,body,{ responseType:'text'}).pipe(catchError(this.handleError));
}

DoLoginToken(usu:string, pass:string, jwt:string):Observable<string>{
  const path= (this.intOpt==1)? `${this.strPathUAT}`:`${this.strPathProd}`;
  const url= `${path}${this.strurlLoginToken}`;  
  let _headers=new HttpHeaders().set('Authorization','Bearer '+jwt);
  //definimos el body para enviar datos
  const body={cum:usu, pwd:pass};
  //console.log("como quedó el body:",body);
  return this.http.post(url,body,{headers:_headers, responseType:'text'}).pipe(catchError(this.handleError));
}

getUsuario( cum:string, token:string, jwt:string):Observable<VistaLoginModel>
{
  const path= (this.intOpt==1)? `${this.strPathUAT}`:`${this.strPathProd}`;
  const url= `${path}${this.strurlLoginGetCumInfo}`; 
  let _headers=new HttpHeaders().set('Authorization','Bearer '+jwt);
  let _params= new HttpParams().set('cum',cum).set('token',token);
  //var usuario= this.http.get<VistaLoginModel>( `${url}`,{headers:_headers, params:_params}).pipe(catchError(this.handleError));
  var usuario= this.http.post<VistaLoginModel>( `${url}`, null,{headers:_headers, params:_params} ).pipe(catchError(this.handleError));
  return usuario;
}

ExisteCUM( cum:string,jwt:string ):Observable<string>
{ const path= (this.intOpt==1)? `${this.strPathUAT}`:`${this.strPathProd}`;
  const url= `${path}${this.strurlMiembroConsultaCUM}`; 
   
  let _headers=new HttpHeaders().set('Authorization','Bearer '+jwt);
  let _params= new HttpParams().set('cum',cum);
  var mensaje= this.http.get( `${url}`, {headers:_headers, params:_params,  responseType:'text'}).pipe(catchError(this.handleError));
  return mensaje;
}
//----------------------------------------Funciones de PERMISOS----------------------------

getcatMacroEventos( jwt:string):Observable<string[]>
{
  const path= (this.intOpt==1)? `${this.strPathUAT}`:`${this.strPathProd}`;
  const url= `${path}${this.strurlPermisoscatMacroEventos}`; 
  let _headers=new HttpHeaders().set('Authorization','Bearer '+jwt);
  var lista= this.http.get<string[]>( `${url}`, {headers:_headers} ).pipe(catchError(this.handleError));
  return lista;
}
getVistaConsultaMiembros( cum:string, token:string, jwt:string):Observable<VistaConsultaMiembros>
{
  const path= (this.intOpt==1)? `${this.strPathUAT}`:`${this.strPathProd}`;
  const url= `${path}${this.strurlPermisosVistaConsultaMiembros}`; 
  let _headers=new HttpHeaders().set('Authorization','Bearer '+jwt);
  let _params= new HttpParams().set('cum',cum).set('token',token);
  
  var usuario= this.http.post<VistaConsultaMiembros>( `${url}`, null,{headers:_headers, params:_params} ).pipe(catchError(this.handleError));
  return usuario;
}
getVistaMacroEventosbyCUM( cum:string, macroevento:string, token:string, jwt:string):Observable<VistaMacroEventosbyCUM>
{
  const path= (this.intOpt==1)? `${this.strPathUAT}`:`${this.strPathProd}`;
  const url= `${path}${this.strurlPermisosVistaMacroEventosbyCUM}`; 
  let _headers=new HttpHeaders().set('Authorization','Bearer '+jwt);
  let _params= new HttpParams().set('cum',cum).set('macroevento',macroevento).set('token',token);
  var usuario= this.http.post<VistaMacroEventosbyCUM>( `${url}`, null,{headers:_headers, params:_params} ).pipe(catchError(this.handleError));
  return usuario;
}


//----------------------------------Funciones de regitro de Evento y entrega de kit---------------------------
//función consulta de usuario para determinar si existe en vista de prod
getVistaRegistroEvento( cum:string, macroevento:string, token:string, jwt:string):Observable<VistaRegistroEvento>
{
  const path= (this.intOpt==1)? `${this.strPathUAT}`:`${this.strPathProd}`;
  const url= `${path}${this.strurlVistaRegistroEvento}`; 
  let _headers=new HttpHeaders().set('Authorization','Bearer '+jwt);
  let _params= new HttpParams().set('cum',cum).set('macroevento',macroevento).set('token',token);
  var usuario= this.http.post<VistaRegistroEvento>( `${url}`, null,{headers:_headers, params:_params} ).pipe(catchError(this.handleError));
  return usuario;
}

//función update de asistencia al evento en SISAS
updateAsistenteAsistencia(item:asistenteDBModel, token:string, jwt:string):Observable<void>{
  const path= (this.intOpt==1)? `${this.strPathUAT}`:`${this.strPathProd}`;
  const url= `${path}${this.strurlAsistentesAsistencia}`;
  let _headers=new HttpHeaders().set('Authorization','Bearer '+jwt);
  let _params= new HttpParams().set('token',token);
  const body={idUsuario:item.idUsuario, idPaquete:item.idPaquete, usuarioLista:item.usuarioLista};
  return this.http.put<void>( url,body,{headers:_headers, params:_params});
}

//función update de entrega de kit en SISAS
updateAsistenteKit(item:asistenteDBModel, token:string, jwt:string):Observable<void>{
  const path= (this.intOpt==1)? `${this.strPathUAT}`:`${this.strPathProd}`;
  const url= `${path}${this.strurlAsistentesKit}`;
  let _headers=new HttpHeaders().set('Authorization','Bearer '+jwt);
  let _params= new HttpParams().set('token',token);
  const body={idUsuario:item.idUsuario, idPaquete:item.idPaquete, usuarioLista:item.usuarioLista};
  return this.http.put<void>( url,body,{headers:_headers, params:_params});
}

//-------------------------------------------Funciones de registro de Evento-------------------------------------------------------------)

//función consulta de si ya fue registrado y asignada una pulsera
getRegistroEventobyCUM( cum:string, macroEvento:string, token:string, jwt:string):Observable<registroEventoDBModel>
{
  const path= (this.intOpt==1)? `${this.strPathUAT}`:`${this.strPathProd}`;
  const url= `${path}${this.strurlRegistroEventobyCUM}`; 
  let _headers=new HttpHeaders().set('Authorization','Bearer '+jwt);
  let _params= new HttpParams().set('CUM',cum).set('macroEvento', macroEvento).set('token',token);
  //console.log("token;",token);
  var usuario= this.http.post<registroEventoDBModel>(`${url}`,null,{headers:_headers, params:_params}).pipe(catchError(this.handleError));
  return usuario;
}

//función consulta de si lapulsera ya fue registrada
getRegistroEventobyPulsera( pulsera:string, macroEvento:string, token:string, jwt:string):Observable<registroEventoDBModel>
{
  const path= (this.intOpt==1)? `${this.strPathUAT}`:`${this.strPathProd}`;
  const url= `${path}${this.strurlRegistroEventobyPulsera}`; 
  let _headers=new HttpHeaders().set('Authorization','Bearer '+jwt);
  let _params= new HttpParams().set('pulsera',pulsera).set('macroEvento', macroEvento).set('token',token);
  //console.log("token;",token);
  var usuario= this.http.post<registroEventoDBModel>(`${url}`,null,{headers:_headers, params:_params}).pipe(catchError(this.handleError));
  return usuario;
}

//función generación de registro asociado cum-pulsera-nombre y kit, así como entrada y salida del evento
postRegistroEventoAsistencia(item:registroEventoDBModel, token:string, jwt:string):Observable<registroEventoDBModel>{
  const path= (this.intOpt==1)? `${this.strPathUAT}`:`${this.strPathProd}`;
  const url= `${path}${this.strurlRegistroEvento}`; 
  let _headers=new HttpHeaders().set('Authorization','Bearer '+jwt);
  let _params= new HttpParams().set('token',token);
   // console.log("dirección url:", url );
  //definimos el body para enviar datos
  const body={idEvento:item.idEvento, macroEvento:item.macroEvento, cum:item.cum, pulsera:item.pulsera, nombre:item.nombre,
              nombreEvento:item.nombreEvento, kit:item.kit, entrada:item.entrada, 
              fechaEntrada:item.fechaEntrada, fechaSalida:item.fechaSalida,  eventoActivo:1 };
 // console.log("como quedó el body:",body);
  return this.http.post<registroEventoDBModel>(url,body,{headers:_headers, params:_params}).pipe(catchError(this.handleError));
}
 

//----------------------------------Funciones para dar de Baja una pulsera de evento-------------------------------

//función consulta de si lapulsera ya fue registrada en las pulseras dadas de baja
getRegistroEventoBajabyPulsera( pulsera:string, token:string, jwt:string):Observable<registroEventoDBModel>
{
  const path= (this.intOpt==1)? `${this.strPathUAT}`:`${this.strPathProd}`;
  const url= `${path}${this.strurlRegistroEventoBajabyPulsera}`; 
  let _headers=new HttpHeaders().set('Authorization','Bearer '+jwt);
  let _params= new HttpParams().set('pulsera',pulsera).set('token',token);
  //console.log("token;",token);
  var usuario= this.http.post<registroEventoDBModel>(`${url}`,null,{headers:_headers, params:_params}).pipe(catchError(this.handleError));
  return usuario;
}

//función generación de registro asociado cum-pulsera-nombre
postRegistroEventoBajaPulsera(item:registroEventoDBModel, token:string, jwt:string):Observable<registroEventoDBModel>{
  const path= (this.intOpt==1)? `${this.strPathUAT}`:`${this.strPathProd}`;
  const url= `${path}${this.strurlRegistroEventoBajaPulsera}`; 
  let _headers=new HttpHeaders().set('Authorization','Bearer '+jwt);
  let _params= new HttpParams().set('token',token);
   // console.log("dirección url:", url );
  //definimos el body para enviar datos
  const body={idEvento:item.idEvento, macroEvento:item.macroEvento,cum:item.cum, pulsera:item.pulsera, nombre:item.nombre,
              nombreEvento:item.nombreEvento, kit:item.kit, entrada:item.entrada,
              fechaEntrada:item.fechaEntrada, fechaSalida:item.fechaSalida, eventoActivo:1};
 // console.log("como quedó el body:",body);
  return this.http.post<registroEventoDBModel>(url,body,{headers:_headers, params:_params}).pipe(catchError(this.handleError));
}


//función consulta del color de la pulsera segun la base de datos preExistente del macroevento
getMacrocolorbyCUM( cum:string, macroevento:string, token:string, jwt:string):Observable<macrocolorDBModel>
{
  const path= (this.intOpt==1)? `${this.strPathUAT}`:`${this.strPathProd}`;
  const url= `${path}${this.strurlRegistroEventoMacrocolorbyCUM}`; 
  let _headers=new HttpHeaders().set('Authorization','Bearer '+jwt);
  let _params= new HttpParams().set('cum',cum).set('macroevento',macroevento).set('token',token);
  //console.log("token;",token);
  var macrocolor= this.http.post<macrocolorDBModel>(`${url}`,null,{headers:_headers, params:_params}).pipe(catchError(this.handleError));
  return macrocolor;
}

//------------------------funciones para Reporte de Registros--------------------------------------

getReporteRegistros(macroevento:string, token:string, jwt:string):Observable<reporteRegistrosDBModel>
{
  const path= (this.intOpt==1)? `${this.strPathUAT}`:`${this.strPathProd}`;
  const url= `${path}${this.strurlRegistroEventoReporteRegistros}`; 
  let _headers=new HttpHeaders().set('Authorization','Bearer '+jwt);
  let _params= new HttpParams().set('macroevento',macroevento).set('token',token);
  //console.log("token;",token);
  var resp= this.http.post<reporteRegistrosDBModel>(`${url}`,null,{headers:_headers, params:_params}).pipe(catchError(this.handleError));
  return resp;
}

getReporteDocuSeal(macroevento:string, token:string, jwt:string):Observable<reporteDocuSealDBModel>
{
  const path= (this.intOpt==1)? `${this.strPathUAT}`:`${this.strPathProd}`;
  const url= `${path}${this.strurlRegistroEventoReporteDocuSeal}`; 
  let _headers=new HttpHeaders().set('Authorization','Bearer '+jwt);
  let _params= new HttpParams().set('macroevento',macroevento).set('token',token);
  //console.log("token;",token);
  var resp= this.http.post<reporteDocuSealDBModel>(`${url}`,null,{headers:_headers, params:_params}).pipe(catchError(this.handleError));
  return resp;
}


// TODO: el backend aún no expone este endpoint; ajustar nombre de campo del FormData y ruta cuando esté listo
postReporteKpisPdf(macroevento:string, token:string, jwt:string, pdf:Blob):Observable<any>
{
  const path= (this.intOpt==1)? `${this.strPathUAT}`:`${this.strPathProd}`;
  const url= `${path}${this.strurlRegistroEventoReportePdf}`;
  let _headers=new HttpHeaders().set('Authorization','Bearer '+jwt);
  let _params= new HttpParams().set('macroevento',macroevento).set('token',token);

  const _formData=new FormData();
  _formData.append('archivo', pdf, `KPIs_${macroevento}.pdf`);

  //no se fija Content-Type: el navegador arma el boundary del multipart automáticamente
  return this.http.post(`${url}`, _formData, {headers:_headers, params:_params}).pipe(catchError(this.handleError));
}

getReporteTarjetas( token:string, jwt:string):Observable<number>
{
  const path= (this.intOpt==1)? `${this.strPathUAT}`:`${this.strPathProd}`;
  const url= `${path}${this.strurlRegistroEventoReporteTarjetas}`; 
  let _headers=new HttpHeaders().set('Authorization','Bearer '+jwt);
  let _params= new HttpParams().set('token',token);
  //console.log("token;",token);
  var resp= this.http.post<number>(`${url}`,null,{headers:_headers, params:_params}).pipe(catchError(this.handleError));
  return resp;
}
getReporteColores(macroevento:string, token:string, jwt:string):Observable<reporteRegistrosColorDBModel[]>
{
  const path= (this.intOpt==1)? `${this.strPathUAT}`:`${this.strPathProd}`;
  const url= `${path}${this.strurlRegistroEventoReporteColores}`; 
  let _headers=new HttpHeaders().set('Authorization','Bearer '+jwt);
  let _params= new HttpParams().set('macroevento',macroevento).set('token',token);
  //console.log("token;",token);
  var resp= this.http.post<reporteRegistrosColorDBModel[]>(`${url}`,null,{headers:_headers, params:_params}).pipe(catchError(this.handleError));
  return resp;
}

getReporteRankingStaffEvento(macroevento:string, token:string, jwt:string):Observable<reporteRankingStaffRegistroDBModel[]>
{
  const path= (this.intOpt==1)? `${this.strPathUAT}`:`${this.strPathProd}`;
  const url= `${path}${this.strurlRegistroEventoReporteRankingStaffRegistro}`; 
  let _headers=new HttpHeaders().set('Authorization','Bearer '+jwt);
  let _params= new HttpParams().set('macroevento',macroevento).set('token',token);
  //console.log("token;",token);
  var resp= this.http.post<reporteRankingStaffRegistroDBModel[]>(`${url}`,null,{headers:_headers, params:_params}).pipe(catchError(this.handleError));
  return resp;
}

getReporteRankingStaffKit(macroevento:string, token:string, jwt:string):Observable<reporteRankingStaffKitDBModel[]>
{
  const path= (this.intOpt==1)? `${this.strPathUAT}`:`${this.strPathProd}`;
  const url= `${path}${this.strurlRegistroEventoReporteRankingStaffKit}`; 
  let _headers=new HttpHeaders().set('Authorization','Bearer '+jwt);
  let _params= new HttpParams().set('macroevento',macroevento).set('token',token);
  //console.log("token;",token);
  var resp= this.http.post<reporteRankingStaffKitDBModel[]>(`${url}`,null,{headers:_headers, params:_params}).pipe(catchError(this.handleError));
  return resp;
}

getReporteRankingStaffComidas(macroevento:string, token:string, jwt:string):Observable<reporteRankingStaffAlimentosDBModel[]>
{
  const path= (this.intOpt==1)? `${this.strPathUAT}`:`${this.strPathProd}`;
  const url= `${path}${this.strurlRegistroEventoReporteRankingStaffComidas}`; 
  let _headers=new HttpHeaders().set('Authorization','Bearer '+jwt);
  let _params= new HttpParams().set('macroevento',macroevento).set('token',token);
  //console.log("token;",token);
  var resp= this.http.post<reporteRankingStaffAlimentosDBModel[]>(`${url}`,null,{headers:_headers, params:_params}).pipe(catchError(this.handleError));
  return resp;
}


getReporteDia(macroevento:string, token:string, jwt:string):Observable<reporteDiaDBModel[]>
{
  const path= (this.intOpt==1)? `${this.strPathUAT}`:`${this.strPathProd}`;
  const url= `${path}${this.strurlRegistroEventoReporteDia}`; 
  let _headers=new HttpHeaders().set('Authorization','Bearer '+jwt);
  let _params= new HttpParams().set('macroevento',macroevento).set('token',token);
  //console.log("token;",token);
  var resp= this.http.post<reporteDiaDBModel[]>(`${url}`,null,{headers:_headers, params:_params}).pipe(catchError(this.handleError));
  return resp;
}



//-------------------------funciones para Protección a la Membresía ----------------------------

//función update de entrega de kit en SISAS
updateProtectMem(item:protectMemDBModel, token:string, jwt:string):Observable<protectMemDBModel>{
  const path= (this.intOpt==1)? `${this.strPathUAT}`:`${this.strPathProd}`;
  const url= `${path}${this.strurlProtectMem}`;
  let _headers=new HttpHeaders().set('Authorization','Bearer '+jwt);
  let _params= new HttpParams().set('token',token);
  return this.http.post<protectMemDBModel>( url,item,{headers:_headers, params:_params}).pipe(catchError(this.handleError));
}

//función consulta de si ya fue registrado y asignada una pulsera
getProtectMembyId( id:string, token:string, jwt:string):Observable<protectMemDBModel>
{
  const path= (this.intOpt==1)? `${this.strPathUAT}`:`${this.strPathProd}`;
  const url= `${path}${this.strurlProtectMembyId}`; 
  let _headers=new HttpHeaders().set('Authorization','Bearer '+jwt);
  let _params= new HttpParams().set('id',id).set('token',token);
  //console.log("token;",token);
  var usuario= this.http.post<protectMemDBModel>(`${url}`,null,{headers:_headers, params:_params}).pipe(catchError(this.handleError));
  return usuario;
}

getProtectMemReporte(macroEvento:string,token:string, jwt:string):Observable<protectMemDBModel[]>
{
  const path= (this.intOpt==1)? `${this.strPathUAT}`:`${this.strPathProd}`;
  const url=`${path}${this.strurlProtectMemReporte}`;
  let _headers=new HttpHeaders().set('Authorization','Bearer '+jwt);
  let _params= new HttpParams().set('macroEvento',macroEvento).set('token',token);
//  console.log("dirección url:", url ); 
  var checkresp= this.http.post<protectMemDBModel[]>( `${url}`, null,{headers:_headers, params:_params} ).pipe(catchError(this.handleError));
  return checkresp;
}

//--------------------------funciones para Vistas de Datos de Salud------------------------------
getVistaSaludGeneral( cum:string, token:string, jwt:string):Observable<VistaSaludGeneral>
{
  const path= (this.intOpt==1)? `${this.strPathUAT}`:`${this.strPathProd}`;
  const url= `${path}${this.strurlVistaSaludGeneral}`; 
  let _headers=new HttpHeaders().set('Authorization','Bearer '+jwt);
  let _params= new HttpParams().set('cum',cum).set('token',token);
  var usuario= this.http.post<VistaSaludGeneral>(url, null, {headers:_headers, params:_params}).pipe(catchError(this.handleError));
  return usuario; 
}

getVistaSaludFicha(cum:string, token:string, jwt:string):Observable<VistaSaludFicha[]>
{
  const path= (this.intOpt==1)? `${this.strPathUAT}`:`${this.strPathProd}`;
  const url= `${path}${this.strurlVistaSaludFicha}`;
  let _headers=new HttpHeaders().set('Authorization','Bearer '+jwt);
  let _params= new HttpParams().set('cum',cum).set('token',token);
  var items= this.http.post<VistaSaludFicha[]>( `${url}`,null,{headers:_headers, params:_params}).pipe(catchError(this.handleError));   
  return items;
}

getVistaSaludFichaPsicologica(cum:string, token:string, jwt:string):Observable<VistaSaludFichaPsicologica[]>
{
  const path= (this.intOpt==1)? `${this.strPathUAT}`:`${this.strPathProd}`;
  const url= `${path}${this.strurlVistaSaludFichaPsicologica}`;
  let _headers=new HttpHeaders().set('Authorization','Bearer '+jwt);
  let _params= new HttpParams().set('cum',cum).set('token',token);
  var items= this.http.post<VistaSaludFichaPsicologica[]>(`${url}`,null,{headers:_headers, params:_params} ).pipe(catchError(this.handleError));   
  return items;
}

getVistaSaludVacunas(cum:string, token:string, jwt:string):Observable<VistaSaludVacunas[]>
{
  const path= (this.intOpt==1)? `${this.strPathUAT}`:`${this.strPathProd}`;
  const url= `${path}${this.strurlVistaSaludVacunas}`;
  let _headers=new HttpHeaders().set('Authorization','Bearer '+jwt);
  let _params= new HttpParams().set('cum',cum).set('token',token);
  var items= this.http.post<VistaSaludVacunas[]>( `${url}`,null, {headers:_headers, params:_params}).pipe(catchError(this.handleError));   
  return items;
}

//-------------control de historial medico 
getHistorialMedico(cum:string, token:string, jwt:string):Observable<HistorialMedicoDBModel[]>
{  
  const path= (this.intOpt==1)? `${this.strPathUAT}`:`${this.strPathProd}`;
  const url= `${path}${this.strurlSaludHistorialbyCUM}`; 
  let _headers=new HttpHeaders().set('Authorization','Bearer '+jwt);
  let _params= new HttpParams().set('cum',cum).set('token',token);
  var items= this.http.post<HistorialMedicoDBModel[]>( `${url}`,null, {headers:_headers, params:_params}).pipe(catchError(this.handleError));   
  return items;
}
  


postHistorialMedico(item:HistorialMedicoDBModel, token:string, jwt:string):Observable<HistorialMedicoDBModel>{
  const path= (this.intOpt==1)? `${this.strPathUAT}`:`${this.strPathProd}`;
  const url= `${path}${this.strurlSaludHistorial}?token=${token}`; 
  let _headers=new HttpHeaders().set('Authorization','Bearer '+jwt);
  let _params= new HttpParams().set('token',token);
  //definimos el body para enviar datos
  const body={id:item.id, idEvento:item.idEvento,nombreEvento:item.nombreEvento, cum:item.cum, fecha:item.fecha,
              cumRegistrador:item.cumRegistrador,atencionCuracion:item.atencionCuracion, atencionBasica:item.atencionBasica,
              atencionObservacion:item.atencionObservacion,atencionPsicologica:item.atencionPsicologica, atencionOtra:item.atencionOtra,
              motivoConsulta:item.motivoConsulta, descripcion:item.descripcion, tratamiento:item.tratamiento, resultado:item.resultado};
  return this.http.post<HistorialMedicoDBModel>(url,body, {headers:_headers, params:_params}).pipe(catchError(this.handleError));
}


//-------------LLamadas Globales a DocuSeal para permiso de Menores en Eventos
getDocuSealGetUnnotifiedMinors(macroevento:string, token:string, jwt:string):Observable<number>
{  
  const path= (this.intOpt==1)? `${this.strPathUAT}`:`${this.strPathProd}`;
  const url= `${path}${this.strurlDocuSealGetUnnotifiedMinors}`; 
  let _headers=new HttpHeaders().set('Authorization','Bearer '+jwt);
  let _params= new HttpParams().set('macroevento',macroevento).set('token',token);
  var item= this.http.post<number>( `${url}`,null, {headers:_headers, params:_params}).pipe(catchError(this.handleError));   
  return item;
}
  
postDocuSealSendUnnotifiedMinors(macroevento:string, token:string, jwt:string):Observable<string>
{
  const path= (this.intOpt==1)? `${this.strPathUAT}`:`${this.strPathProd}`;
  const url= `${path}${this.strurlDocuSealSendUnnotifiedMinors}`; 
  let _headers=new HttpHeaders().set('Authorization','Bearer '+jwt);
  let _params= new HttpParams().set('macroevento',macroevento).set('token',token);

  return this.http.post(`${url}`,null, {headers:_headers, params:_params, responseType:'text'}).pipe(catchError(this.handleError));
}

getReporteGetUnnotifiedMinorsDetails(macroevento:string, token:string, jwt:string):Observable<reporteMenoresFallaDBModel[]>
{
  const path= (this.intOpt==1)? `${this.strPathUAT}`:`${this.strPathProd}`;
  const url= `${path}${this.strurlDocuSealGetUnnotifiedMinorsDetails}`; 
  let _headers=new HttpHeaders().set('Authorization','Bearer '+jwt);
  let _params= new HttpParams().set('macroevento',macroevento).set('token',token);
  var resp= this.http.post<reporteMenoresFallaDBModel[]>(`${url}`,null,{headers:_headers, params:_params}).pipe(catchError(this.handleError));
  return resp;
}

getReporteGetMinorsWithInvalidPhoneDetails(macroevento:string, token:string, jwt:string):Observable<reporteMenoresFallaDBModel[]>
{
  const path= (this.intOpt==1)? `${this.strPathUAT}`:`${this.strPathProd}`;
  const url= `${path}${this.strurlDocuSealGetMinorsWithInvalidPhoneDetails}`; 
  let _headers=new HttpHeaders().set('Authorization','Bearer '+jwt);
  let _params= new HttpParams().set('macroevento',macroevento).set('token',token);
  var resp= this.http.post<reporteMenoresFallaDBModel[]>(`${url}`,null,{headers:_headers, params:_params}).pipe(catchError(this.handleError));
  return resp;
}

//-------------Llamadas para endPoints de RegistroEventoComidas en Eventos-----------------------------------------------------------------------

getcatComidas( jwt:string):Observable<catComidasDBModel[]>
{
  const path= (this.intOpt==1)? `${this.strPathUAT}`:`${this.strPathProd}`;
  const url= `${path}${this.strurlRegistroEventoComidacatComidas}`; 
  let _headers=new HttpHeaders().set('Authorization','Bearer '+jwt);
  var lista= this.http.get<catComidasDBModel[]>( `${url}`, {headers:_headers} ).pipe(catchError(this.handleError));
  return lista;
}
getRegistroEventoComidacatComidaHorario( token:string, jwt:string):Observable<catComidaHorarioDBModel[]>
{
  const path= (this.intOpt==1)? `${this.strPathUAT}`:`${this.strPathProd}`;
  const url= `${path}${this.strurlRegistroEventoComidacatComidaHorario}`; 
  let _headers=new HttpHeaders().set('Authorization','Bearer '+jwt);
  let _params= new HttpParams().set('token',token);
  var resp= this.http.post<catComidaHorarioDBModel[]>(`${url}`,null,{headers:_headers, params:_params}).pipe(catchError(this.handleError));
  return resp;
}

getRegistroEventoComidaGetcatComidaHorario(idComida_Horario:number, token:string, jwt:string):Observable<catComidaHorarioDBModel>
{
  const path= (this.intOpt==1)? `${this.strPathUAT}`:`${this.strPathProd}`;
  const url= `${path}${this.strurlRegistroEventoComidaGetcatComidaHorario}`; 
  let _headers=new HttpHeaders().set('Authorization','Bearer '+jwt);
  let _params= new HttpParams().set('idComida_Horario', idComida_Horario).set('token',token);
  var resp= this.http.post<catComidaHorarioDBModel>(`${url}`,null,{headers:_headers, params:_params}).pipe(catchError(this.handleError));
  return resp;
}

PostcatComidaHorario(item:catComidaHorarioDBModel, token:string, jwt:string):Observable<catComidaHorarioDBModel>{
  const path= (this.intOpt==1)? `${this.strPathUAT}`:`${this.strPathProd}`;
  const url= `${path}${this.strurlRegistroEventoComidaPostcatComidaHorario}`;
  let _headers=new HttpHeaders().set('Authorization','Bearer '+jwt);
  let _params= new HttpParams().set('token',token);
   
  var resp= this.http.post<catComidaHorarioDBModel>( `${url}`,item,{headers:_headers, params:_params}).pipe(catchError(this.handleError));
  return resp;
}

getRegistroEventoComidaValidaComidaHorario( token:string, jwt:string):Observable<boolean>
{
  const path= (this.intOpt==1)? `${this.strPathUAT}`:`${this.strPathProd}`;
  const url= `${path}${this.strurlRegistroEventoComidaValidaComidaHorario}`; 
  let _headers=new HttpHeaders().set('Authorization','Bearer '+jwt);
  let _params= new HttpParams().set('token',token);
  var resp= this.http.post<boolean>(`${url}`,null,{headers:_headers, params:_params}).pipe(catchError(this.handleError));
  return resp;
}

getRegistroEventoVistaComidaEvento(cum:string, macroevento:string, token:string, jwt:string):Observable<VistaComidaEvento>
{
  const path= (this.intOpt==1)? `${this.strPathUAT}`:`${this.strPathProd}`;
  const url= `${path}${this.strurlRegistroEventoComidaVistaComidaEvento}`; 
  let _headers=new HttpHeaders().set('Authorization','Bearer '+jwt);
  let _params= new HttpParams().set('cum',cum).set('macroEvento',macroevento).set('token',token);
  var resp= this.http.post<VistaComidaEvento>(`${url}`,null,{headers:_headers, params:_params}).pipe(catchError(this.handleError));
  return resp;
}

getRegistroEventoComida(idComida_Evento:number, cum:string, token:string, jwt:string):Observable<registroEventoComidaDBModel>
{
  const path= (this.intOpt==1)? `${this.strPathUAT}`:`${this.strPathProd}`;
  const url= `${path}${this.strurlRegistroEventoComidaGetEventoComida}`; 
  let _headers=new HttpHeaders().set('Authorization','Bearer '+jwt);
  let _params= new HttpParams().set('idComida_evento',idComida_Evento).set('cum',cum).set('token',token);
  var resp= this.http.post<registroEventoComidaDBModel>(`${url}`,null,{headers:_headers, params:_params}).pipe(catchError(this.handleError));
  return resp;
}

postRegistroEventoComida(idComida_Evento:number, cum:string, cumEntrega:string, pulsera:string, token:string, jwt:string):Observable<registroEventoComidaDBModel>{
  const path= (this.intOpt==1)? `${this.strPathUAT}`:`${this.strPathProd}`;
  const url= `${path}${this.strurlRegistroEventoComida}`; 
  let _headers=new HttpHeaders().set('Authorization','Bearer '+jwt);
  let _params= new HttpParams().set('idComida_evento',idComida_Evento).set('cum',cum).set('cumEntrega',cumEntrega).set('pulsera',pulsera).set('token',token);
  var resp= this.http.post<registroEventoComidaDBModel>(`${url}`,null, {headers:_headers, params:_params}).pipe(catchError(this.handleError));
  return resp;
}


getcatMacroEventosAlimentos( jwt:string):Observable<string[]>
{
  const path= (this.intOpt==1)? `${this.strPathUAT}`:`${this.strPathProd}`;
  const url= `${path}${this.strurlRegistroEventoComidacatMacroEventosAlimentos}`; 
  let _headers=new HttpHeaders().set('Authorization','Bearer '+jwt);
  var lista= this.http.get<string[]>( `${url}`, {headers:_headers} ).pipe(catchError(this.handleError));
  return lista;
}

getcatEventosAlimentos(macroEvento:string, jwt:string):Observable<EventoDBModel[]>
{
  const path= (this.intOpt==1)? `${this.strPathUAT}`:`${this.strPathProd}`;
  const url= `${path}${this.strurlRegistroEventoComidacatEventosAlimentos}`; 
  let _headers=new HttpHeaders().set('Authorization','Bearer '+jwt);
  let _params= new HttpParams().set('macroEvento',macroEvento);
  var lista= this.http.get<EventoDBModel[]>( `${url}`, {headers:_headers, params:_params} ).pipe(catchError(this.handleError));
  return lista;
}

getVistaComidasbyidEvento(idEvento:number, token:string, jwt:string):Observable<VistaComidaEvento[]>
{
  const path= (this.intOpt==1)? `${this.strPathUAT}`:`${this.strPathProd}`;
  const url= `${path}${this.strurlRegistroEventoComidaGetVistaComidasbyidEvento}`; 
  let _headers=new HttpHeaders().set('Authorization','Bearer '+jwt);
  let _params= new HttpParams().set('idEvento',idEvento).set('token',token);
  var resp= this.http.post<VistaComidaEvento[]>(`${url}`,null,{headers:_headers, params:_params}).pipe(catchError(this.handleError));
  return resp;
}

PostcatComidaEvento(item:VistaComidaEvento, token:string, jwt:string):Observable<VistaComidaEvento>{
  const path= (this.intOpt==1)? `${this.strPathUAT}`:`${this.strPathProd}`;
  const url= `${path}${this.strurlRegistroEventoComidaPostcatComidaEvento}`;
  let _headers=new HttpHeaders().set('Authorization','Bearer '+jwt);
  let _params= new HttpParams().set('token',token);
  const body= {idComida_Evento:item.idComida_Evento, idEvento:item.idEvento, idComida:item.idComida, fecha:item.fecha};

  var resp= this.http.post<VistaComidaEvento>( `${url}`,body,{headers:_headers, params:_params}).pipe(catchError(this.handleError));
  return resp;
}

getReporteConteoComida(macroEvento:string, jwt:string):Observable<reporteConteoComidasDBModel>
{
  const path= (this.intOpt==1)? `${this.strPathUAT}`:`${this.strPathProd}`;
  const url= `${path}${this.strurlRegistroEventoComidareporteConteoComida}`; 
  let _headers=new HttpHeaders().set('Authorization','Bearer '+jwt);
  let _params= new HttpParams().set('macroEvento',macroEvento);
  var resp= this.http.post<reporteConteoComidasDBModel>(`${url}`,null,{headers:_headers, params:_params}).pipe(catchError(this.handleError));
  return resp;
}

//----------------------------------Funcion para detectar error en conexión-----------------
// Función flecha: se pasa como callback a catchError y necesita `this` para cerrar la sesión guardada
private handleError = (error: HttpErrorResponse) =>
{
  if (error.status === 0) {
    // A client-side or network error occurred. Handle it accordingly.
    console.error('Ecurrió un error :', error.error);
  } else {
    // The response body may contain clues as to what went wrong.
    console.error(`Backend regresa el status: ${error.status}, body: `, error.error);
    if(error.status==404)
      {
        var falla= error.error;
        if(typeof falla==='string' && falla.trim()=='token no valido')
          { this.tokenVencido(); }
      }
   
  }
  // Return an observable with a user-facing error message.
  return throwError(() => new Error('Algo ocurrió o no existe el elemento.'));
}

// Un solo aviso aunque fallen varias consultas a la vez. Antes de recargar se borra la sesión guardada:
// si no, al recargar se recuperaría con el mismo token vencido y el aviso se repetiría sin fin.
private static avisoTokenAbierto = false;
private tokenVencido():void
{
  if(DbservicesService.avisoTokenAbierto) return;
  DbservicesService.avisoTokenAbierto = true;
  this.sesion.anotar('El servidor rechazó el token: se cierra la sesión');
  this.sesion.borrar().finally(() =>
    Swal.fire('Su token caducó! Favor de Logearse nuevamente.', '', 'error').then(() => window.location.reload()));
}




}
