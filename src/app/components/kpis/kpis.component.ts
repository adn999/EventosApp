import { sentir } from 'src/app/services/haptica';
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Chart, ChartType } from 'chart.js/auto';
import { ToastrService } from 'ngx-toastr';
import { reporteRegistrosColorDBModel } from 'src/app/models/reporteRegistrosColorDBModel';
import { reporteRegistrosDBModel } from 'src/app/models/reporteRegistrosDBModel';
import { reporteDocuSealDBModel } from 'src/app/models/reporteDocuSealDBModel';
import { VistaLoginModel } from 'src/app/models/VistaLoginModel';
import { DbservicesService } from 'src/app/services/dbservices.service';
import { ShareDataService } from 'src/app/services/shared-data.service';
import Swal from 'sweetalert2';
import { state, style, transition, trigger, useAnimation } from '@angular/animations';
import { transitionCollapse, transitionCollapseFast, transitionEntrada, transitionSalida } from '../animation';
import { reporteRankingStaffRegistroDBModel } from 'src/app/models/reporteRankingStaffRegistroDBModel';
import { reporteRankingStaffKitDBModel } from 'src/app/models/reporteRankingStaffKitDBModel';
import { NotificacionesService } from 'src/app/services/notificaciones.service';
import { reporteDiaDBModel } from 'src/app/models/reporteDiaDBModel';
import { reporteConteoComidasDBModel } from 'src/app/models/reporteConteoComidasDBModel';
import { reporteRankingStaffAlimentosDBModel } from 'src/app/models/reporteRankingStaffAlimentosDBModel';


@Component({
  selector: 'app-kpis',
  templateUrl: './kpis.component.html',
  styleUrls: ['./kpis.component.css'],
  animations:[trigger('mostrarTrigger', [state('hidden', style({ opacity: 0  })),
    transition('hidden => shown', [ useAnimation(transitionEntrada) ]),  ]),
trigger('mostrarTriggerLeft', [ transition('hidden => shown', [ useAnimation(transitionSalida) ]),  ]),
trigger('mostrarTriggerCollapse', [state('hidden', style({ opacity: 0  })),
    transition('hidden => shown', [ useAnimation(transitionCollapse) ]) ]),
trigger('triggResult', [ transition('false => true', [ useAnimation(transitionCollapseFast) ]) ]),
]
})
export class KpisComponent implements OnInit {

  
  canvasPorcen  : any;
  ctxPorcen    : any;

  canvasAvance : any;
  ctxAvance   : any;

  canvasAvanceKits : any;
  ctxAvanceKits   : any;

  canvasColores : any;
  ctxColores   : any;

  canvasDocuSeal:any;
  ctxDocuSeal:any;

  canvasSinCelular:any;
  ctxSinCelular:any;
  private chartSinCelularInstance?:Chart<any>;

  canvasDia:any;
  ctxDia:any;

  canvas3 : any;
  ctx3   : any;

  //── instancias de charts que se repintan (evita "Canvas is already in use" al recrearlos) ──
  private chartAvanceInstance?:Chart<any>;
  private chartAvanceKitsInstance?:Chart<any>;
  private chartColoresInstance?:Chart<any>;
  private chartDocuSealInstance?:Chart<any>;
  private chartDiaInstance?:Chart<any>;
  private chartRankingInstances = new Map<string, Chart<any>>();

 
  macroEvento:string='';
  localUser!:VistaLoginModel;
  localUsercargo:string='';

  arrDataPorcen: number[] = [];  
  arrLabelPorcen: string[] = [];

  arrDataColor: number[] = [];  
  arrLabelColor: string[] = [];
  arrColor: string[] = [];

   colores = [
  "#569cafff", "#FF7F00", "#FFFF00", "#7FFF00", "#00FF00", "#00FF7F", "#00FFFF",
  "#007FFF", "#0000FF", "#7F00FF", "#FF00FF", "#FF007F", "#895e9fff", "#181874ff",
  "#2f7283ff", "#2b6764ff", "#227041ff", "#7d7f26ff", "#dcb370ff", "#b07716ff", "#c44f19ff",
  "#5e2653ff", "#6d4489ff", "#c761e3ff", "#F0E68C", "#ADFF2F", "#98FB98", "#90EE90",
  "#32CD32", "#2E8B57", "#008080", "#00FFFF", "#48D1CC", "#ADD8E6", "#87CEEB",
  "#6495ED", "#4169E1", "#0000CD", "#8A2BE2", "#9400D3", "#9932CC", "#BA55D3",
  "#DB7093", "#C71585", "#FF69B4", "#FF1493", "#DA70D6", "#DDA0DD"
];

