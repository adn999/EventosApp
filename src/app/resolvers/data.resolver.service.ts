import { Injectable } from "@angular/core";
import { Resolve } from "@angular/router";
import { Observable, of } from "rxjs";

const departments=[ 'Marketing','Sales', 'Other'];

//se agrega esta injectable para el resolver
@Injectable({providedIn:'root'})

export class DataResolverService implements Resolve<any>
{

 resolve():Observable<any>
 {
   //se debería llamar un servicio, pero mientras devolvemos un arreglo test
   //of de rxjs convertira el array en un observable
   return of(departments);

 }
  

}
