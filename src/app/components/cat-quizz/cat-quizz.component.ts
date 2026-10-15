import { Component, ElementRef, EnvironmentInjector, Injector, OnInit, Signal, ViewChild, inject, runInInjectionContext } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { catQuizzDBModel } from 'src/app/models/catQuizzDBModel';
import { DbservicesService } from 'src/app/services/dbservices.service';
import { ShareDataService } from 'src/app/services/shared-data.service';
import { ToastrService } from 'ngx-toastr';
import { VistaLoginModel } from 'src/app/models/VistaLoginModel';
import { Router } from '@angular/router';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { toSignal } from '@angular/core/rxjs-interop';
import Swal from 'sweetalert2';


@Component({
  selector: 'app-cat-quizz',
  templateUrl: './cat-quizz.component.html',
  styleUrls: ['./cat-quizz.component.css']
})
export class CatQuizzComponent implements OnInit {

localUser!:VistaLoginModel;
listQuizzes:catQuizzDBModel[]=[];   
strCriterio:string='';
formQuizz: FormGroup ;
itemToEdit:catQuizzDBModel={idAgrupador:0, nombreEncuesta:'' };
@ViewChild('txtnombreEncuesta', {static:false} )txtnombreEncuestaref!:ElementRef;
pageSize=10; desde=0; hasta=10;
tokenJWT:string='';

constructor (private readonly dbSvc:DbservicesService,
             private readonly sharedSvc:ShareDataService,
             private readonly frmBuilder:FormBuilder,
             private readonly toastr:ToastrService,
             private readonly router: Router,
             private readonly paginator:MatPaginatorModule             )
             {
                this.formQuizz=this.frmBuilder.group(
                {
                  idAgrupador:0, //debe tener un valor por que no es undefined y por default es 0 para los nuevos elementos
                  nombreEncuesta: ['',[Validators.required,  Validators.minLength(3)]],
                });
             }

             injector = inject(EnvironmentInjector);
             myService = inject(DbservicesService);
             mySignal!: Signal<catQuizzDBModel[] | undefined>;
          

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

consultarLogStatus(){ 

  this.sharedSvc.currentStatu$.subscribe(respuesta=>{this.localUser=respuesta;});
 
  this.sharedSvc.currentCatalogosPermisos$.subscribe(respuesta=>
  { 
    if(respuesta.cargos!="ADMINISTRADOR SISAS")
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


  this.sharedSvc.currentStatu$.subscribe(respuesta=>{this.localUser=respuesta; this.tokenJWT=respuesta.tokenjwt; });
  if(this.localUser.idUsuario.length==0)
  {
  this.toastr.warning("No tiene acceso sin logearse"); 
  this.router.navigate(['home' ] );
  }


}


loaditems():void
{

  this.dbSvc.getcatQuizzes(this.tokenJWT).subscribe(resp=>{this.listQuizzes=[...resp]; });
}
 
editItem(item:catQuizzDBModel):void
{
  //console.log("valor del item elegido",item);
  //Pasamos los datos del elemento seleccionado al formulario
  this.formQuizz.patchValue({nombreEncuesta: item.nombreEncuesta});
  this.itemToEdit=item;
  
  setTimeout(() => {this.txtnombreEncuestaref.nativeElement.focus() ; }, 250);
}

saveItem()
{
 var nombre=this.txtnombreEncuestaref.nativeElement.value;
  this.itemToEdit.nombreEncuesta=this.txtnombreEncuestaref.nativeElement.value;
   if(this.itemToEdit.idAgrupador===0){this.addNewItem(this.itemToEdit);}
   else{this.updateItem(this.itemToEdit);}  
}


addNewItem(item:catQuizzDBModel):void
{
 
  this.dbSvc.savecatQuizz(item,this.tokenJWT).subscribe(data=>
    { 
        this.toastr.success("Registro Agregado","El registro fue agregado correctamente" ) ;
        this.formQuizz.reset();
        //llamamos para actualizar la lista al agregar un item
        this.loaditems();
    });
}

updateItem(item:catQuizzDBModel):void{
 
  this.dbSvc.updatecatQuizz(item, this.tokenJWT).subscribe(data=>
    {
      this.toastr.info("Registro Actualizado","El registro fue actualizada correctamente :) " ) ;
      this.formQuizz.reset();
      this.loaditems();
      this.itemToEdit.idAgrupador=0; //regresamos el valor a 0 para que pueda seguir agregando nuevos
    });
}



}
