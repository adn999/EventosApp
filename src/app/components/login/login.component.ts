import { reproducir } from 'src/app/services/haptica';
import { Component,  OnInit, Renderer2, ViewChild, ElementRef } from '@angular/core';
import { NgForm } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { VistaLoginModel } from 'src/app/models/VistaLoginModel';
import { DbservicesService } from 'src/app/services/dbservices.service';
import { ShareDataService } from 'src/app/services/shared-data.service';
import { BiometriaService } from 'src/app/services/biometria.service';
import Swal from 'sweetalert2';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import {animate,state,style, trigger, transition, useAnimation} from '@angular/animations';
import { transitionAnimation, transitionCollapse, transitionEntrada, transitionImg, transitionSalida } from '../animation';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
   animations:[
    trigger('visibleHidden', [
      state('visible', style({transform:'scale(1)', opacity: 1  })),
      state('void,hidden', style({transform:'scale(0.8)',  opacity: 0 })),
      transition('*=> visible',   animate('0.3s ease') ),
      transition('*=>void, *=>hidden',  animate('250ms') ),
                              ]),
                              
   trigger('imgTrigger', [transition('shown => hidden',[ useAnimation(transitionImg) ]),  ]),
   trigger('mostrarTrigger', [state('hidden', style({ opacity: 0  })),
                                   transition('hidden => shown', [ useAnimation(transitionEntrada) ]),  ]),
   trigger('mostrarTriggerLeft', [state('hidden', style({ opacity: 0  })), transition('hidden => shown', [ useAnimation(transitionSalida) ]),  ]),
   trigger('mostrarTriggerCollapse', [state('hidden', style({ opacity: 0  })), transition('hidden => shown', [ useAnimation(transitionCollapse) ]) ])]
})
 

export class LoginComponent implements OnInit {

constructor(private readonly sharedSvc: ShareDataService, 
            private readonly dbSvc: DbservicesService,
            private readonly toastr:ToastrService,
            private renderer:Renderer2,
            private readonly biometria:BiometriaService){}

