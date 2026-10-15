import { Injectable } from '@angular/core';
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor
} from '@angular/common/http';
import { Observable, finalize } from 'rxjs';
import { SpinnerService } from './spinner.service';

@Injectable()
export class SpinnerInterceptor implements HttpInterceptor {

  //se inyecta el servicio al middlerware para que detecte la carga
  constructor( private readonly spinSvc:SpinnerService) {}

  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> 
  {
    //consultas automáticas en segundo plano: sin gráfico loading
    const mudo = this.spinSvc.silencioso;
    //antes de usar el interceptor, mostrará el gráfico loading
    if (!mudo) this.spinSvc.show();
    //al usar el interceptor, se invoca al metodo finalizar para saber si ya acabó y se oculará el gráfico loading
    return next.handle(request).pipe(  finalize( ()=> { if (!mudo) this.spinSvc.hide(); } ) );
  }
}
