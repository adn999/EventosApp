import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ConsultaPulseraComponent } from './consulta-pulsera.component';

describe('ConsultaPulseraComponent', () => {
  let component: ConsultaPulseraComponent;
  let fixture: ComponentFixture<ConsultaPulseraComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [ConsultaPulseraComponent]
    });
    fixture = TestBed.createComponent(ConsultaPulseraComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
