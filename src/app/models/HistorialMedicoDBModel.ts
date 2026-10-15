 
 //modelo utilizado para almacenar el historial médico en sql server
export class HistorialMedicoDBModel
{
    id!:number;
    idEvento!:number;
    nombreEvento!:string;
    cum!:string;
    fecha!:Date;
    cumRegistrador!:string;

    atencionCuracion!:number;
    atencionBasica!:number;
    atencionObservacion!:number;
    atencionPsicologica!:number;
    atencionOtra!:number;
    
    motivoConsulta!:string;
    descripcion!:string;
    tratamiento!:string;
    resultado!:string;
}