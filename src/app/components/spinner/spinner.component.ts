import { Component } from '@angular/core';
import { SpinnerService } from './spinner.service';

@Component({
  selector: 'app-spinner', //*ngIf="true" isLoadingSpinComp$ | async el pipe async hace la acción de subscribe al observable como desuscrib al desuso
  template: `<div class="overlay" *ngIf="isLoadingSpinComp$|async">
               <div class="lg-glass lg-loading-card"><span class="lg-spinner lg-spinner--lg"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></span></div>
             </div>`,
  styleUrls: ['./spinner.component.css']
})


export class SpinnerComponent {
  isLoadingSpinComp$=this.spinnerServicio.isLoading$;

constructor(private readonly spinnerServicio:SpinnerService){}


}