  arrData: number[] = [];  
  arrLabel: string[] = [];


  reporteConteoComida:reporteConteoComidasDBModel={macroEvento:'',comidas:0, comidasEntregadas:0};

  // Valores animados para los contadores KPI
  displayRegistros       = 0;
  displayAsistencia      = 0;
  displayIncluyeKit      = 0;
  displayEntregaKit      = 0;
  displayComidas         = 0;
  displayComidasEntregadas = 0;
  conteoAsistencia=0;

  reporteRegistro:reporteRegistrosDBModel={macroEvento:'',totalAsistencia:0,totalEntregaKit:0,totalIncluyeKit:0,totalRegistros:0,totalReposiciones:0,
                                           porcenAsistencia:0, porcenEntregaKit:0, porcenReposiciones:0};
  
  reporteDocuSeal:reporteDocuSealDBModel={macroEvento:'',totalSinSobre:0,totalSinFirma:0,totalFirmado:0,porcenSinSobre:0,porcenSinFirma:0,porcenFirmado:0};

  //── Menores con sobre y sin celular del tutor ────────────────────────
  totalMenoresSinCelular:number=-1;
  private docuSealCargado=false;
  private sinCelularCargado=false;
  private notificarAlCargar=false; //refresh() pide una notificación con los KPIs cuando lleguen registros y comidas
  private registrosCargado=false;
  private comidasCargado=false;
  private diaCargado=false; //getReporteDia ahora corre en paralelo con getReporteRegistros, ya no hay orden garantizado entre ambos
  private coloresCargado=false; //getReporteColores también corre en paralelo; sin este flag el chart de Colores podía dibujarse vacío

  reporteTarjetas:number=0;
  reporteColores:reporteRegistrosColorDBModel[]=[];
  reporteRankingStaffRegistro:reporteRankingStaffRegistroDBModel[]=[];
  reporteRankingStaffKit:reporteRankingStaffKitDBModel[]=[];
  reporteRankingStaffAlimentos:reporteRankingStaffAlimentosDBModel[]=[];

  reporteDia:reporteDiaDBModel[]=[];
  arrLabelDia: string[] = [];
  arrDataDia: number[] = [];
  arrColorDia:string[]=[];

  nombreEvento:string='';
  estado='hidden';
  generandoPdf=false;

  constructor (private readonly dbSvc:DbservicesService,
               private readonly sharedSvc:ShareDataService,
               private readonly toastr:ToastrService,    
               private readonly router: Router,
               private readonly notifSvc:NotificacionesService,
     ){ }


//para que cambie el estado de la variable inicial para animación
ngAfterViewInit(){ setTimeout( () => { this.estado = 'shown';}, 200);}


  ngOnInit(): void
  {
  this.consultarLogStatus();
  this.cargarDatos();

  this.loadReporteDocuSeal();
  this.loadReporteSinCelular();
  }


  loadReporteDocuSeal():void
  {
      this.dbSvc.getReporteDocuSeal(this.macroEvento, this.localUser.token, this.localUser.tokenjwt).subscribe(respD=>
            {
              this.reporteDocuSeal=respD;
              this.docuSealCargado=true;

              //DocuSeal ahora corre en paralelo con Registros/Día/Colores: ya no se puede asumir que
              //conteoAsistencia siga en 0 al llegar aquí. Se llama siempre para no dejar sin dibujar el
              //chart de DocuSeal (las secciones que sí dependen de conteoAsistencia>0 se protegen dentro
              //de creaGraficas(), y se vuelven a redibujar correctamente cuando Día/Colores completen).
              this.creaGraficas();
              this.creaGraficaSinCelular();
            });
  }


  loadReporteSinCelular():void
  {
      this.dbSvc.getReporteGetMinorsWithInvalidPhoneDetails(this.macroEvento, this.localUser.token, this.localUser.tokenjwt).subscribe(resp=>
            {
              //cuando no hay registros, el backend regresa 204 sin cuerpo y HttpClient entrega null en vez de []
              this.totalMenoresSinCelular=resp?.length ?? 0;
              this.sinCelularCargado=true;

              this.creaGraficaSinCelular();
            });
  }


