import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SurveySalidaComponent } from './survey-salida.component';

describe('SurveySalidaComponent', () => {
  let component: SurveySalidaComponent;
  let fixture: ComponentFixture<SurveySalidaComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [SurveySalidaComponent]
    });
    fixture = TestBed.createComponent(SurveySalidaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
