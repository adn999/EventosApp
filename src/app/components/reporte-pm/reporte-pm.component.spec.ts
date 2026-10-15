import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ReportePMComponent } from './reporte-pm.component';

describe('ReportePMComponent', () => {
  let component: ReportePMComponent;
  let fixture: ComponentFixture<ReportePMComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [ReportePMComponent]
    });
    fixture = TestBed.createComponent(ReportePMComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
