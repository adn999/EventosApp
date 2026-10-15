import { ModoCaptura, modoGuardado } from 'src/app/services/escaner';
import { reproducir, vibrar } from 'src/app/services/haptica';
import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { DbservicesService } from 'src/app/services/dbservices.service';
import { ShareDataService } from 'src/app/services/shared-data.service';
import { ToastrService } from 'ngx-toastr';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';
import { registroEventoDBModel } from 'src/app/models/registroEventoDBModel';
import { VistaSaludGeneral } from 'src/app/models/VistaSaludGeneralModel';
import { VistaSaludFicha } from 'src/app/models/VistaSaludFicha';
import { VistaSaludFichaPsicologica } from 'src/app/models/VistaSaludFichaPsicologica';
import { VistaSaludVacunas } from 'src/app/models/VistaSaludVacunas';
import { formatDate } from '@angular/common';
import { HistorialMedicoDBModel } from 'src/app/models/HistorialMedicoDBModel';
import { state, style, transition, trigger, useAnimation } from '@angular/animations';
import { transitionCollapse, transitionCollapseFast, transitionEntrada, transitionSalida } from '../animation';
import { VistaLoginModel } from 'src/app/models/VistaLoginModel';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

@Component({
  selector: 'app-salud',
  templateUrl: './salud.component.html',
  styleUrls: ['./salud.component.css'],
  animations:[trigger('mostrarTrigger', [state('hidden',style({ opacity:0})), transition('hidden => shown', [ useAnimation(transitionEntrada) ]),  ]),
              trigger('mostrarTriggerLeft', [state('hidden',style({ opacity:0})), transition('hidden => shown', [ useAnimation(transitionSalida) ]),  ]),
              trigger('mostrarTriggerCollapse', [state('hidden',style({ opacity:0})), transition('hidden => shown', [ useAnimation(transitionCollapse) ]) ]),
              trigger('triggResult', [ transition('false => true', [ useAnimation(transitionCollapseFast) ]) ]) ]
})
export class SaludComponent implements OnInit {


  formRegistro!: FormGroup ;
  @ViewChild('txtPulsera', {static:false} )txtPulseraRef!:ElementRef;

 
  localUser!:VistaLoginModel;
  macroEvento:string='';
  idEvento!:number;
  nombreEvento:string='';
  panelOpenState = false;//el estatus del acordeón

  saludGral:VistaSaludGeneral={idUsuario:"", cum:'',nombre:'', peso:0, estatura:0, tipoSangre:'', imc:0, 
                               factorRH:false,imss:'',issste:'',isseMyM:'', issfam:'', seguroPopular:'', pemex:'',
                               sedena:'', aseguradoraParticular:'', numeroAseguradoraParticular:'', tipoSeguro:'',
                               otroSeguroMedico:'',numeroSeguro:0,detalleAlergias:'',tratamientoMedico:'',
                               tratamientoMedicoPsicologico:'', informacion:'', sabeNadar:false, notaComentario:'', 
                               reaccionAlergica:'', edad:0} ;

listPadecimientos:VistaSaludFicha[]=[];   
listPadecimientosPsy:VistaSaludFichaPsicologica[]=[];   
listVacunas:VistaSaludVacunas[]=[]; 
listHistorial:HistorialMedicoDBModel[]=[];   

//variables para administrar el historial médico
strCriterio:string='';
formHistorial!: FormGroup ;
itemToEdit:HistorialMedicoDBModel={id:0, idEvento:0, nombreEvento:'', cum:'', fecha:new Date('2000,1,1'), cumRegistrador:'',
                                   atencionCuracion:0,atencionBasica:0,atencionObservacion:0,atencionPsicologica:0,atencionOtra:0,
                                   motivoConsulta:'', descripcion:'',tratamiento:'',resultado:''};
listMotivosConsulta:string[]=['GastroIntestinal', 'Vias Respiratorias', 'Malestar General', 'Dermatitis/Picaduras','Oftálmicos',
                              'Heridas/Curaciones','Musculoesquelético','Metabólicos','Otro']; 
                                
listResultado:string[]=['Alta', 'Observación y Alta', 'Traslado']; 
                                    
                              
@ViewChild('txtDescripcion', {static:false} )txtDescripcionref!:ElementRef;              
@ViewChild('txtTratamiento', {static:false} )txtTratamientoref!:ElementRef;
@ViewChild('selectResultado', {static:false} )selectResultadoref!:ElementRef;
@ViewChild('selectMotivoConsulta', {static:false} )selectMotivoConsultaref!:ElementRef;

@ViewChild('checkAtencionCuracion', {static:false} )checkAtencionCuracionref!:ElementRef;
@ViewChild('checkAtencionBasica', {static:false} )checkAtencionBasicaref!:ElementRef;
@ViewChild('checkAtencionObservacion', {static:false} )checkAtencionObservacionref!:ElementRef;
@ViewChild('checkAtencionPsicologica', {static:false} )checkAtencionPsicologicaref!:ElementRef;
@ViewChild('checkAtencionOtra', {static:false} )checkAtencionOtraref!:ElementRef;

estado='hidden';
imagePath:SafeResourceUrl='';

