import { Component } from '@angular/core';
import { BotonAtrasService } from './services/boton-atras.service';
import { EnlacesService } from './services/enlaces.service';
import { ResumenWidgetService } from './services/resumen-widget.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  title = 'AngularScouts';

  constructor(enlaces: EnlacesService, resumenWidget: ResumenWidgetService, botonAtras: BotonAtrasService) {
    enlaces.iniciar();
    botonAtras.iniciar();
    resumenWidget.iniciar();
  }
}