  cargarDatos():void
  {
    //── reseteo defensivo: si cargarDatos() se vuelve a llamar (refresh, cambio de macroevento) sin
    //   recrear el componente, evita que estos arreglos sigan creciendo con datos duplicados ──
    this.diaCargado=false;
    this.registrosCargado=false;
    this.comidasCargado=false;
    this.coloresCargado=false;
    this.arrLabelDia.length=0;   this.arrDataDia.length=0;   this.arrColorDia.length=0;
    this.arrLabelColor.length=0; this.arrDataColor.length=0; this.arrColor.length=0;

    //── las siguientes 6 consultas no dependen de getReporteRegistros (sólo de macroEvento/token,
    //   que ya se conocen), así que ya no se anidan esperando su respuesta: arrancan todas en paralelo ──
    this.dbSvc.getReporteRegistros(this.macroEvento, this.localUser.token, this.localUser.tokenjwt).subscribe(resp=>
    {
        this.conteoAsistencia=resp.totalAsistencia;

        this.reporteRegistro=resp;
        this.arrLabelPorcen=["Asistencia", "Entrega Kit"];
        this.arrDataPorcen=[resp.porcenAsistencia,resp.porcenEntregaKit];

        this.animateValue(resp.totalRegistros,  500, v => this.displayRegistros       = v);
        this.animateValue(resp.totalAsistencia, 500, v => this.displayAsistencia      = v);
        this.animateValue(resp.totalIncluyeKit, 500, v => this.displayIncluyeKit      = v);
        this.animateValue(resp.totalEntregaKit, 500, v => this.displayEntregaKit      = v);

        //dispara creaGraficas() sólo si Día y Colores (que corren en paralelo) ya llegaron también
        this.intentaCrearGraficasPrincipales();
        this.registrosCargado=true;
        this.intentaNotificar();
    });

    this.dbSvc.getReporteConteoComida(this.macroEvento, this.localUser.tokenjwt).subscribe(respCom=>
    {
      this.reporteConteoComida=respCom;
      this.animateValue(respCom.comidas,            500, v => this.displayComidas            = v);
      this.animateValue(respCom.comidasEntregadas,  500, v => this.displayComidasEntregadas  = v);
      this.comidasCargado=true;
      this.intentaNotificar();
    });

    this.dbSvc.getReporteRankingStaffEvento(this.macroEvento, this.localUser.token, this.localUser.tokenjwt).subscribe(resp=>
      {
        this.reporteRankingStaffRegistro=[...resp];
        this.creaGraficaRanking('chartRankingRegistro',
          resp.map(i=>i.nombre), resp.map(i=>i.conteo),
          'Registro', 'rgba(90,26,150,0.72)');
      });

      this.dbSvc.getReporteRankingStaffKit(this.macroEvento, this.localUser.token, this.localUser.tokenjwt).subscribe(resp=>
      {
        this.reporteRankingStaffKit=[...resp];
        this.creaGraficaRanking('chartRankingKit',
          resp.map(i=>i.nombre), resp.map(i=>i.conteo),
          'Kits', 'rgba(46,125,50,0.72)');
      });

      this.dbSvc.getReporteRankingStaffComidas(this.macroEvento, this.localUser.token, this.localUser.tokenjwt).subscribe(resp=>
      {
        this.reporteRankingStaffAlimentos=[...resp];
        this.creaGraficaRanking('chartRankingAlimentos',resp.map(i=>i.nombre), resp.map(i=>i.conteo),
          'Alimentos', 'rgba(234,88,12,0.72)');
      });

      this.dbSvc.getReporteDia(this.macroEvento, this.localUser.token, this.localUser.tokenjwt).subscribe(resp=>
        {
          this.reporteDia=[...resp];
            for(let i=0; i<this.reporteDia.length;i++)
              {
                this.arrLabelDia.push(this.reporteDia[i].dia.slice(0,3)+':'+ this.reporteDia[i].diaHora);
                this.arrDataDia.push(this.reporteDia[i].total);
                this.arrColorDia.push(this.colores[i]);
              }
            this.diaCargado=true;
            this.intentaCrearGraficasPrincipales();
        });

     this.dbSvc.getReporteColores(this.macroEvento, this.localUser.token, this.localUser.tokenjwt).subscribe(respC=>
      {
        this.reporteColores=[...respC];
        for(let i=0; i<this.reporteColores.length;i++)
          {
            this.arrLabelColor.push(this.reporteColores[i].descripcion);
            this.arrDataColor.push(this.reporteColores[i].conteo);
            this.arrColor.push(this.reporteColores[i].color);
           // console.log("color:"+this.reporteColores[i].color);
          }

        this.coloresCargado=true;
        this.intentaCrearGraficasPrincipales();
      });
  }

