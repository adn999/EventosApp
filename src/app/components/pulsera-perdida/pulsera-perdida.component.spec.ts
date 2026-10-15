import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PulseraPerdidaComponent } from './pulsera-perdida.component';

describe('PulseraPerdidaComponent', () => {
  let component: PulseraPerdidaComponent;
  let fixture: ComponentFixture<PulseraPerdidaComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [PulseraPerdidaComponent]
    });
    fixture = TestBed.createComponent(PulseraPerdidaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
