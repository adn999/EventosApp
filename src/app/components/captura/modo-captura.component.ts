import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { ModoCaptura, guardarModo } from 'src/app/services/escaner';

/** Selector "Teclado | Cámara". Solo se muestra en la app nativa; la pantalla siempre arranca en Teclado. */
@Component({
  selector: 'app-modo-captura',
  template: `
    <div class="modo-captura" *ngIf="hayCamara" role="group" aria-label="Modo de captura">
      <button type="button" [class.activo]="modo==='teclado'" (click)="elegir('teclado')"><i class="fa fa-keyboard"></i> Teclado</button>
      <button type="button" [class.activo]="modo==='camara'" (click)="elegir('camara')"><i class="fa fa-camera"></i> Cámara</button>
    </div>`,
  styles: [`
    .modo-captura { display: flex; justify-content: center; margin: 6px 0 12px; }
    /* la opción sin elegir lleva un fondo blanco al 50% de opacidad para que se distinga sobre cualquier fondo */
    button { border: 1.5px solid rgb(101, 50, 124); background: rgba(255, 255, 255, 0.5); color: #4d2562; padding: 6px 16px; font-size: .95rem; }
    button:first-child { border-radius: 18px 0 0 18px; }
    button:last-child  { border-radius: 0 18px 18px 0; border-left: 0; }
    button.activo { background: rgb(101, 50, 124); color: #fff; font-weight: 600; }`],
})
export class ModoCapturaComponent {
  @Input() modo: ModoCaptura = 'teclado';
  @Input() clave = '';   // pantalla: con ella se recuerda la última opción elegida
  @Output() modoChange = new EventEmitter<ModoCaptura>();
  readonly hayCamara = Capacitor.isNativePlatform();
  elegir(m: ModoCaptura): void {
    this.modo = m;
    if (this.clave) guardarModo(this.clave, m);
    this.modoChange.emit(m);
  }
}