  //── se llama desde Registros, Día y Colores (corren en paralelo, orden de llegada no garantizado);
  //   sólo dibuja cuando los 3 ya están disponibles, evitando que Colores/Día se dibujen vacíos ──
  private intentaCrearGraficasPrincipales():void
  {
    if(this.conteoAsistencia>0 && this.diaCargado && this.coloresCargado)
    {
      this.creaGraficas();
    }
  }

  creaGraficas():void
  {


/*     this.canvasPorcen = document.getElementById('chartPorcen');
    this.ctxPorcen = this.canvasPorcen.getContext('2d');
     
     let myChartPorcen = new Chart(this.ctxPorcen, {
      type: 'bar',
      data: {
          labels:this.arrLabelPorcen,
          datasets: [{label:"Avance",  data: this.arrDataPorcen,borderWidth:2, 
          backgroundColor: ['rgba(255, 99, 132,  0.8)','rgba(54, 162, 235,  0.6)']   }]
      },
      options: { 
                responsive: false,
                animation:{duration:1200},
                plugins:{ title:{display:true,text:'% Avance'}, }
               }
    }); */

 if(this.conteoAsistencia>0)
  {
    this.canvasAvance = document.getElementById('chartAvance');
    this.ctxAvance = this.canvasAvance.getContext('2d');
    if(this.chartAvanceInstance) { this.chartAvanceInstance.destroy(); }
    this.chartAvanceInstance = new Chart(this.ctxAvance, {
      type: 'pie',
      data: {
          labels: ["Asistentes", "Faltanes" ],
          datasets: [{data: [this.reporteRegistro.totalAsistencia,
                                                       (this.reporteRegistro.totalRegistros-this.reporteRegistro.totalAsistencia )],
              backgroundColor: ['rgba(54, 162, 235, 0.8)','rgba(255, 206, 86, 0.6)'],borderWidth: 1
          }]
      },
      options: {responsive: true, maintainAspectRatio: true, aspectRatio: 1, animation:{duration:1200}, plugins:{title:{display:true,text:'Asistencia'} }   }
    });
  


    this.canvasAvanceKits = document.getElementById('chartAvanceKits');
    this.ctxAvanceKits = this.canvasAvanceKits.getContext('2d');
    if(this.chartAvanceKitsInstance) { this.chartAvanceKitsInstance.destroy(); }
    this.chartAvanceKitsInstance = new Chart(this.ctxAvanceKits, {
      type: 'pie',
      data: {
          labels: ["Entregados", "Pendientes" ],
          datasets: [{data: [this.reporteRegistro.totalEntregaKit,
                                                       (this.reporteRegistro.totalIncluyeKit-this.reporteRegistro.totalEntregaKit )],
              backgroundColor: ['rgba(54, 132, 115, 0.8)','rgba(255, 106, 56, 0.6)'],borderWidth: 1
          }]
      },
      options: {responsive: true, maintainAspectRatio: true, aspectRatio: 1, animation:{duration:1200}, plugins:{title:{display:true,text:'Kits'} }   }
    });
  
    this.canvasColores = document.getElementById('chartColores');
    this.ctxColores = this.canvasColores.getContext('2d');
    if(this.chartColoresInstance) { this.chartColoresInstance.destroy(); }
    this.chartColoresInstance = new Chart(this.ctxColores, {
      type: 'bar',
      data: {
          labels:this.arrLabelColor,
          datasets: [{   label: 'Colores', data: this.arrDataColor,borderWidth:2, 
          backgroundColor: this.arrColor   // ['rgba(255, 99, 132,  0.8)','rgba(54, 162, 235,  0.6)'] 
            }]
      },
      options: { responsive: true, animation:{duration:1200}, plugins:{title:{display:true,text:'Avance por Colores'} } }
    });

  }//fin de if conteoAsistencia>0

    this.canvasDocuSeal = document.getElementById('chartDocuSeal');
    this.ctxDocuSeal = this.canvasDocuSeal.getContext('2d');
    if(this.chartDocuSealInstance) { this.chartDocuSealInstance.destroy(); }
    this.chartDocuSealInstance = new Chart(this.ctxDocuSeal, {
      type: 'pie',
      data: {
          labels: ["SinSobre", "SinFirma", "Firmados" ],
          datasets: [{data: [this.reporteDocuSeal.totalSinSobre,this.reporteDocuSeal.totalSinFirma, this.reporteDocuSeal.totalFirmado  ],
                    backgroundColor: ['rgba(54, 162, 235, 0.8)','rgba(255, 206, 86, 0.6)','rgba(59, 179, 113, 0.6)'],borderWidth: 1
          }]
      },
      options: {responsive: true, maintainAspectRatio: true, aspectRatio: 1, animation:{duration:1200}, plugins:{title:{display:true,text:'DocuSeal'} }   }
    });


 //this.arrLabel=['Ene','Feb', 'Mar','Abr','May','Jun','Jul'];   this.arrData=[12,24,34,45,67,78,89];
if(this.conteoAsistencia>0)
  {

    const data={labels:this.arrLabelDia,
                datasets:[{label:'por Día', data:this.arrDataDia, backgroundColor:this.arrColorDia , fill:false, bordercolor:'rgb(75,192,192)',tension:0.1}]
    };
  this.canvasDia = document.getElementById('chartDia');
  this.ctxDia = this.canvasDia.getContext('2d');

      if(this.chartDiaInstance) { this.chartDiaInstance.destroy(); }
      this.chartDiaInstance = new Chart(this.ctxDia, {
        type: 'line',
        data:data,
        options: { responsive: true, animation:{duration:1500} }
      });

    }

/*     tipo lineal

  this.arrLabel=['Ene','Feb', 'Mar','Abr','May','Jun','Jul'];   this.arrData=[12,24,34,45,67,78,89];

    const data={labels:this.arrLabel,
                datasets:[{label:'mi dataset', data:this.arrData, fill:false, bordercolor:'rgb(75,192,192)',tension:0.1}]
    };
this.canvas2 = document.getElementById('myChart2');
      this.ctx2 = this.canvas2.getContext('2d');
  
      let myChart2 = new Chart(this.ctx2, {
        type: 'line',
        data:data,
        options: {responsive: false, animation:{duration:1200} }
      
      }); */
  
 

  }

  
  animateValue(end: number, duration: number, setter: (v: number) => void): void {
    const startTime = performance.now();
    const step = (now: number) => {
      const progress = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // easeOutCubic
      setter(Math.round(end * eased));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  creaGraficaSinCelular():void
  {
    //necesitamos ambos reportes cargados: DocuSeal (para el total sin firmar) y el conteo de menores sin celular de tutor
    if(!this.docuSealCargado || !this.sinCelularCargado) { return; }

    this.canvasSinCelular = document.getElementById('chartSinCelular');
    if(!this.canvasSinCelular) { return; } //la vista pudo haberse destruido (navegación) antes de que llegara la respuesta

    if(this.chartSinCelularInstance) { this.chartSinCelularInstance.destroy(); } //evita "Canvas is already in use" en refrescos

    this.ctxSinCelular = this.canvasSinCelular.getContext('2d');
    this.chartSinCelularInstance = new Chart(this.ctxSinCelular, {
      type:'bar',
      data: {
          labels: ["Con Sobre y Sin Celular de Tutor", "Inscritos sin Firmar" ],
          datasets: [{label:'Celular', data: [this.totalMenoresSinCelular, this.reporteDocuSeal.totalSinFirma],
                    backgroundColor: ['rgba(220, 53, 69, 0.75)','rgba(255, 206, 86, 0.6)'],borderWidth: 1
          }]
      },
      options: {responsive: true, maintainAspectRatio: true, aspectRatio: 1, animation:{duration:1200}, plugins:{title:{display:true,text:'Sin Celular y Sin Firmar'} }   }
    });
  }


  maxConteo(arr: any[]): number {
    return arr.length ? Math.max(...arr.map(i => Number(i.conteo))) : -1;
  }

  creaGraficaRanking(canvasId:string, labels:string[], data:number[], titulo:string, color:string, intentosRestantes:number=10):void {
    const canvas = document.getElementById(canvasId) as HTMLCanvasElement;
    if (!canvas)
    {
      //el canvas vive dentro de *ngIf="conteoAsistencia>0"; si esta respuesta llegó antes que la de
      //Registros (corren en paralelo), Angular todavía no lo agrega al DOM en este mismo ciclo.
      //en vez de perder el dibujo para siempre, se reintenta unas cuantas veces con un pequeño delay
      if(intentosRestantes>0)
      {
        setTimeout(()=> this.creaGraficaRanking(canvasId, labels, data, titulo, color, intentosRestantes-1), 150);
      }
      return;
    }

    const previa = this.chartRankingInstances.get(canvasId);
    if (previa) { previa.destroy(); }

    const chart = new Chart(canvas.getContext('2d')!, {
      type: 'bar',
      data: {
        labels,
        datasets: [{ label: titulo, data, backgroundColor: color, borderWidth: 1 }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 900 },
        plugins: { legend: { display: false } },
        scales: { x: { beginAtZero: true, ticks: { precision: 0 } } }
      }
    });

    this.chartRankingInstances.set(canvasId, chart);
  }

  playAudio(sonido:string){
    sentir(sonido);
  }



  consultarLogStatus():void
  {
    //consultamos el id de la persona que se logeó para los registro de Asistentes
    this.sharedSvc.currentStatu$.subscribe(respuesta=>{this.localUser=respuesta;   });
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
          this.localUsercargo=  respuesta.cargos;
          //sólo el cargo  "ADMINISTRADOR SISAS" puede ver el botón para enviar sobres masivamente
       
         
        });
  }


