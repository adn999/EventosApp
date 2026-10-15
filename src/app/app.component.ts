import { Component } from '@angular/core';
import { EnlacesService } from './services/enlaces.service';
import { ResumenWidgetService } from './services/resumen-widget.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  title = 'AngularScouts';

  constructor(enlaces: EnlacesService, resumenWidget: ResumenWidgetService) {
    enlaces.iniciar();
    resumenWidget.iniciar();
  }
}
