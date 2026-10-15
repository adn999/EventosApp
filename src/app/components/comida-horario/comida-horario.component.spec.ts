import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ComidaHorarioComponent } from './comida-horario.component';

describe('ComidaHorarioComponent', () => {
  let component: ComidaHorarioComponent;
  let fixture: ComponentFixture<ComidaHorarioComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [ComidaHorarioComponent]
    });
    fixture = TestBed.createComponent(ComidaHorarioComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
