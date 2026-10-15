import { CanActivateFn, Router } from '@angular/router';
import { ShareDataService } from '../services/shared-data.service';
import { inject } from '@angular/core';
import { VistaLoginModel } from '../models/VistaLoginModel';
import { Expression } from '@angular/compiler';
import { take, tap } from 'rxjs';
import { ToastrService } from 'ngx-toastr';


export const authGuard: CanActivateFn = (route, state) => {

  const shareSvc=inject(ShareDataService);
  const ruteador=inject(Router);
  const toastr=inject(ToastrService);

  var allowAccess:boolean=false;
   shareSvc.currentStatu$.subscribe(resp=>
    { allowAccess= resp.cum.length>0?true:false; });
 
    if(!allowAccess)
    { //toastr.warning("No tiene acceso sin logearse"); 
      return ruteador.navigate(['home' ] );
    }
    else return true; 

   };

/* solo si la función guarda un simple true o false, pero nostros guardamos los datos de usuario
export const authGuard=()=> 
{ 
  return shareSvc.getAuhToken().pipe( take(1), 
  tap((isloged) => !isloged? ruteador.navigate(['home' ] ):true ) 
    );
} */
