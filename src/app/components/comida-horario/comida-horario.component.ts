import { reproducir } from 'src/app/services/haptica';
import { Component, ElementRef, EnvironmentInjector, Injector, OnInit, Signal, ViewChild, inject, runInInjectionContext } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { DbservicesService } from 'src/app/services/dbservices.service';
import { ShareDataService } from 'src/app/services/shared-data.service';
import { ToastrService } from 'ngx-toastr';
import { VistaLoginModel } from 'src/app/models/VistaLoginModel';
import { Router } from '@angular/router';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { toSignal } from '@angular/core/rxjs-interop';
import Swal from 'sweetalert2';
import { catComidaHorarioDBModel } from 'src/app/models/catComidaHorarioDBModel';

@Component({
  selector: 'app-comida-horario',
  templateUrl: './comida-horario.component.html',
  styleUrls: ['./comida-horario.component.css']
})
export class ComidaHorarioComponent implements OnInit
{


localUser!:VistaLoginModel;
listItems: catComidaHorarioDBModel[]=[];
itemToEdit:catComidaHorarioDBModel={ idComida_Horario:0, hora_inicial:0, hora_final:0,  descripcion:'' };
 
strCriterio:string='';
formcatComidaHorario: FormGroup ;

@ViewChild('txthora_inicial', {static:false} )txthora_inicial!:ElementRef;
@ViewChild('txthora_final', {static:false} )txthora_final!:ElementRef;
pageSize=10; desde=0; hasta=10;
tokenJWT:string='';

constructor (private readonly dbSvc:DbservicesService,
             private readonly sharedSvc:ShareDataService,
             private readonly frmBuilder:FormBuilder,
             private readonly toastr:ToastrService,
             private readonly router: Router,
             private readonly paginator:MatPaginatorModule             )
             {
                this.formcatComidaHorario=this.frmBuilder.group(
                {
                  idComida_Horario:0, //debe tener un valor por que no es undefined y por default es 0 para los nuevos elementos
                  hora_inicial:0,
                  hora_final:0,
                  descripcion: ['',[Validators.required,  Validators.minLength(3)]],
                });
             }

             injector = inject(EnvironmentInjector);
             myService = inject(DbservicesService);
             mySignal!: Signal<catComidaHorarioDBModel[] | undefined>;
          

ngOnInit(): void {
 

/*   runInInjectionContext(this.injector, () => {
    this.mySignal = toSignal(this.myService.getcatQuizzes()  );
    console.log("quizzes leídos desde signal:" +  JSON.stringify(this.mySignal() )  );
  }); */


  this.consultarLogStatus();
  this.loaditems();
}

cambiarPagina(evento:PageEvent)
{
  console.log("evento", evento);
  this.desde=evento.pageIndex*evento.pageSize;
  this.hasta=this.desde+evento.pageSize;
}



loaditems():void
{

  this.dbSvc.getRegistroEventoComidacatComidaHorario(this.localUser.token, this.tokenJWT).subscribe(resp=>{this.listItems=[...resp]; });
}
 

editItem(item:catComidaHorarioDBModel):void
{
  //console.log("valor del item elegido",item);
  //Pasamos los datos del elemento seleccionado al formulario
  this.formcatComidaHorario.patchValue({idComida_Horario: item.idComida_Horario });
  this.formcatComidaHorario.patchValue({descripcion: item.descripcion });
  this.formcatComidaHorario.patchValue({hora_inicial: item.hora_inicial });
  this.formcatComidaHorario.patchValue({hora_final: item.hora_final });
  this.itemToEdit=item;
  this.playAudio("click");
  setTimeout(() => {this.txthora_inicial.nativeElement.focus() ; }, 250);
}

saveItem()
{
  this.itemToEdit.hora_inicial= Number( this.txthora_inicial.nativeElement.value);
  this.itemToEdit.hora_final= Number(this.txthora_final.nativeElement.value);
  // El servidor compara la hora actual (0-23) con el rango: la hora final debe ser mayor que la inicial y en formato de 24 h
  // (p. ej. la cena de 18 a 11 nunca es válida; 11 de la noche se captura como 23)
  const hi=this.itemToEdit.hora_inicial, hf=this.itemToEdit.hora_final;
  const valida=(h:number)=>Number.isInteger(h) && h>=0 && h<=24;
  if(!valida(hi) || !valida(hf) || hf<=hi)
  {
    this.playAudio("error");
    this.toastr.warning("Usa horas de 0 a 24 (formato de 24 h; las 11 de la noche son 23) y una hora final mayor que la inicial.","Horario no válido");
    return;
  }
 
   if(this.itemToEdit.idComida_Horario===0)
    {
      //this.addNewItem(this.itemToEdit);    
    }
   else{this.updateItem(this.itemToEdit);}  
   this.playAudio("ok");
}


addNewItem(item:catComidaHorarioDBModel):void
{
  this.dbSvc.PostcatComidaHorario(item,this.localUser.token, this.tokenJWT).subscribe(data=>
    { 
        this.toastr.success("Registro Agregado","El registro fue agregado correctamente" ) ;
        this.formcatComidaHorario.reset();
        //llamamos para actualizar la lista al agregar un item
        this.loaditems();
    });
}

updateItem(item:catComidaHorarioDBModel):void{

  this.dbSvc.PostcatComidaHorario(item, this.localUser.token, this.tokenJWT).subscribe(data=>
    {
      this.toastr.info("Registro Actualizado","El registro fue actualizada correctamente :) " ) ;
      this.formcatComidaHorario.reset();
      this.loaditems();
      this.itemToEdit.idComida_Horario=0; //regresamos el valor a 0 para que pueda seguir agregando nuevos
    });
}



  playAudio(sonido:string){
    reproducir(sonido);
  }


consultarLogStatus(){ 

  this.sharedSvc.currentStatu$.subscribe(respuesta=>{this.localUser=respuesta;});
 
    this.sharedSvc.currentCatalogosPermisos$.subscribe(respuesta=>
    { 
     // alert("respuesta de permisos:" + JSON.stringify(respuesta.cargos));
      if(respuesta.cargos!="ADMINISTRADOR SISAS" )
      {
        Swal.fire({
          title: "No ha tiene permiso a este módulo", text:"Debes contactar a personal de ASMAC Nacional",
          icon:"info",iconColor:'purple',color: '#purple',
          background:'rgba(255, 255, 255, 0.87)',backdrop: `rgba(0,0,123,0.4)`,
          showDenyButton: false,
          confirmButtonText: 'Enterado',confirmButtonColor:'#CD6155'
        }).then((result) => {if (result.isConfirmed) { this.router.navigate(['home' ] );} });

      }
    });


      this.sharedSvc.currentStatu$.subscribe(respuesta=>
        {
          this.localUser=respuesta; this.tokenJWT=respuesta.tokenjwt; 
        });

      if(this.localUser.idUsuario.length==0)
      {
      this.toastr.warning("No tiene acceso sin logearse"); 
      this.router.navigate(['home' ] );
      }

}



}

   



