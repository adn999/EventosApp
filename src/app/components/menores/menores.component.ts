import { reproducir } from 'src/app/services/haptica';
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { VistaLoginModel } from 'src/app/models/VistaLoginModel';
import { reporteMenoresFallaDBModel } from 'src/app/models/reporteMenoresFallaDBModel';
import { DbservicesService } from 'src/app/services/dbservices.service';
import { ShareDataService } from 'src/app/services/shared-data.service';
import Swal from 'sweetalert2';
import { PageEvent } from '@angular/material/paginator';
import * as XLSX from 'xlsx';

@Component({
  selector: 'app-menores',
  templateUrl: './menores.component.html',
  styleUrls: ['./menores.component.css']
})
export class MenoresComponent implements OnInit {

  macroEvento:string='';
  localUser!:VistaLoginModel;
  localUsercargo:string='';

  //puede ver el botón de "Enviar Sobres" y las tablas con datos de tutores (correo/celular)
  get puedeGestionarMenores():boolean
  {
    return this.localUsercargo=='ADMINISTRADOR SISAS' || this.localUsercargo=='DIRECTOR NAL DE INOVACION TECNOLOGICA Y SERVICIOS';
  }

  //── Menores sin sobre de Aprobación asignado ─────────────────────────
  contadorUnnotifiedMinors:number=-1;
  panelOpenState=false;//el estatus del acordeón
  pageSize=500; desde=0; hasta=1000;
  excelTitle='Registros';
  excelfileName='';
  reporteMenores:reporteMenoresFallaDBModel[]=[];

  //── Menores con Teléfono de Tutor Inválido ───────────────────────────
  contadorInvalidPhone:number=-1;
  panelOpenStateTelefono=false;
  pageSizeTelefono=500; desdeTelefono=0; hastaTelefono=1000;
  excelfileNameTelefono='';
  reporteMenoresTelefono:reporteMenoresFallaDBModel[]=[];

  constructor(private readonly dbSvc:DbservicesService,
              private readonly sharedSvc:ShareDataService,
              private readonly router:Router,
    ){ }

  ngOnInit(): void
  {
    this.consultarLogStatus();

    this.loadRegistrosMenores();
    this.loadRegistrosTelefonoInvalido();
  }

  consultarLogStatus():void
  {
    this.sharedSvc.currentStatu$.subscribe(respuesta=>{this.localUser=respuesta; });
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
    });

   
     this.sharedSvc.currentCatalogosPermisos$.subscribe(respuesta=>
        {
          //se guarda el cargo: puedeGestionarMenores lo usa para mostrar las tablas y el botón de enviar sobres
          this.localUsercargo=respuesta.cargos;
          if(respuesta.cargos!="ADMINISTRADOR SISAS" && respuesta.cargos!='DIRECTOR NAL DE INOVACION TECNOLOGICA Y SERVICIOS')
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

  //── Menores sin sobre de Aprobación asignado ─────────────────────────
  loadRegistrosMenores():void
  {
    this.panelOpenState=true;

    this.dbSvc.getReporteGetUnnotifiedMinorsDetails(this.macroEvento, this.localUser.token, this.localUser.tokenjwt).subscribe(resp=>
    { //cuando no hay registros, el backend regresa 204 sin cuerpo y HttpClient entrega null en vez de []
      this.reporteMenores=[...(resp ?? [])];
      this.contadorUnnotifiedMinors=this.reporteMenores.length;
    });
  }

  sendEnvelopes(): void {
    Swal.fire({
      title: 'Analizando y enviando sobres...',
      html: `<div style="display:flex;justify-content:center;margin:14px 0 4px"><span class="lg-spinner lg-spinner--lg"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></span></div>
             <p style="margin-top:8px;color:#555;font-size:0.88rem">No desesperes, puede tardar unos momentos</p>`,
      allowOutsideClick: false,
      showConfirmButton: false,
      background: 'rgba(255,255,255,0.92)',
      backdrop: 'rgba(0,0,123,0.4)',
    });

    this.dbSvc.postDocuSealSendUnnotifiedMinors(this.macroEvento, this.localUser.token, this.localUser.tokenjwt).subscribe({
      next: (resp) => {
        Swal.fire('Aviso', resp, 'info');
        this.playAudio('info');
        this.loadRegistrosMenores();
      },
      error: () => {
        Swal.fire('Error', 'Ocurrió un error al enviar los sobres.', 'error');
        this.playAudio('error');
      }
    });
  }

  cambiarPagina(evento:PageEvent)
  { this.desde=evento.pageIndex*evento.pageSize;
    this.hasta=this.desde+evento.pageSize;
  }

  //── Menores con Teléfono de Tutor Inválido ───────────────────────────
  loadRegistrosTelefonoInvalido():void
  {
    this.panelOpenStateTelefono=true;

    this.dbSvc.getReporteGetMinorsWithInvalidPhoneDetails(this.macroEvento, this.localUser.token, this.localUser.tokenjwt).subscribe(resp=>
    { //cuando no hay registros, el backend regresa 204 sin cuerpo y HttpClient entrega null en vez de []
      this.reporteMenoresTelefono=[...(resp ?? [])];
      this.contadorInvalidPhone=this.reporteMenoresTelefono.length;
    });
  }

  cambiarPaginaTelefono(evento:PageEvent)
  { this.desdeTelefono=evento.pageIndex*evento.pageSize;
    this.hastaTelefono=this.desdeTelefono+evento.pageSize;
  }

  //── utilidades comunes ────────────────────────────────────────────────
  exportexcel(tableId:string, excelFileTitle:string): void
  {  /* pass here the table id */
    let element = document.getElementById(tableId);
    const ws: XLSX.WorkSheet = XLSX.utils.table_to_sheet(element);

    //hide last column
    ws['!cols'] = [];
    ws['!cols'][5] = { hidden: true };/* here 6 is your column number (n-1) */
    /* generate workbook and add the worksheet */
    const wb: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, this.excelTitle+" "+this.macroEvento );
    /* save to file */
    const fileName=excelFileTitle+" "+this.macroEvento+".xlsx";
    XLSX.writeFile(wb, fileName);
    this.playAudio("click");
  }

  playAudio(sonido:string){
    reproducir(sonido);
  }

 

}