  // Captura: 'teclado' (cuadro de texto / lector externo) o 'camara' (solo códigos de barras). Arranca en teclado y recuerda la última opción al navegar.
  modoCaptura: ModoCaptura = modoGuardado('salud');
  alEscanear(control: string, valor: string): void {
    this.formRegistro.patchValue({ [control]: valor });
    if (this.formRegistro.invalid) { vibrar('error'); this.toastr.warning('Código no válido para este campo.'); return; }
    this.getItem();
  }

  constructor (private readonly dbSvc:DbservicesService,
    private readonly sharedSvc:ShareDataService,
    private readonly frmBuilder:FormBuilder,
    private readonly toastr:ToastrService,    
    private readonly router: Router, 
    private readonly sanitizer:DomSanitizer)
    {   
      
     }

  //para que cambie el estado de la variable inicial para animación
ngAfterViewInit(){ setTimeout( () => { this.estado = 'shown';}, 200);}

    ngOnInit(): void 
    {
        this.formRegistro= this.iniciaForm();
        this.formHistorial=this.iniciaFormHistorial();
        this.consultarLogStatus();  
        setTimeout(() => {this.txtPulseraRef.nativeElement.focus() ; }, 250); 
    }
      


    getItem():void
    {
      const pulseraTemp= this.formRegistro.get('txtPulsera')?.value;     
      if(pulseraTemp==''){return;}

      
      this.dbSvc.getRegistroEventobyCUM( pulseraTemp, this.macroEvento, this.localUser.token, this.localUser.tokenjwt).subscribe(resp=>
      { 
          //si no se localizó por cum, se busca por pulsera
          if(resp.idEvento==0)
          {
          //  console.log('valor de idevento por cum:', resp.idEvento+ ' '+resp.nombre);
            this.dbSvc.getRegistroEventobyPulsera(pulseraTemp, this.macroEvento,this.localUser.token, this.localUser.tokenjwt).subscribe(respulsera=>
              {    
               //  console.log("valor de idevento por pulsera:"+respulsera.idEvento)
                if(respulsera.idEvento==0)//si no tiene pulsera se muestra mensaje de que no se localizó
                {  
                     this.createMsg('CUM/Pulsera No Localizada! Favor de buscar con otro dato');
                     this.cleanForm();
                     this.playAudio("error");  
                     return;
               }
                else{ this.idEvento=respulsera.idEvento; this.nombreEvento=respulsera.nombreEvento;
                      this.getItemSalud(respulsera.cum);
                      //console.log('valor de cumAbuscar: '+respulsera.cum); 
                    }
              });
          }
          else{this.idEvento=resp.idEvento; this.nombreEvento=resp.nombreEvento; this.getItemSalud(resp.cum);  }
      });
    }

