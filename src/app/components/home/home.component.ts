import { sentir } from 'src/app/services/haptica';

import { Component, OnInit } from '@angular/core';
import { VistaLoginModel } from 'src/app/models/VistaLoginModel';
import { DbservicesService } from 'src/app/services/dbservices.service';
import { ShareDataService } from 'src/app/services/shared-data.service';
import { transition, trigger, useAnimation } from '@angular/animations';
import { transitionCollapse, transitionZoom } from '../animation';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import Swal from 'sweetalert2';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css'],
  animations:[trigger('mostrarTrigger', [ transition('0 => 1', [ useAnimation(transitionZoom) ]),  ]),
 
  trigger('imgTrigger', [transition('shown => hidden',[ useAnimation(transitionCollapse) ]),  ]),]
})

export class HomeComponent implements OnInit
{
  
localUser!:VistaLoginModel;
macroEvento:string='';
txtBtn:string='';
estado=0;
estadoImg='hidden';
listMacroEventos:string[]=[];
formMacroEventos!: FormGroup ;
mostrarManoSeleccion:boolean=true;
imagePath:SafeResourceUrl = '../../../assets/gifLogo.gif';

  constructor(private readonly sharedSvc: ShareDataService, 
            private readonly frmBuilder:FormBuilder,
            private readonly dbSvc: DbservicesService,
            private readonly sanitizer:DomSanitizer ){}


//para que cambie el estado de la variable inicial para animación
ngAfterViewInit(){ setTimeout( () => { this.estadoImg = 'shown'; this.cambioInic(); }, 4000);}
cambioInic(){ setTimeout( () => { /*this.estadoImg = 'hidden';*/  this.ngAfterViewInit();    }, 4000);}

mouseOn(){setTimeout( () => { this.estado = 1; this.cambioSecun(); }, 200);}
cambioSecun(){ setTimeout( () => { this.estado=0;}, 5000);}


ngOnInit(): void {

  this.consultarLogStatus();
  this.formMacroEventos= this.iniciaForm();
  //la manita se oculta solo cuando el evento seleccionado ya coincide con el macroEvento activo
  this.formMacroEventos.get('selectTipo')?.valueChanges.subscribe(valor=>{ this.mostrarManoSeleccion=!(valor && valor===this.macroEvento); });
}

setValidatorOpciones():void
{ var arg= this.formMacroEventos.get('selectTipo')?.value;
  this.playAudio("click");
  this.txtBtn=this.macroEvento==arg?"Evento-"+ arg : "ACTIVAR "+arg;
  //se actualiza con que macroEvento se va a trabajar
}

saveItem()
{
  //console.log("valor del agrupador:",this.intCriterio);
  var arg= this.formMacroEventos.get('selectTipo')?.value;
  this.sharedSvc.setUserMacroEvento(arg);

  this.macroEvento=arg;
  this.txtBtn= "Evento-"+arg;
  this.mostrarManoSeleccion=false;//el evento ya quedó activado

  //obtenemos los permisos que tiene el usuario sobre el macroevento elegido
  this.dbSvc.getVistaMacroEventosbyCUM(this.localUser.cum, arg, this.localUser.token, this.localUser.tokenjwt).subscribe(respPermisos=>
    {this.sharedSvc.setEventoPermisos(respPermisos);});

  this.playAudio("info");

    Swal.fire('MacroEvento '+arg+' elegido! ', 'Todo listo para Continuar', 'success');
}
 

  playAudio(sonido:string){
    sentir(sonido);
  }


iniciaForm():FormGroup
{
  return this.frmBuilder.group({selectTipo:['',[Validators.required ]] });
}

consultarLogStatus():void
{
  this.sharedSvc.currentUserMacroEvento$.subscribe(respuesta=>{this.macroEvento=respuesta;});
  this.sharedSvc.currentStatu$.subscribe(respuesta=>
    {
    this.localUser=respuesta;  
    if(respuesta.tokenjwt.length>0)
      {
        this.dbSvc.getcatMacroEventos(this.localUser.tokenjwt).subscribe(resp=>{this.listMacroEventos=[...resp]; });


          this.dbSvc.getImage(this.localUser.cum, this.localUser.token, this.localUser.tokenjwt).subscribe(respObjGenerico=>
          {  
            if(respObjGenerico.objetoGenerico!=null)
              {
                this.imagePath = this.sanitizer.bypassSecurityTrustResourceUrl('data:image/jpg;base64,' + respObjGenerico.objetoGenerico);
              }
            else{ this.imagePath='../../../assets/gifLogo.gif'; }
          });

      }
    });

 //console.log("Valor del estatus login:", this.localUser);
}



}
