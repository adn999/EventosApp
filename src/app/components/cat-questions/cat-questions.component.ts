import { ChangeDetectionStrategy, Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { catQuizzDBModel } from 'src/app/models/catQuizzDBModel';
import { DbservicesService } from 'src/app/services/dbservices.service';
import { ShareDataService } from 'src/app/services/shared-data.service';
import { ToastrService } from 'ngx-toastr';
import { VistaLoginModel } from 'src/app/models/VistaLoginModel';
import { Router } from '@angular/router';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { catQuestionDBModel } from 'src/app/models/catQuestionDBModel';
import { catTipoReactivoDBModel } from 'src/app/models/catTipoReactivoDBModel';
import { bootstrapApplication } from '@angular/platform-browser';
import * as XLSX from 'xlsx';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-cat-questions',
  templateUrl: './cat-questions.component.html',
  styleUrls: ['./cat-questions.component.css'],
  /*changeDetection:ChangeDetectionStrategy.OnPush */
})
export class CatQuestionsComponent implements OnInit {

formQuestion!: FormGroup ;

listQuestions:catQuestionDBModel[]=[];   
listQuizzes:catQuizzDBModel[]=[];   
listTipoReactivos:catTipoReactivoDBModel[]=[];   

panelOpenState = false;//el estatus del acordeón
tokenJWT:string='';
intCriterio:number=0;
pageSize=10; desde=0; hasta=10;
itemToEdit:catQuestionDBModel={id:0,idAgrupador:0, tipoReactivo:0, idOrder:0,isActive:0,isRequired:0,texto:'',textoOpciones:''};
valSelect:number=0;

excelTitle='preguntas';
excelfileName="Preguntas.xlsx";

@ViewChild('txtidOrder', {static:false} )txtidOrderRef!:ElementRef;
@ViewChild('txtTextoOpciones', {static:false} )txtTextoOpcionesRef!:ElementRef;
 
