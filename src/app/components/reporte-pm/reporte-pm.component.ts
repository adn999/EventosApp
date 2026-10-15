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
import { protectMemDBModel } from 'src/app/models/protectMemDBModel';

@Component({
  selector: 'app-reporte-pm',
  templateUrl: './reporte-pm.component.html',
  styleUrls: ['./reporte-pm.component.css']
})
export class ReportePMComponent implements OnInit {

listMacroEventos:string[]=[];   
listRegistros:protectMemDBModel[]=[];

localUser!:VistaLoginModel;
macroEvento:string='';

panelOpenState = false;//el estatus del acordeón
strCriterio:string='';
pageSize=10; desde=0; hasta=10;

excelTitle='Registros';
excelfileName='';

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
    this.loadMacroEventos(); 
  }



 loadMacroEventos():void
 {
  this.dbSvc.getcatMacroEventos(this.localUser.tokenjwt).subscribe(resp=>{this.listMacroEventos=[...resp]; });
 }


 loadRegistros():void
 {
   this.panelOpenState=false;
  
   this.dbSvc.getProtectMemReporte(this.strCriterio, this.localUser.token,this.localUser.tokenjwt).subscribe(resp=>
   { this.listRegistros=[...resp];  });
 }


 cambiarPagina(evento:PageEvent)
 {
   //console.log("evento", evento);
   this.desde=evento.pageIndex*evento.pageSize;
   this.hasta=this.desde+evento.pageSize;
 }


 exportexcel(): void
{
  /* pass here the table id */
  let element = document.getElementById('tblRegistros');
  const ws: XLSX.WorkSheet =XLSX.utils.table_to_sheet(element);

  //hide last column
  ws['!cols'] = [];
  ws['!cols'][5] = { hidden: true };/* here 6 is your column number (n-1) */

  /* generate workbook and add the worksheet */
  
  const wb: XLSX.WorkBook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, this.excelTitle+" "+this.strCriterio );

  /* save to file */  
  this.excelfileName="Registros "+this.strCriterio+".xlsx";
  XLSX.writeFile(wb, this.excelfileName);
}


  playAudio(sonido:string){
    reproducir(sonido);
  }


  consultarLogStatus():void
  { //consultamos el id de la persona que se logeó para los registro de Asistentes
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
          else//si sí eligió un macroevento
          {
            this.sharedSvc.currentEventoPermisos$.subscribe(respuesta=>
              { 
                if(!respuesta.protectMem)
                {
                  Swal.fire({
                    title: "No tienes permiso para el reporte de Protección a la Membresía para este Evento :(", text:"Debes contactar al Administrador del Evento",
                    icon:"info",iconColor:'purple',color: '#purple',
                    background:'rgba(255, 255, 255, 0.87)',backdrop: `rgba(0,0,123,0.4)`,
                    showDenyButton: false,confirmButtonText: 'Enterado',confirmButtonColor:'#CD6155'
                  }).then((result) => {if (result.isConfirmed) { this.router.navigate(['home' ] );} });
                }
              });
  
          }
    });
   
  
  }


}
