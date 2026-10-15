import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SpinnerService {

  constructor() { }
  //ADN al usar un signo de pesos al final, significa que es una propiedad Observable
  //se le asigna una instancia del observable tipo Subject
  isLoading$= new Subject<boolean>();

  //true solo mientras se lanzan consultas automáticas (p. ej. refresco del widget): esas no deben mostrar el spinner
  silencioso=false;

  //función para regresar verdadero mientras esté cargando
   show():void{ this.isLoading$.next(true); }
   //funcion que regresa un false cuando ya esté cargado
   hide():void{ this.isLoading$.next(false);}




}

