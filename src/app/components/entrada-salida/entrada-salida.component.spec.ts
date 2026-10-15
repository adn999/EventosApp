import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EntradaSalidaComponent } from './entrada-salida.component';

describe('EntradaSalidaComponent', () => {
  let component: EntradaSalidaComponent;
  let fixture: ComponentFixture<EntradaSalidaComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [EntradaSalidaComponent]
    });
    fixture = TestBed.createComponent(EntradaSalidaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