    getItemSalud(cumABuscar:string):void
    {
          //----comienza recolección de datos
          this.panelOpenState = false;
          this.dbSvc.getVistaSaludGeneral(cumABuscar, this.localUser.token, this.localUser.tokenjwt).subscribe(respSG=>
            { 
             // console.log(respSG);
              this.saludGral.cum=respSG.cum;
              this.saludGral.idUsuario=respSG.idUsuario;
              this.saludGral.nombre=respSG.nombre;
              this.saludGral.peso=respSG.peso;
              this.saludGral.estatura=respSG.estatura;
              this.saludGral.tipoSangre=respSG.tipoSangre;
              this.saludGral.imc=respSG.imc;
              this.saludGral.factorRH=respSG.factorRH;
              this.saludGral.imss=respSG.imss;
              this.saludGral.issste=respSG.issste;
              this.saludGral.isseMyM=respSG.isseMyM;
              this.saludGral.issfam=respSG.issfam;
              this.saludGral.seguroPopular=respSG.seguroPopular;
              this.saludGral.pemex=respSG.pemex;
              this.saludGral.sedena=respSG.sedena;
              this.saludGral.aseguradoraParticular=respSG.aseguradoraParticular;
              this.saludGral.numeroAseguradoraParticular=respSG.numeroAseguradoraParticular;
              this.saludGral.tipoSeguro=respSG.tipoSeguro;
              this.saludGral.otroSeguroMedico=respSG.otroSeguroMedico;
              this.saludGral.numeroSeguro=respSG.numeroSeguro;
              this.saludGral.detalleAlergias=respSG.detalleAlergias;
              this.saludGral.tratamientoMedico=respSG.tratamientoMedico;
              this.saludGral.tratamientoMedicoPsicologico=respSG.tratamientoMedicoPsicologico;
              this.saludGral.informacion=respSG.informacion;
              this.saludGral.sabeNadar=respSG.sabeNadar;
              this.saludGral.notaComentario=respSG.notaComentario;
              this.saludGral.reaccionAlergica=respSG.reaccionAlergica;
              this.saludGral.edad=respSG.edad;
              
              this.imagePath='../../../assets/gifLogo.gif';

              //se consulta imagen del usuario
              this.dbSvc.getImage(cumABuscar, this.localUser.token, this.localUser.tokenjwt).subscribe(respObjGenerico=>
                  {  
                  if(respObjGenerico.objetoGenerico!=null)
                    {
                      this.imagePath = this.sanitizer.bypassSecurityTrustResourceUrl('data:image/jpg;base64,'+ respObjGenerico.objetoGenerico);
                    }
                  else{this.imagePath='';}
                  });


              this.dbSvc.getVistaSaludFicha(cumABuscar,this.localUser.token, this.localUser.tokenjwt).subscribe(respFicha=>
              { 
                this.listPadecimientos=[...respFicha]; 
              });
              this.dbSvc.getVistaSaludFichaPsicologica(cumABuscar,this.localUser.token, this.localUser.tokenjwt).subscribe(respFichaPsy=>
              {
               this.listPadecimientosPsy=[...respFichaPsy]; 
              });
              this.dbSvc.getVistaSaludVacunas(cumABuscar,this.localUser.token, this.localUser.tokenjwt).subscribe(respVacunas=>
              {
                 this.listVacunas=[...respVacunas]; 
              });
              //consultamos listado de historial
              this.getItemsHistorial(cumABuscar);
               this.playAudio("info");
              
            });
            //--------------termina recolección de datos---------------
    }

    //llena el listado con el historial médico 
    getItemsHistorial( cumAbuscar:string ):void
    {
      this.dbSvc.getHistorialMedico( cumAbuscar,this.localUser.token, this.localUser.tokenjwt).subscribe(respHisto=>
        {
          //console.log(respHisto)
           this.listHistorial=[...respHisto]; 
           for(let i=0; i<this.listHistorial.length; i++)
            {
              this.dbSvc.getUsuario( this.listHistorial[i].cumRegistrador,this.localUser.token,this.localUser.tokenjwt).subscribe(
                resp=>{ this.listHistorial[i].cumRegistrador= resp.nombre;  });
            }
           
        });
    }


    //pasa los datos del listado al formulario para actualizar
    editItem(item:HistorialMedicoDBModel):void
    {
      //console.log("valor del item elegido",item);
      this.formHistorial.patchValue({txtDescripcion: item.descripcion, 
                                     txtTratamiento:item.tratamiento,
                                     selectMotivoConsulta:item.motivoConsulta,
                                     selectResultado:item.resultado });

    this.checkAtencionCuracionref.nativeElement.checked=item.atencionCuracion==1?true:false;
    this.checkAtencionBasicaref.nativeElement.checked=item.atencionBasica==1?true:false;
    this.checkAtencionObservacionref.nativeElement.checked=item.atencionObservacion==1?true:false;
    this.checkAtencionPsicologicaref.nativeElement.checked=item.atencionPsicologica==1?true:false;
    this.checkAtencionOtraref.nativeElement.checked=item.atencionOtra==1?true:false;
       
    this.itemToEdit=item;
      
      setTimeout(() => {this.txtDescripcionref.nativeElement.focus() ; }, 250);
    }
    
