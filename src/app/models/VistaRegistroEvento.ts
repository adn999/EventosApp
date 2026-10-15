//modelo para invocar los datos del Asistente desde SISAS
export class VistaRegistroEvento
{
    idPaquete!:number;
    macroEvento!:string;
    idEvento!:number;
    nombreEvento!:string;
    idUsuario!:string;
    cum:string="";
    nombre!:string;
    primerApellido!:"";
    segundoApellido!:"";
    
    asistencia!:boolean;
    usuarioLista!:string;
    fechaLista!:Date;

    kit!:boolean;
    usuarioKit!:string;
    fechaKit!:Date;
    incluyeKit!:boolean;
    incluyeAlimentos!:boolean;
    envelopeId!:string;
    envelopeStatus!:number;
 
}
 