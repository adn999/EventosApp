import { Component, EventEmitter, Input, OnDestroy, Output } from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import { ResultadoContinuo, camaraPropia, detenerContinuo, escanearBarras, escanearContinuo } from 'src/app/services/escaner';
import { vibrar } from 'src/app/services/haptica';

/**
 * Botón que abre la cámara y entrega el código de barras leído (Code 128 / Code 39) por `leido`.
 * Con `procesar` hace escaneo continuo en iOS y Android: la cámara queda abierta y cada código se procesa sin cerrarla.
 */
@Component({
  selector: 'app-boton-escaner',
  template: `
    <button mat-mini-fab type="button" class="boton-escaner" (click)="escanear()" [attr.aria-label]="etiqueta" [title]="etiqueta">
      <i class="fa" [class.fa-barcode]="!continuo" [class.fa-layer-group]="continuo"></i>
    </button>`,
  styles: [`.boton-escaner { background-color: rgb(101, 50, 124); color: #fff; flex: none; }`],
})
export class BotonEscanerComponent implements OnDestroy {
  @Input() etiqueta = 'Escanear';
  @Input() procesar?: (valor: string) => Promise<ResultadoContinuo>;
  @Input() titulo = 'Escaneo continuo';      // texto arriba de la cámara en escaneo continuo
  @Output() leido = new EventEmitter<string>();
  constructor(private readonly toastr: ToastrService) {}

  /** Escaneo continuo donde hay cámara propia (iOS y Android); en la web se lee de uno en uno. */
  get continuo(): boolean { return !!this.procesar && camaraPropia(); }

  ngOnDestroy(): void { if (this.continuo) detenerContinuo(); }

  async escanear(): Promise<void> {
    if (this.continuo) {
      const fin = await escanearContinuo(this.titulo, this.procesar);
      if (fin === 'permiso') { vibrar('error'); this.toastr.warning('Activa el permiso de cámara para la app en Ajustes.', 'Sin acceso a la cámara'); }
      else if (fin === 'no-disponible') { vibrar('error'); this.toastr.warning('Usa el modo Teclado.', 'El escáner no está disponible'); }
      return;
    }
    const r = await escanearBarras();
    if (r.estado === 'ok') {
      vibrar('ok');
      if (this.procesar) this.procesar(r.valor);   // pantallas con escaneo continuo: mismo flujo, un código
      else this.leido.emit(r.valor);
    }
    else if (r.estado === 'permiso') {
      vibrar('error'); this.toastr.warning('Activa el permiso de cámara para la app en Ajustes.', 'Sin acceso a la cámara');
    } else if (r.estado === 'no-disponible') {
      vibrar('error'); this.toastr.warning('Usa el modo Teclado.', 'El escáner no está disponible');
    }
  }
}