    saveItem()
    {
      if( this.txtDescripcionref.nativeElement.value==''){return;}
      //si es nuevo, se le complementan los datos básicos
       if(this.itemToEdit.idEvento==0)
       {
        this.itemToEdit.idEvento=this.idEvento;
        this.itemToEdit.nombreEvento=this.nombreEvento;
        this.itemToEdit.cum=this.saludGral.cum;
       }
      const fechaDate=  new Date(this.itemToEdit.fecha);     
    
       //2000 es el año default cuando no existe uno previo
      if(  fechaDate.getFullYear() ==2000)
        {
          this.itemToEdit.fecha=new Date();
          this.itemToEdit.fecha.setHours(this.itemToEdit.fecha.getHours()-6);  
        }
      this.itemToEdit.cumRegistrador=this.localUser.cum;

    
      this.itemToEdit.atencionCuracion=this.checkAtencionCuracionref.nativeElement.checked==true?1:0;
      this.itemToEdit.atencionBasica=this.checkAtencionBasicaref.nativeElement.checked==true?1:0;
      this.itemToEdit.atencionObservacion=this.checkAtencionObservacionref.nativeElement.checked==true?1:0;
      this.itemToEdit.atencionPsicologica=this.checkAtencionPsicologicaref.nativeElement.checked==true?1:0;
      this.itemToEdit.atencionOtra=this.checkAtencionOtraref.nativeElement.checked==true?1:0;

      if(this.itemToEdit.atencionCuracion==0 && this.itemToEdit.atencionBasica==0 &&
         this.itemToEdit.atencionObservacion==0 && this.itemToEdit.atencionPsicologica==0 &&
         this.itemToEdit.atencionOtra==0)
         {
          Swal.fire({
            title: "No ha seleccionado un tipo de Atención!", text:"Debes seleccionar un Tipo de Atención primero",
            icon:"info",iconColor:'purple',color: '#purple',
            background:'rgba(255, 255, 255, 0.87)',backdrop: `rgba(0,0,123,0.4)`,
            showDenyButton: false,
            confirmButtonText: 'Enterado',confirmButtonColor:'#CD6155'
          }).then((result) => {if (result.isConfirmed) { return; } });
          return;
         }

      this.itemToEdit.motivoConsulta=this.formHistorial.get('selectMotivoConsulta').value;
      this.itemToEdit.tratamiento=this.formHistorial.get('txtTratamiento')?.value;
      this.itemToEdit.descripcion=this.formHistorial.get('txtDescripcion')?.value;
      this.itemToEdit.resultado=this.formHistorial.get('selectResultado')?.value;

     
      //console.log('valor de elemento a guardar:',this.itemToEdit);
      this.dbSvc.postHistorialMedico(this.itemToEdit, this.localUser.token, this.localUser.tokenjwt).subscribe(data=>
        { 
            this.toastr.success("Registro Médico Agregado","El registro fue agregado correctamente" );   
             this.playAudio("ok");
            this.cleanFormHistorial();
            //llamamos para actualizar la lista al agregar un item sobre el dato que aún conserva el cum
            this.getItemsHistorial(this.saludGral.cum);
        });

    }
    
    
    cleanForm():void{
      this.formRegistro.reset(); 
      this.formRegistro.patchValue({txtPulsera:''  });
      this.listPadecimientos=[];   
      this.listPadecimientosPsy=[];   
      this.listVacunas=[];  
      this.listHistorial=[];
      this.saludGral={idUsuario:"", cum:'',nombre:'', peso:0, estatura:0, tipoSangre:'', imc:0, 
                               factorRH:false,imss:'',issste:'',isseMyM:'', issfam:'', seguroPopular:'', pemex:'',
                               sedena:'', aseguradoraParticular:'', numeroAseguradoraParticular:'', tipoSeguro:'',
                               otroSeguroMedico:'',numeroSeguro:0,detalleAlergias:'',tratamientoMedico:'',
                               tratamientoMedicoPsicologico:'', informacion:'', sabeNadar:false, notaComentario:'', 
                               reaccionAlergica:'', edad:0} ;

      this.itemToEdit={id:0, idEvento:0, nombreEvento:'', cum:'', fecha:new Date('2000,1,1'), cumRegistrador:'',
                        atencionCuracion:0,atencionBasica:0,atencionObservacion:0,atencionPsicologica:0,atencionOtra:0,
                        motivoConsulta:'', descripcion:'',tratamiento:'',resultado:''};

      this.cleanFormHistorial();
      this.playAudio("click");
      setTimeout(() => {this.txtPulseraRef.nativeElement.focus() ; }, 250); 
    }

