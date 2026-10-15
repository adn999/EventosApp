import { ResourceLoader } from "@angular/compiler";
import {Pipe, PipeTransform } from "@angular/core";
import { catQuizzDBModel } from "src/app/models/catQuizzDBModel";

//el pipe personal por defecto es pure
@Pipe({ name:'filter', })

export class FilterPipe implements PipeTransform{

transform(valores: catQuizzDBModel[],  arg: string):catQuizzDBModel[]
{ if(!arg || arg?.length<2){return valores;}
  let result:catQuizzDBModel[]=[];

  for(const item of valores)
  {  if(item.nombreEncuesta)
    {if(item.nombreEncuesta.toLocaleLowerCase().indexOf(arg.toLocaleLowerCase()) > -1 )
     {result=[...result,item];}
    }
  }
   return result;  
}

}