 @ViewChild('loginForm') contactForm!:NgForm;
 @ViewChild('bgVideo') bgVideo!:ElementRef<HTMLVideoElement>;
 showPassword=false;

localUser!:VistaLoginModel;
localCUM:string='';
localPass:string='';



//pertenecientes a animation
isVisible=false;
toggle():void{this.isVisible=!this.isVisible;}
estado='hidden';
estadoImg='hidden';


metodoBiometrico='';          // '' = sin biometría disponible (o navegador)
biometriaGuardada=false;      // ya hay credenciales guardadas en el dispositivo

async ngOnInit(): Promise<void>
{
  this.consultarLogStatus();
  this.metodoBiometrico = await this.biometria.metodoDisponible();
  this.biometriaGuardada = this.metodoBiometrico ? await this.biometria.hayCredencialesGuardadas() : false;
  //this.localCUM="NAL2390004"; this.localPass=".";
}

//para que cambie el estado de la variable inicial para animación
ngAfterViewInit(){ setTimeout( () => { this.estado = 'shown';   this.cambioInic();    }, 250);}

cambioInic(){ setTimeout( () => { this.estadoImg = 'shown';    this.cambioSecun();   }, 4500);}
cambioSecun(){ setTimeout( () => { this.estadoImg = 'hidden';  this.cambioInic();    }, 4500);}


onLogin():void
{
 /*  Swal.fire({title:"<strong> <u>Te estamos conectando...</u></strong>", text: '', timer: 2000, icon:'info', showCloseButton:false,
  color: '#purple', iconColor:'purple',
  background:'rgba(255, 255, 255, 0.87)',  backdrop: `rgba(0,0,123,0.4)`,
    });  */

  this.dbSvc.DoLogin(this.localCUM, this.localPass).subscribe(respjwt=>
      {
        if( (respjwt=='token expirado' || respjwt=='Password Incorrecto' || respjwt=='No existe el CUM') &&
             respjwt.length<180 ){this.toastr.warning("Login Incorrecto:"+respjwt); this.playAudio("error"); this.isVisible=false; if(this.biometriaGuardada && respjwt=='Password Incorrecto'){ this.desactivarBiometria(); }}
        else{            
              this.dbSvc.DoLoginToken(this.localCUM, this.localPass,respjwt).subscribe(respuesta=>
              {
                if( (respuesta=='No existe el CUM' || respuesta=='Password Incorrecto') &&
                    respuesta.length<35 ){this.toastr.warning("Login Incorrecto:"+respuesta);this.playAudio("error"); this.isVisible=false;}
                else//SÍ hubo un login Exitoso, cargamos sus datos en modo compartido entre componentes
                {
                  this.dbSvc.getUsuario(this.localCUM,respuesta,respjwt).subscribe(resp=>{
                    this.localUser=resp;  
                  //completamos los tokens para su uso en los siguientes components
                    resp.tokenjwt=respjwt;
                    resp.token=respuesta;
                    this.isVisible=false;
                    this.sharedSvc.setStatus(resp); 
                    //obtenemos los permisos de catalogos
                    this.dbSvc.getVistaConsultaMiembros(this.localCUM,resp.token, resp.tokenjwt).subscribe(respCatalogos=>
                      {
                       // console.log("respuesta de permisos:" + JSON.stringify(respCatalogos));
                        this.sharedSvc.setCatalogosPermisos(respCatalogos);
                      });
                  this.playAudio("click");
                  this.ofrecerBiometria();
                  });
                }     
              });
            }
     });
}

// Entrar con Face ID / huella usando las credenciales guardadas
async onLoginBiometrico():Promise<void>
{
  const cred = await this.biometria.obtener();
  if(!cred){
    // cancelar el Face ID no es un fallo: solo se avisa si hubo un error real
    if(!/cancel/i.test(this.biometria.ultimoError)) this.toastr.info('No se pudo verificar tu identidad: '+this.biometria.ultimoError);
    return;
  }
  this.localCUM = cred.cum; this.localPass = cred.password;
  this.isVisible = true;
  this.onLogin();
}

// Tras un login correcto con contraseña: ofrecer activar la biometría (opcional)
private async ofrecerBiometria():Promise<void>
{
  if(!this.metodoBiometrico) return;
  if(this.biometriaGuardada){ await this.biometria.guardar(this.localCUM, this.localPass); return; } // mantiene vigente la contraseña
  if(this.biometria.yaRechazo()) return;
  const r = await Swal.fire({ title:`¿Entrar con ${this.metodoBiometrico}?`,
    text:'La próxima vez podrás iniciar sesión sin escribir tu contraseña. Puedes desactivarlo cuando quieras.',
    icon:'question', showCancelButton:true, showDenyButton:true,
    confirmButtonText:'Activar', denyButtonText:'No volver a preguntar', cancelButtonText:'Ahora no' });
  if(r.isConfirmed){ this.biometriaGuardada = await this.biometria.guardar(this.localCUM, this.localPass); }
  else if(r.isDenied){ this.biometria.recordarRechazo(true); }
}

async desactivarBiometria():Promise<void>
{
  await this.biometria.borrar();
  this.biometriaGuardada=false;
  this.biometria.recordarRechazo(false);
  this.toastr.success('Inicio con '+this.metodoBiometrico+' desactivado');
}

  playAudio(sonido:string){
    reproducir(sonido);
  }

consultarLogStatus():void
{
 this.sharedSvc.currentStatu$.subscribe(respuesta=>{this.localUser=respuesta;});
 // console.log("Valor del estatus login:", this.localLogStatus);
}

toggleShow() { this.showPassword = !this.showPassword;}

playBgVideo(): void { this.bgVideo?.nativeElement?.play(); }


}
