
//modelo para consultar los datos de las preguntas que ya han sido contestadas por x usuario
export class vwReactivoModel
{
    id_pregunta!:number;
    idAgrupador!:number;
    idOrder!:number;
    isRequired!:number;
    tipoReactivo!:number;
    texto!:string;
    textoOpciones!:string;

    id_respuesta!:number;
    cum!:string;
    respuesta!:string;
}

//tipoReactivo, 1 texto, 2, texto largo, 3 fecha, 4 número, 5 true or false, 6 select, 7 Check only, 8 checklist,
//              9 cel,   10 email 