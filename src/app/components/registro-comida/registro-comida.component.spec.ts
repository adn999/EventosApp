import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RegistroComidaComponent } from './registro-comida.component';

describe('RegistroComidaComponent', () => {
  let component: RegistroComidaComponent;
  let fixture: ComponentFixture<RegistroComidaComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [RegistroComidaComponent]
    });
    fixture = TestBed.createComponent(RegistroComidaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
