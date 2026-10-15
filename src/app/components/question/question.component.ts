import { Component, Input, Output, OnInit, EventEmitter, ChangeDetectionStrategy, ViewChild, ElementRef, AfterContentInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { ObjectUnsubscribedError } from 'rxjs';
import { respuestaModel } from 'src/app/models/respuestaModel';
import { VistaLoginModel } from 'src/app/models/VistaLoginModel';
import { vwReactivoModel } from 'src/app/models/vwReactivoModel';
import { DbservicesService } from 'src/app/services/dbservices.service';
import { ShareDataService } from 'src/app/services/shared-data.service';

@Component({
  selector: 'app-question',
  templateUrl: './question.component.html',
  styleUrls: ['./question.component.css'],
  changeDetection:ChangeDetectionStrategy.OnPush  //para evitar overload de componentes
})

export class QuestionComponent implements OnInit, AfterContentInit {

localUser!:VistaLoginModel;

respuesta:respuestaModel={id:0, id_pregunta:0,  isRequired:0, tipoReactivo:0, cum:'', respuesta:'' } ;

arrChkList:string[]=[];
strChkList:string='';
//declaramos la variable que recolectará info
questionForm!:FormGroup;
@ViewChild('radioQuestion1', {static:false} )radioQuestion1!:ElementRef;
@ViewChild('radioQuestion2', {static:false} )radioQuestion2!:ElementRef;

@ViewChild('txtselectQuestion', {static:false} )txtselQuestRef!:ElementRef;
@ViewChild('txtchkListQuest', {static:false} )txtchkListQuest!:ElementRef;
@ViewChild('checkQuestion', {static:false} )checkQuestion!:ElementRef;

@Input() objReactivo!:vwReactivoModel;
@Input() cum!:string;
//devolvemos el objeto respuesta al componente que lo invocó
@Output() preguntaEvent=new EventEmitter<respuestaModel>();

  constructor(private readonly fb:FormBuilder,
              private readonly ar:ActivatedRoute,
              private readonly sharedDatosSvc:ShareDataService,
              private readonly dbSvc:DbservicesService
              ) {  }

  ngOnInit(): void 
  {
    this.sharedDatosSvc.currentStatu$.subscribe(respuesta=>{this.localUser=respuesta;});

    this.questionForm= this.iniciaForm();
    //validamos si el campo va a ser requerido o no
    if(this.objReactivo)
    { if(this.objReactivo.isRequired)
      { 
        this.questionForm.get('txtQuestion')?.setValidators(Validators.required);
        this.questionForm.get('radioQuestion')?.setValidators(Validators.required);
        this.questionForm.get('selectQuestion')?.setValidators(Validators.required);
        this.questionForm.get('checkQuestion')?.setValidators(Validators.required);
      }
    }
 
  }

  ngAfterContentInit(): void {
    this.CargarRespuesta();
  }

  CargarRespuesta():void
  {
     if(this.objReactivo.tipoReactivo==1 || this.objReactivo.tipoReactivo==2 ||
        this.objReactivo.tipoReactivo==3 || this.objReactivo.tipoReactivo==4 )
     {
       this.questionForm.patchValue({txtQuestion:this.objReactivo.respuesta});
     }
     

    if(this.objReactivo.tipoReactivo==5 )
    {
     if( this.obtieneValorIndex(0,this.objReactivo.textoOpciones)== this.objReactivo.respuesta )
      setTimeout(() => {   this.radioQuestion1.nativeElement.checked=true ; }, 500);
      if( this.obtieneValorIndex(1,this.objReactivo.textoOpciones)== this.objReactivo.respuesta )
      setTimeout(() => {   this.radioQuestion2.nativeElement.checked=true ; }, 500);
    }
 
     if(this.objReactivo.tipoReactivo==6 && this.obtieneValorIndex(0,this.objReactivo.respuesta)=='Otro' )
    {
      this.questionForm.patchValue({txtselectQuestion: this.obtieneValorIndex( 1,this.objReactivo.respuesta )  });
    }


      //this.questionForm.get('selectQuestion')?.setValue("Seleccione...");
    if(this.objReactivo.tipoReactivo==7 && this.objReactivo.respuesta=='true')
    {setTimeout(() => {    this.checkQuestion.nativeElement.checked=true ;    }, 500);}

    if(this.objReactivo.tipoReactivo==8 && this.objReactivo.respuesta.includes('Otro:')   )
    {
      this.questionForm.patchValue({txtchkListQuestion: this.objReactivo.respuesta.split(':')[1].split('_')[0]    });
    }

    if(this.objReactivo.tipoReactivo==9 )
    { this.questionForm.patchValue({txtCelQuestion:this.objReactivo.respuesta});}

    if(this.objReactivo.tipoReactivo==10)
    { this.questionForm.patchValue({txtMailQuestion:this.objReactivo.respuesta});}

    if(this.objReactivo.tipoReactivo==11 )
   {
     this.questionForm.patchValue({txtQuestionCUM:this.objReactivo.respuesta});
   }
  }

  obtieneValorIndex( index:number, val?:string):string
  { 
    if(val) {return val.split("_",2)[index];}
    else {return "sin valor";}
  }

  buscaValorInArray( argArr:string, val?:string):string
  { 
    if(val) {var arr= argArr.split("_"); return arr.filter(x=>x ==val  )[0];   }
    else {return "sin valor";}
  }


  onstrOptions(val?:string):string[]{ let arr:string[]=[];
    if(val){return val.split("_"); } else return arr; }

  
    
  //captar valores de componente para enviar a formulario gral.
  onRespuesta( argresp:string, isInvalid:boolean):void
  {
    this.respuesta.id_pregunta=this.objReactivo.id_pregunta;
    this.respuesta.isRequired=this.objReactivo.isRequired;
    this.respuesta.tipoReactivo=this.objReactivo.tipoReactivo;
    this.respuesta.respuesta=argresp;
     
    this.respuesta.cum=this.cum;
    //valida como llenar la respuesta de los controles diversos
    this.fillRespuesta(argresp);
    //console.log ("respuestaaaaa:",this.respuesta);
    this.preguntaEvent.emit(this.respuesta);
  }


  fillRespuesta(argresp:string):void{
   
    switch(this.objReactivo.tipoReactivo)
    {
      case 6:
        if(this.questionForm.get('selectQuestion')?.value=='Otro' && this.questionForm.get('txtselectQuestion')?.value.length >0  )
          {
            this.respuesta.respuesta =  this.questionForm.get('selectQuestion')?.value+'_'+argresp
          }else{this.respuesta.respuesta=argresp;}
      break;
      case 8:
        if(  this.arrChkList.filter(x=>x=='Otro')[0]=='Otro'  && this.questionForm.get('txtchkListQuestion')?.value.length >0  )
          {
            this.respuesta.respuesta = this.strChkList +':'+  argresp;
          }else{this.respuesta.respuesta=argresp;}
      break;
      case 11://si es un cum se busca si existe
      if(argresp.length>0)
      { //consultamos si existe el cum capturado
          this.dbSvc.ExisteCUM(argresp, this.localUser.tokenjwt).subscribe(resp=>{
          this.objReactivo.texto="El CUM: " +argresp+' '+ resp;
          if(resp==null)this.objReactivo.texto="El CUM: " +argresp+" no existe."; 
        });   
      }
      break;
      default:this.respuesta.respuesta=argresp;

    }
  
  }

  onCheckList(val:string)
  {
    //quita el item (si existe) y agrega el nuevo
    const i=this.arrChkList.filter(x => x == val )[0]; 
    this.arrChkList = this.arrChkList.filter(x => x !== val ); 
    if(i!=val){this.arrChkList.push(val);}
    
    this.strChkList='';
    this.arrChkList.forEach(element => { this.strChkList+= element+'_'; });
    this.strChkList= this.strChkList.substring(0,this.strChkList.length-1);
    this.onRespuesta(this.strChkList,false);
    
    //console.log("valor del arrelo local:",this.arrChkList);
    //console.log("valor del strchecklist local:", this.strChkList.length);
  }

  onExistChkOtro():boolean{
     const i=this.arrChkList.filter(x => x == 'Otro' )[0];
     if(i!=undefined ){return true;} return false; }
  
  onFocus(tipoReactivo:number, argresp:string)
  {
    console.log("tipo reactivo:", this.objReactivo.tipoReactivo, "arregloresp:", argresp);
      //si especifica otro, lo enfoca al cuadro de texto
      if(this.objReactivo.tipoReactivo==6 && argresp=="Otro")
       { //debido a que el elemento no existe previamente, se espera medio seg para enfocar 
        setTimeout(() => {this.txtselQuestRef.nativeElement.focus() ; }, 500);
       }

       if(this.objReactivo.tipoReactivo==8 && argresp.includes("Otro")   )
       { setTimeout(() => {this.txtchkListQuest.nativeElement.focus() ; }, 500);}
  }


  validarCel(event:any):void
  { const pattern = /[0-9]/;
    let inputChar = String.fromCharCode(event.charCode);
    if (event.keyCode != 8 && !pattern.test(inputChar)) {event.preventDefault();}
  }
  validarMail(event:any):void
  { const pattern = /^[a-z0-9._%+-]+@[a-z0-9.-]+\\.[a-z]{2,4}$/;
    let inputChar = String.fromCharCode(event.charCode);
    if ( !pattern.test(inputChar)) {event.preventDefault();}
  }
   

  onSubmit():void{}
  
  iniciaForm():FormGroup
  {
    return this.fb.group({txtQuestion:[''] ,
                          radioQuestion:[''] ,
                          selectQuestion:[''],
                          txtselectQuestion:[''],
                          checkQuestion:[''],
                          chkItemQuestion:[''],
                          txtchkListQuestion:[''],
                          txtMailQuestion:['',[Validators.email, 
                                              Validators.pattern("^[a-z0-9._%+-]+@[a-z0-9.-]+\\.[a-z]{2,4}$")]],
                          txtCelQuestion:['',[Validators.maxLength(10), 
                                              Validators.minLength(10), 
                                              Validators.pattern("[0-9]{0-10}")  ]],
                          txtQuestionCUM:['',[Validators.maxLength(10),
                                              Validators.minLength(10),] ]
                        });
  }

}
