import { APP_INITIALIZER, NgModule } from '@angular/core';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { restaurarSesion } from './services/restaurar-sesion';
import { ShareDataService } from './services/shared-data.service';
import { DbservicesService } from './services/dbservices.service';
import { SesionGuardadaService } from './services/sesion-guardada.service';
import { BrowserModule } from '@angular/platform-browser';
//se importaro el form modulo para trabajar two way binding
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import {HTTP_INTERCEPTORS, HttpClientModule} from '@angular/common/http';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { PageNotFoundComponent } from './components/page-not-found/page-not-found.component';
import { HomeComponent } from './components/home/home.component';
import { TestSurveyComponent } from './components/test-survey/test-survey.component';
import { SpinnerComponent } from './components/spinner/spinner.component';
import { QuestionComponent } from './components/question/question.component';
import { SpinnerInterceptor } from './components/spinner/spinner.interceptor';
import { NgPipesModule } from 'ngx-pipes';
import { SurveySalidaComponent } from './components/survey-salida/survey-salida.component';
import { LoginComponent } from './components/login/login.component';
import { NavbarComponent } from './components/navbar/navbar.component';
import { ModoCapturaComponent } from './components/captura/modo-captura.component';
import { BotonEscanerComponent } from './components/captura/boton-escaner.component';
import { ToastrModule } from 'ngx-toastr';
import{BrowserAnimationsModule} from '@angular/platform-browser/animations';
import { CatQuestionsComponent } from './components/cat-questions/cat-questions.component';
import { CatQuizzComponent } from './components/cat-quizz/cat-quizz.component' ;
import { FilterPipe } from './components/cat-quizz/filter.pipe';
import { JsonFilterByPipe } from './pipes/json-filter-by.pipe';
import {MatPaginatorModule} from '@angular/material/paginator';
import {MatButtonModule} from '@angular/material/button';
import {MatInputModule} from '@angular/material/input';
import {MatIconModule} from '@angular/material/icon';
import {MatMenuModule} from '@angular/material/menu';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import {MatToolbarModule} from '@angular/material/toolbar';
import {MatExpansionModule} from '@angular/material/expansion';

import {MatDatepickerModule} from '@angular/material/datepicker';
import {MatNativeDateModule} from '@angular/material/core';
import {MatFormFieldModule} from '@angular/material/form-field';
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

@NgModule({
  declarations: [
    AppComponent,
    PageNotFoundComponent,
    HomeComponent,
    TestSurveyComponent,
    SpinnerComponent,
    QuestionComponent,
    SurveySalidaComponent,
    LoginComponent,
    NavbarComponent,
    ModoCapturaComponent,
    BotonEscanerComponent,
    CatQuestionsComponent,
    CatQuizzComponent,
    FilterPipe,
    JsonFilterByPipe,
    Kit2023Component,
    RegistroEventoComponent,
    PulseraPerdidaComponent,
    ConsultaPulseraComponent,
    SnowComponent,
    KitComponent,
    EntradaSalidaComponent,
    SaludComponent,
    ProtectmemComponent,
    ReportePMComponent,
    MapaImagenComponent,
    KpisComponent,
    MenoresComponent,
    RegistroComidaComponent,
    ComidaHorarioComponent,
    ComidaEventoComponent,
    
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    FormsModule,ReactiveFormsModule,HttpClientModule, NgPipesModule,// agregados para funcionalidad de forms e interceptor
    BrowserAnimationsModule,
    ToastrModule.forRoot(),
    MatPaginatorModule,MatButtonModule,MatInputModule,MatIconModule, MatMenuModule,
    MatSelectModule, MatCheckboxModule,MatToolbarModule,MatExpansionModule,
    MatFormFieldModule,MatDatepickerModule, MatNativeDateModule
   
  ],
  providers: [
              {provide:HTTP_INTERCEPTORS, useClass:SpinnerInterceptor,multi:true},
              // recupera la sesión si el sistema cerró la app en segundo plano
              {provide:APP_INITIALIZER, useFactory:restaurarSesion, multi:true,
               deps:[ShareDataService, DbservicesService, SesionGuardadaService, Router, ToastrService]}
              ],//se agrega el proveedor html de interceptor
  bootstrap: [AppComponent]
})
export class AppModule { }