  /** Tras Recargar, cuando ya llegaron registros y comidas, manda los KPIs como notificación (se ve también en el reloj). */
  private intentaNotificar(): void {
    if(!this.notificarAlCargar || !this.registrosCargado || !this.comidasCargado) return;
    this.notificarAlCargar=false;
    const r=this.reporteRegistro, c=this.reporteConteoComida;
    this.notifSvc.publicarKpis(this.macroEvento, { asistencia:r.totalAsistencia, registros:r.totalRegistros,
      kitEntregados:r.totalEntregaKit, kitIncluye:r.totalIncluyeKit, comidasEntregadas:c.comidasEntregadas }, true);
  }

  refresh(): void {
    this.notificarAlCargar=true;
    this.cargarDatos();
    this.playAudio("ok");

    this.loadReporteDocuSeal();
    this.loadReporteSinCelular();
}

  //── Captura el contenido de la página (tarjetas, gráficas y rankings) y lo convierte en PDF ──
  async exportarPDF(): Promise<void>
  {
    const elemento = document.getElementById('kpisCapture');
    if(!elemento)
    {
      this.toastr.error('No se encontró el contenido a exportar', 'Error');
      return;
    }

    this.generandoPdf=true;

    try
    {
      //carga diferida: html2canvas y jsPDF pesan ~700kb, sólo se descargan al usar esta función
      //en vez de engordar el bundle inicial que se carga con toda la app
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
        import('html2canvas'),
        import('jspdf')
      ]);

      const canvas = await html2canvas(elemento, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff'
      });

      const imgData = canvas.toDataURL('image/png');

      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth  = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth  = pdfWidth;
      const imgHeight = canvas.height * imgWidth / canvas.width;

      let heightLeft = imgHeight;
      let position   = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pdfHeight;

      while(heightLeft > 0)
      {
        position = heightLeft - imgHeight; // desplaza la imagen hacia arriba para mostrar el siguiente pedazo
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pdfHeight;
      }

      const blobPdf = pdf.output('blob');
      this.dbSvc.postReporteKpisPdf(this.macroEvento, this.localUser.token, this.localUser.tokenjwt, blobPdf).subscribe({
        next: ()=> this.toastr.success('PDF enviado correctamente', 'Éxito'),
        error: ()=> this.toastr.error('No se pudo enviar el PDF al servidor', 'Error')
      });
    }
    catch(err)
    {
      console.error(err);
      this.toastr.error('Ocurrió un error al generar el PDF', 'Error');
    }
    finally
    {
      this.generandoPdf=false;
    }
  }

}
