import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ComidaEventoComponent } from './comida-evento.component';

describe('ComidaEventoComponent', () => {
  let component: ComidaEventoComponent;
  let fixture: ComponentFixture<ComidaEventoComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [ComidaEventoComponent]
    });
    fixture = TestBed.createComponent(ComidaEventoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