    cleanFormHistorial() {
      this.itemToEdit={id:0, idEvento:0, nombreEvento:'', cum:'', fecha:new Date('2000,1,1'), cumRegistrador:'',
                      atencionCuracion:0,atencionBasica:0,atencionObservacion:0,atencionPsicologica:0,atencionOtra:0,
                      motivoConsulta:'', descripcion:'',tratamiento:'',resultado:''};

      this.formHistorial.reset();
      this.checkAtencionCuracionref.nativeElement.checked=
      this.checkAtencionBasicaref.nativeElement.checked=
      this.checkAtencionObservacionref.nativeElement.checked=
      this.checkAtencionPsicologicaref.nativeElement.checked=
      this.checkAtencionOtraref.nativeElement.checked=false;

      //aqui se limpian los campos faltantes...
      setTimeout(() => {this.txtDescripcionref.nativeElement.focus() ; }, 250); 
      }


    consultarLogStatus():void
    {
      this.sharedSvc.currentStatu$.subscribe(respuesta=>{this.localUser=respuesta;});
     
      this.sharedSvc.currentUserMacroEvento$.subscribe(respuesta=>
        {this.macroEvento=respuesta;
        
          if(respuesta.length==0)
            {
              Swal.fire({
                title: "No ha seleccionado el Evento!", text:"Debes seleccionar un evento primero",
                icon:"info",iconColor:'purple',color: '#purple',
                background:'rgba(255, 255, 255, 0.87)',backdrop: `rgba(0,0,123,0.4)`,
                showDenyButton: false,
                confirmButtonText: 'Enterado',confirmButtonColor:'#CD6155'
              }).then((result) => {if (result.isConfirmed) { this.router.navigate(['home' ] );} });
            }
            else
            {
              this.sharedSvc.currentEventoPermisos$.subscribe(respuesta=>
                { 
                  if(!respuesta.fichaSalud)
                  {
                    Swal.fire({
                      title: "No tiene permiso para ver la ficha de salud del Evento", text:"Debes contactar al Administrador del Evento",
                      icon:"info",iconColor:'purple',color: '#purple',
                      background:'rgba(255, 255, 255, 0.87)',backdrop: `rgba(0,0,123,0.4)`,
                      showDenyButton: false,
                      confirmButtonText: 'Enterado',confirmButtonColor:'#CD6155'
                    }).then((result) => {if (result.isConfirmed) { this.router.navigate(['home' ] );} });
                  }
                });
            }

          });
     

    
    }

    formatoFecha(fecha:Date):string
    {return formatDate(fecha, 'dd-MMM-YYYY', 'en-US');}

        
    
  playAudio(sonido:string){
    reproducir(sonido);
  }


   createMsg(msg:string):void
     {
        Swal.fire({
                        title: msg,
                        text: '',
                        timer: 1600, // 2000 milliseconds = 2 seconds
                        showConfirmButton: false ,// Optionally hide the confirmation button
                        icon:'error'
                    });
        this.playAudio("error");
        return;
      }


    isString(x:string):boolean 
    {
    if ( isNaN((Number(x)) )   ) 
    {
    //  console.log(Number(x));
      return true; 
    }
    return false;
    }

    iniciaForm():FormGroup
    {
      return this.frmBuilder.group({
        txtPulsera:['',[Validators.required,Validators.minLength(5)] ],   });
    }


    iniciaFormHistorial():FormGroup
   {
     return this.frmBuilder.group({
        id:0, //debe tener un valor por que no es undefined y por default es 0 para los nuevos elementos
        txtDescripcion: ['',[Validators.required,  Validators.minLength(3)]],
        txtTratamiento: ['',[Validators.required,  Validators.minLength(3)]],
        selectResultado: ['',[Validators.required]],
        selectMotivoConsulta: ['',[Validators.required]]
      });
    }
 


}
