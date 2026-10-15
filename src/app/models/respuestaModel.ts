//modelo utilizado para recolectar las respuestas
export class respuestaModel
{
    id!:number;
    id_pregunta!:number;
    cum!:string;
    respuesta!:string;

    tipoReactivo:number=0;
    isRequired:number=0;
}

//tipoReactivo, 1 texto, 2, texto largo, 3 fecha, 4 número, 5 true or false, 6 options, 7 chek, 8 checklist