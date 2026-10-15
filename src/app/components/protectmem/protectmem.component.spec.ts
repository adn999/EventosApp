import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProtectmemComponent } from './protectmem.component';

describe('ProtectmemComponent', () => {
  let component: ProtectmemComponent;
  let fixture: ComponentFixture<ProtectmemComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [ProtectmemComponent]
    });
    fixture = TestBed.createComponent(ProtectmemComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