  constructor (private readonly dbSvc:DbservicesService,
    private readonly sharedSvc:ShareDataService,
    private readonly frmBuilder:FormBuilder,
    private readonly toastr:ToastrService,    
    private readonly router: Router,
    private readonly paginator:MatPaginatorModule)
    {
       
    }

ngOnInit(): void 
{ this.consultarLogStatus();
   this.formQuestion= this.iniciaForm();  this.loadEncuestas(); 
  }

loadEncuestas()
{ this.dbSvc.getcatTipoReactivo(this.tokenJWT).subscribe(resp=>{this.listTipoReactivos=[...resp]; });
  this.dbSvc.getcatQuizzes(this.tokenJWT).subscribe(resp=>{this.listQuizzes=[...resp]; });
}

loadQuestions():void
{
   this.panelOpenState=false;
  this.formQuestion.reset();
  this.dbSvc.getcatQuestions(this.intCriterio, this.tokenJWT).subscribe(resp=>
    { this.listQuestions=[...resp]; 
      this.formQuestion.patchValue({txtidOrder: this.listQuestions.length+1 });
    });
}

validarNumero(event:any):void
{ const pattern = /[0-9]/;
  let inputChar = String.fromCharCode(event.charCode);
  if (event.keyCode != 8 && !pattern.test(inputChar)) {event.preventDefault();}
}

setValidatorOpciones():void
{ var arg= this.formQuestion.get('selectTipo')?.value;
  if(arg==5 || arg==6 || arg==8){// this.txtTextoOpcionesRef.nativeElement.focus() ;
  }
}

ObligaOpciones(arg:number):boolean
{
  var resultado:boolean=false;
  if(arg==5 || arg==6 || arg==8){ if(!this.formQuestion.get('txtTextoOpciones')?.value) resultado=true;}
  return resultado;
}



cambiarPagina(evento:PageEvent)
{
  //console.log("evento", evento);
  this.desde=evento.pageIndex*evento.pageSize;
  this.hasta=this.desde+evento.pageSize;
}


//Para devolver la descripción del tipo de reactivo
getTipoDescripcion(arg:number):string
{
  var resp=this.listTipoReactivos.filter(x => x.idTipo == arg )[0].descripcion==undefined?'':this.listTipoReactivos.filter(x => x.idTipo == arg )[0].descripcion;
  return resp; 
}


editItem(item:catQuestionDBModel):void
{
  // console.log("valor del item elegido",item);
  //Pasamos los datos del elemento seleccionado al formulario
  this.itemToEdit=item;this.valSelect=item.tipoReactivo;
  this.formQuestion.patchValue({txtidOrder: item.idOrder});
  this.formQuestion.patchValue({txtTexto: item.texto});
  this.formQuestion.patchValue({txtTextoOpciones: item.textoOpciones});

  this.formQuestion.patchValue({ selectTipo:this.valSelect});
  this.formQuestion.get('chkisActive')?.setValue(item.isActive ==1?true:false); 
  this.formQuestion.get('chkisRequired')?.setValue(item.isRequired==1?true:false);
 
  this.panelOpenState=true;
  setTimeout(() => {this.txtidOrderRef.nativeElement.focus() ; }, 250); 

}

cleanForm():void{
  this.formQuestion.reset(); 
  this.formQuestion.patchValue({txtidOrder: this.listQuestions.length+1 });
}

saveItem()
{
  //console.log("valor del agrupador:",this.intCriterio);
  this.itemToEdit.idAgrupador=this.intCriterio;
  this.itemToEdit.idOrder=this.formQuestion.get('txtidOrder')?.value;
  this.itemToEdit.texto=this.formQuestion.get('txtTexto')?.value;
  this.itemToEdit.tipoReactivo=this.formQuestion.get('selectTipo')?.value;
  this.itemToEdit.isActive=this.formQuestion.get('chkisActive')?.value==true?1:0;
  this.itemToEdit.isRequired=this.formQuestion.get('chkisRequired')?.value==true?1:0;
  this.itemToEdit.textoOpciones=this.formQuestion.get('txtTextoOpciones')?.value;
  
  //console.log("valor del item recolectado:",this.itemToEdit);
  if(this.itemToEdit.id===0){this.addNewItem(this.itemToEdit);}
  else{this.updateItem(this.itemToEdit);} 
}


addNewItem(item:catQuestionDBModel):void
{
  //console.log("elemento a agregar:",item);
   this.dbSvc.savecatQuestion(item, this.tokenJWT).subscribe(data=>
    { 
        this.toastr.success("Registro Agregado","El registro fue agregado correctamente" ) ;
        this.formQuestion.reset();
        this.loadQuestions();
    }); 
}

updateItem(item:catQuestionDBModel):void{
   this.dbSvc.updatecatQuestion(item, this.tokenJWT).subscribe(data=>
    {
      this.toastr.info("Registro Actualizado","El registro fue actualizada correctamente :) " ) ;
      this.formQuestion.reset();
      this.loadQuestions();
      this.itemToEdit.id=0; //regresamos el valor a 0 para que pueda seguir agregando nuevos
    }); 
}


iniciaForm():FormGroup
{
  return this.frmBuilder.group({
                        txtidOrder:['',[ Validators.required, Validators.min(1) ]   ] ,
                        txtTexto:['',[Validators.required,Validators.minLength(10)] ],
                        chkisRequired:[''],
                        chkisActive:[''],
                        selectTipo:['',[Validators.required ]],
                        txtTextoOpciones:['',[Validators.minLength(5) ]  ]
                      });
}


exportexcel(): void
{
  /* pass here the table id */
  let element = document.getElementById('tblPreguntas');
  const ws: XLSX.WorkSheet =XLSX.utils.table_to_sheet(element);

  //hide last column
  ws['!cols'] = [];
  ws['!cols'][6] = { hidden: true };/* here 6 is your column number (n-1) */

  /* generate workbook and add the worksheet */
  const wb: XLSX.WorkBook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, this.excelTitle );

  /* save to file */  
  XLSX.writeFile(wb, this.excelfileName);
}

consultarLogStatus():void
{
  this.sharedSvc.currentStatu$.subscribe(respuesta=>
    { 
      this.tokenJWT=respuesta.tokenjwt;
    });
 
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
  
}


}
