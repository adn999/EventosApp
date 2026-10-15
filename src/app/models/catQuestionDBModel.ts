  //modelo utilizado para almacenar catálgo de cuestionario en sql server
export class catQuestionDBModel
{
    id!:number;
    idOrder!:number;
    isRequired!:number;
    idAgrupador!:number;
    isActive!:number;
    tipoReactivo!:number;
    texto!:string;
    textoOpciones!:string;
}