import { reproducir } from 'src/app/services/haptica';
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
import { EventoDBModel } from 'src/app/models/EventoDBModel';
import { VistaComidaEvento } from 'src/app/models/VistaComidaEvento';
import { catComidasDBModel } from 'src/app/models/catComidasDBModel';

@Component({
  selector: 'app-comida-evento',
  templateUrl: './comida-evento.component.html',
  styleUrls: ['./comida-evento.component.css']
})
export class ComidaEventoComponent implements OnInit{


formQuestion!: FormGroup ;
localUser!:VistaLoginModel;

macroEventoSelected!:string;
eventoSelected!:number;


listMacroEventos:string[]=[]
listEventos:EventoDBModel[]=[]
listVistaComidasEvento:VistaComidaEvento[]=[];

  
listcatComidas:catComidasDBModel[]=[];   

panelOpenState = false;//el estatus del acordeón
 
fechaValor:Date;

pageSize=10; desde=0; hasta=10;
itemToEdit:VistaComidaEvento={ idComida_Evento:0,fecha:null, idComida:0,descripcionComida:'', idEvento:0,  nombreEvento:'',  macroEvento:''};
valSelect:number=0;

excelTitle='ComidasEvento';
excelfileName="ComidasEvento.xlsx";

@ViewChild('txtFecha', {static:false} )txtFechaRef!:ElementRef;

 
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
   this.formQuestion= this.iniciaForm(); this.loadCatalogos();  
}


loadEventos()
{
     this.dbSvc.getcatEventosAlimentos( this.macroEventoSelected, this.localUser.tokenjwt).subscribe(resp=>{this.listEventos=[...resp]; });
     this.playAudio("click");
}

loadComidas()
{
  this.panelOpenState=false;
  this.formQuestion.reset();
 
   this.dbSvc.getVistaComidasbyidEvento( Number(this.eventoSelected),this.localUser.token , this.localUser.tokenjwt).subscribe(resp=>
    { this.listVistaComidasEvento=[...resp]; 
      this.formQuestion.patchValue({txtidOrder: this.listVistaComidasEvento.length+1 });
    });
this.playAudio("click");
}
 


loadCatalogos()
{
   this.dbSvc.getcatComidas(this.localUser.tokenjwt).subscribe(resp=>{this.listcatComidas=[...resp]; });
   
}

 


validarNumero(event:any):void
{ const pattern = /[0-9]/;
  let inputChar = String.fromCharCode(event.charCode);
  if (event.keyCode != 8 && !pattern.test(inputChar)) {event.preventDefault();}
}

setValidatorOpciones():void
{ var arg= this.formQuestion.get('selectTipo')?.value;
}

ObligaOpciones(arg:number):boolean
{
  var resultado:boolean=false;
   if(!this.formQuestion.get('txtFecha')?.value){ resultado=true;}
  return resultado;
}



cambiarPagina(evento:PageEvent)
{
  //console.log("evento", evento);
  this.desde=evento.pageIndex*evento.pageSize;
  this.hasta=this.desde+evento.pageSize;
}




//ADN aquí debo setear los datos elegidos!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
editItem(item:VistaComidaEvento):void
{
  // console.log("valor del item elegido",item);
  
  this.itemToEdit=item;
  this.valSelect=item.idComida;
  this.formQuestion.patchValue({ selectTipo:this.valSelect});
  this.formQuestion.patchValue({txtFecha: item.fecha});
  //this.formQuestion.get('chkisRequired')?.setValue(item.isRequired==1?true:false);
  this.panelOpenState=true;
  setTimeout(() => {this.txtFechaRef.nativeElement.focus() ; }, 250);  
  this.playAudio("click");
}

cleanForm():void{
  this.formQuestion.reset(); 
  this.itemToEdit={ idComida_Evento:0,fecha:null, idComida:0,descripcionComida:'', idEvento:0,  nombreEvento:'',  macroEvento:''};
}

saveItem()
{
  //console.log("valor del agrupador:",this.intCriterio);
  
 
  this.itemToEdit.idEvento= this.eventoSelected;
  
  this.itemToEdit.idComida=this.formQuestion.get('selectTipo')?.value;
  this.itemToEdit.fecha=this.formQuestion.get('txtFecha')?.value;
  
 // console.log("valor del item recolectado:",this.itemToEdit);

  
   this.dbSvc.PostcatComidaEvento(this.itemToEdit, this.localUser.token, this.localUser.tokenjwt).subscribe(data=>
    { 
        this.toastr.success("Alimento Almacenado","El Alimento fue guardado correctamente al Evento" ) ;
        this.formQuestion.reset();
        this.loadComidas();
        this.playAudio("ok");
    });   

}

 
 
iniciaForm():FormGroup
{
  return this.frmBuilder.group({
                        txtFecha:['',[ Validators.required, Validators.min(10) ]   ] ,
                        selectTipo:['',[Validators.required ]]
                      });
}


exportexcel(): void
{
  /* pass here the table id */
  let element = document.getElementById('tblComidasEvento');
  const ws: XLSX.WorkSheet =XLSX.utils.table_to_sheet(element);

  //hide last column
  ws['!cols'] = [];
  ws['!cols'][4] = { hidden: true };/* here 6 is your column number (n-1) */

  /* generate workbook and add the worksheet */
  const wb: XLSX.WorkBook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, this.excelTitle );

  /* save to file */  
  XLSX.writeFile(wb, this.excelfileName);
}


formatoFecha(fecha:Date):string
{
  var dateObject = new Date(fecha);
 
  // Example with a specific locale (e.g., US format mm/dd/yyyy)
  var specificLocaleDateString = dateObject.toLocaleDateString('es-MX');
  return specificLocaleDateString;
}


  playAudio(sonido:string){
    reproducir(sonido);
  }


consultarLogStatus():void
{
  this.sharedSvc.currentStatu$.subscribe(respuesta=>
    { 
      this.localUser=respuesta;
    });
 
    this.sharedSvc.currentCatalogosPermisos$.subscribe(respuesta=>
    { 
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
      else
        {
           
        this.dbSvc.getcatMacroEventosAlimentos(this.localUser.tokenjwt).subscribe(resp=>{this.listMacroEventos=[...resp]; });
      
        }
    });
  
}


}

