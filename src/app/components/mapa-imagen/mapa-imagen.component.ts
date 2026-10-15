import { reproducir } from 'src/app/services/haptica';
import { Component, OnInit } from '@angular/core';
import { state, style, transition, trigger, useAnimation } from '@angular/animations';
import { transitionCollapse, transitionCollapseFast, transitionEntrada, transitionSalida, transitionImg } from '../animation';
import Swal from 'sweetalert2';
import { VistaLoginModel } from 'src/app/models/VistaLoginModel';
import { Router } from '@angular/router';
import { ShareDataService } from 'src/app/services/shared-data.service';
import { ResumenWidgetService } from 'src/app/services/resumen-widget.service';

@Component({
  selector: 'app-mapa-imagen',
  templateUrl: './mapa-imagen.component.html',
  styleUrls: ['./mapa-imagen.component.css'],
  animations:[trigger('mostrarTrigger', [state('hidden', style({ opacity: 0  })),
    transition('hidden => shown', [ useAnimation(transitionEntrada) ]),  ]),
    trigger('mostrarTriggerLeft', [ transition('hidden => shown', [ useAnimation(transitionSalida) ]),  ]),
    trigger('imgTrigger', [transition('shown => hidden',[ useAnimation(transitionImg) ]),  ]),

  
    trigger('mostrarTriggerCollapse', [state('hidden', style({ opacity: 0  })),
    transition('hidden => shown', [ useAnimation(transitionCollapse) ]) ]),
    trigger('triggResult', [ transition('false => true', [ useAnimation(transitionCollapseFast) ]) ]),
]
})
export class MapaImagenComponent implements OnInit 
{
  //variable del estado de animacion
  estado='hidden';
  estadoImg='hidden';

  constructor(private readonly router: Router, 
              private readonly sharedSvc: ShareDataService,
              private readonly resumenWidget: ResumenWidgetService){}

  ngOnInit(): void 
  {
    //this.consultarLogStatus();
    //this.localCUM="NAL2390004"; this.localPass=".";
  }

  //para que cambie el estado de la variable inicial para animación
  ngAfterViewInit(){ setTimeout( () => { this.estado = 'shown';  }, 260);}

  cambioInic(){ setTimeout( () => { this.estadoImg = 'shown';    this.cambioSecun();   }, 250);}
  cambioSecun(){ setTimeout( () => { this.estadoImg = 'hidden'; /* this.cambioInic(); */   },250);}

  mensaje(param:string):void
  {
    this.playAudio(param);
    Swal.fire({title: "Hola", text: "Presionaste: "+param, icon:'success', timer:2000});
  }

  playAudio(sonido:string){
    if(sonido==='ocelote'){ this.cambioInic(); }
    reproducir(sonido);
  }

  closeSesion():void{
    const userVacio:VistaLoginModel={ idUsuario:'',cum:'', nombre:'',email:'', password:'', token:'', tokenjwt:'' };
     this.resumenWidget.cerrarSesionReloj();
     this.sharedSvc.setStatus(userVacio);
     this.router.navigate(['home' ] );
     window.location.reload();//se recarga para que reinicie el contador de actividad
   }

}
