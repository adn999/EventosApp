import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AppComponent } from './app.component';
import { HomeComponent } from './components/home/home.component';
import { TestSurveyComponent } from './components/test-survey/test-survey.component';
import { SurveySalidaComponent } from './components/survey-salida/survey-salida.component';
import { PageNotFoundComponent } from './components/page-not-found/page-not-found.component';
import { CatQuestionsComponent } from './components/cat-questions/cat-questions.component';
import { CatQuizzComponent } from './components/cat-quizz/cat-quizz.component';
import { authGuard } from './guards/auth.guard';
import { Kit2023Component } from './components/kit2023/kit2023.component';
import { RegistroEventoComponent } from './components/registro-evento/registro-evento.component';
import { PulseraPerdidaComponent } from './components/pulsera-perdida/pulsera-perdida.component';
import { ConsultaPulseraComponent } from './components/consulta-pulsera/consulta-pulsera.component';
import { SnowComponent } from './components/snow/snow.component';
import { KitComponent } from './components/kit/kit.component';
import { EntradaSalidaComponent } from './components/entrada-salida/entrada-salida.component';
import { SaludComponent } from './components/salud/salud.component';
import { ProtectmemComponent } from './components/protectmem/protectmem.component';
import { ReportePMComponent } from './components/reporte-pm/reporte-pm.component';
import { MapaImagenComponent } from './components/mapa-imagen/mapa-imagen.component';
import { KpisComponent } from './components/kpis/kpis.component';
import { MenoresComponent } from './components/menores/menores.component';
import { RegistroComidaComponent } from './components/registro-comida/registro-comida.component';
import { ComidaHorarioComponent } from './components/comida-horario/comida-horario.component';
import { ComidaEventoComponent } from './components/comida-evento/comida-evento.component';

const rutas: Routes = 
[
  {path:'', redirectTo:'/home', pathMatch:'full'},//utilizada como ruta default  /home  /Mapa
  {path:'testsurvey/:id', component:TestSurveyComponent }, //para indiar que recibirá un parámetro por default
  {path:'testsurvey', component:TestSurveyComponent },
  {path:'EncuestaSalida/:id', component:SurveySalidaComponent },
  {path:'Kit2023', component:Kit2023Component   },
  

  {path:'catQuestions', component:CatQuestionsComponent, canActivate:[authGuard]    },
  {path:'catQuizzes', component:CatQuizzComponent, canActivate:[authGuard] },
  
  {path:'ComidaHorario', component:ComidaHorarioComponent, canActivate:[authGuard] },
  {path:'ComidaEvento', component:ComidaEventoComponent, canActivate:[authGuard] },

  {path:'RegistroEvento', component:RegistroEventoComponent, canActivate:[authGuard]   },
  {path:'PulseraPerdida', component:PulseraPerdidaComponent, canActivate:[authGuard]   },
  {path:'ConsultaPulsera', component:ConsultaPulseraComponent, canActivate:[authGuard]   },
  {path:'Kit', component:KitComponent, canActivate:[authGuard]  },
  {path:'RegistroComida', component:RegistroComidaComponent, canActivate:[authGuard]},

  {path:'EntradaSalida', component:EntradaSalidaComponent, canActivate:[authGuard]  },
  {path:'Salud', component:SaludComponent   },
  {path:'ProtectMem', component:ProtectmemComponent, canActivate:[authGuard]  },
  {path:'ReportePM', component:ReportePMComponent, canActivate:[authGuard]  },
 // {path:'Mapa', component:MapaImagenComponent, canActivate:[authGuard]  },

  {path:'Mapa', component:MapaImagenComponent },
  {path:'Kpis', component:KpisComponent, canActivate:[authGuard]  },
  {path:'Menores', component:MenoresComponent, canActivate:[authGuard]  },

  {path:'Snow', component:SnowComponent },
  {path:'home', component:HomeComponent },
  {path:'**', component:PageNotFoundComponent }//este ruteo va al final siempre porque abarca todo por default

];

@NgModule({
  imports: [RouterModule.forRoot(rutas)],
  exports: [RouterModule]
})

export class AppRoutingModule { }
